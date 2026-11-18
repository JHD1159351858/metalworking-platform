import { useEffect, useState } from 'react';
import { getSupabase, hasCloud } from './lib/supabase.js';

export const cloudRequested = hasCloud;
export const profileFields = 'user_id,display_name,student_number,class_name,role';
const assessmentFields = 'user_id,experience,confidence,focus,note,answers,updated_at';
const feedbackFields = 'id,user_id,type,text,created_at';

const literacyExpected = { safety: '0', drawing: '1', program: '2' };
function scoreOf(answers) {
  const keys = Object.keys(literacyExpected);
  const correct = keys.filter(key => answers?.[key] === literacyExpected[key]).length;
  return Math.round((correct / keys.length) * 100);
}

const mapAssessment = row => row ? ({
  experience: row.experience, confidence: row.confidence, focus: row.focus, note: row.note,
  answers: row.answers, score: scoreOf(row.answers), at: row.updated_at,
}) : null;
const mapFeedback = row => ({ id: row.id, type: row.type, text: row.text, at: row.created_at });

function unwrap({ data, error }, message) {
  if (error) throw new Error(message, { cause: error });
  return data;
}

async function listAll(queryForRange, message) {
  const pageSize = 200;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = unwrap(await queryForRange().range(offset, offset + pageSize - 1), message);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

async function readStudentEvidence(accountId, tradeId) {
  const errorMessage = '无法读取云端课程记录。请检查网络或联系管理员核对数据库配置。';
  const [assessment, feedback] = await Promise.all([
    getSupabase().from('metalwork_pre_assessments').select(assessmentFields)
      .eq('user_id', accountId).eq('trade_id', tradeId).maybeSingle(),
    listAll(() => getSupabase().from('metalwork_course_feedback').select(feedbackFields)
      .eq('user_id', accountId).eq('trade_id', tradeId).order('created_at').order('id'), errorMessage),
  ]);
  return { preAssessment: mapAssessment(unwrap(assessment, errorMessage)), feedback: feedback.map(mapFeedback) };
}

export function useCloudEvidence(accountId, tradeId) {
  const scope = hasCloud && accountId && tradeId ? JSON.stringify([accountId, tradeId]) : null;
  const [state, setState] = useState({ scope: null, data: null, error: null });
  const [revision, setRevision] = useState(0);
  const current = state.scope === scope && state.revision === revision ? state : null;

  useEffect(() => {
    if (!scope) return;
    let active = true;
    readStudentEvidence(accountId, tradeId).then(
      data => { if (active) setState({ scope, revision, data, error: null }); },
      error => { if (active) setState({ scope, revision, data: null, error: error.message }); },
    );
    return () => { active = false; };
  }, [scope, revision, accountId, tradeId]);

  function updateData(change) {
    setState(previous => previous.scope === scope && previous.revision === revision && previous.data
      ? { ...previous, data: change(previous.data) }
      : previous);
  }

  async function savePreAssessment(entry) {
    if (!scope) throw new Error('请先登录学生账号。');
    const row = {
      user_id: accountId, trade_id: tradeId, experience: entry.experience,
      confidence: entry.confidence, focus: entry.focus, note: entry.note, answers: entry.answers,
    };
    const result = await getSupabase().from('metalwork_pre_assessments')
      .upsert(row, { onConflict: 'user_id,trade_id' }).select(assessmentFields).single();
    const saved = mapAssessment(unwrap(result, '课前测评未保存。请检查网络或联系教师后重试。'));
    updateData(data => ({ ...data, preAssessment: saved }));
    return saved;
  }

  async function saveFeedback(entry) {
    if (!scope) throw new Error('请先登录学生账号。');
    const message = '未能确认反馈已保存。请检查网络后重试。';
    const row = { id: entry.id, user_id: accountId, trade_id: tradeId, type: entry.type, text: entry.text };
    unwrap(await getSupabase().from('metalwork_course_feedback')
      .upsert(row, { onConflict: 'id', ignoreDuplicates: true }), message);
    const result = await getSupabase().from('metalwork_course_feedback').select(feedbackFields)
      .eq('id', entry.id).eq('user_id', accountId).eq('trade_id', tradeId).single();
    const saved = mapFeedback(unwrap(result, message));
    updateData(data => data.feedback.some(feedback => feedback.id === saved.id)
      ? data
      : { ...data, feedback: [...data.feedback, saved] });
    return saved;
  }

  return {
    data: current?.data || null,
    loading: Boolean(scope && !current),
    error: current?.error || null,
    retry: () => setRevision(value => value + 1),
    savePreAssessment,
    saveFeedback,
  };
}

export async function readClassEvidence(tradeId) {
  if (!hasCloud) throw new Error('云端存档尚未配置。');
  const message = '无法读取班级记录。请检查网络或联系管理员核对班级权限。';
  const [profiles, assessments, feedback] = await Promise.all([
    listAll(() => getSupabase().from('metalwork_profiles').select(profileFields)
      .eq('role', 'student').order('user_id'), message),
    listAll(() => getSupabase().from('metalwork_pre_assessments').select(assessmentFields)
      .eq('trade_id', tradeId).order('user_id'), message),
    listAll(() => getSupabase().from('metalwork_course_feedback').select(feedbackFields)
      .eq('trade_id', tradeId).order('created_at').order('id'), message),
  ]);

  const assessmentByStudent = new Map(assessments.map(row => [row.user_id, mapAssessment(row)]));
  const feedbackByStudent = new Map();
  for (const row of feedback) {
    if (!feedbackByStudent.has(row.user_id)) feedbackByStudent.set(row.user_id, []);
    feedbackByStudent.get(row.user_id).push(mapFeedback(row));
  }
  return profiles.map(row => ({
    profile: { id: row.user_id, name: row.display_name, studentNumber: row.student_number, className: row.class_name },
    record: { preAssessment: assessmentByStudent.get(row.user_id) || null, feedback: feedbackByStudent.get(row.user_id) || [] },
  }));
}
