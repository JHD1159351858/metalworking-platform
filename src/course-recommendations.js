import { cncAssessmentQuestions, cncChapters, cncPracticeQuestions, unitLabel } from './cnc-course.js';
import { lessons } from './learning-data.js';
import { getStudyPlan } from './study-plan.js';
import { reviewFields } from './practical-work.js';

const questionChapters = new Map([
  ['q1', '8.2'], ['q2', '8.5'], ['q3', '8.4'], ['q4', '8.3'], ['q5', '8.2'],
  ...[...cncPracticeQuestions, ...cncAssessmentQuestions].map(q => [q.id, q.chapterId]),
]);
const chronological = (a, b) => String(a.at || '').localeCompare(String(b.at || ''));
const caseKey = item => item.caseId || 'case-' + item.chapterId;

export function chapterActivity(chapterId, caseId) {
  return { view: 'tutor', target: { chapterId, activity: 'case', ...(caseId ? { caseId } : {}) } };
}

export function theoryProgress(record, courseLessons = lessons, chapters = cncChapters) {
  const videos = courseLessons.map(lesson => record.videos?.[lesson.id] || {});
  return {
    videosCompleted: videos.filter(item => item.completed).length,
    watchedSeconds: Math.round(videos.reduce((total, item) => total + (item.watchedSeconds || 0), 0)),
    chaptersRead: chapters.filter(ch => record.completedChapters?.[ch.id]).length,
  };
}

export function learningSnapshot(record) {
  const progress = theoryProgress(record);
  const drills = record.practice || [];
  const cases = record.casePractice || [];
  const attempts = record.attempts || [];
  const submission = record.submissions?.at(-1);
  const assessment = record.preAssessment;
  return [
    { label: '课前问卷', value: assessment ? '已填写' : '待填写', detail: assessment?.focus ? '想加强' + assessment.focus : '' },
    { label: '教学视频', value: progress.videosCompleted + ' / ' + lessons.length, detail: '已看完' },
    { label: '课程章节', value: progress.chaptersRead + ' / ' + cncChapters.length, detail: '已读单元' },
    { label: '案例与刷题', value: cases.length + drills.length + ' 次', detail: '案例作答 ' + cases.length + ' 次 · 刷题 ' + drills.length + ' 轮' },
    { label: '综合测评', value: attempts.some(item => item.passed) ? '已达标' : attempts.length ? '待巩固' : '待测评', detail: attempts.length ? '最近一次 ' + attempts.at(-1).score + ' 分' : '' },
    { label: '实操与评阅', value: submission?.status || '未提交', detail: submission?.review?.field ? reviewFields[submission.review.field] : '' },
  ];
}

function quizEvidence(record) {
  const byQuestion = new Map();
  for (const entry of [...(record.practice || []), ...(record.attempts || [])].sort(chronological)) {
    for (const detail of entry.details || []) {
      const chapterId = questionChapters.get(detail.id) || detail.chapterId || entry.chapterId;
      if (!chapterId || typeof detail.correct !== 'boolean') continue;
      const previous = byQuestion.get(detail.id);
      byQuestion.set(detail.id, {
        chapterId, ...detail, entry, streak: detail.correct ? 0 : (previous?.streak || 0) + 1,
      });
    }
  }
  return [...byQuestion.values()].filter(item => !item.correct);
}

function resultLabel(entry) {
  if (entry.details?.length) return entry.details.filter(q => q.correct).length + '/' + entry.details.length;
  return entry.score + ' 分';
}

function unitRecommendations(record, plan) {
  const misses = quizEvidence(record);
  const cases = record.casePractice || [];
  const drills = record.practice || [];
  return cncChapters.flatMap(ch => {
    const rounds = drills.filter(item => item.chapterId === ch.id);
    const chapterCases = cases.filter(item => item.chapterId === ch.id);
    const byCase = new Map();
    for (const item of chapterCases) byCase.set(caseKey(item), item);
    const unsettled = [...byCase.values()].filter(item => !item.correct || item.assisted || (caseKey(item) === 'case-8.1' && !item.transfer));
    const currentCase = unsettled.sort(chronological).at(-1);
    const chapterMisses = misses.filter(item => item.chapterId === ch.id)
      .sort((a,b) => Number(b.category === '安全知识') - Number(a.category === '安全知识') || b.streak - a.streak || chronological(b.entry, a.entry));
    const miss = chapterMisses[0];
    const lastRound = rounds.at(-1);
    const legacyMiss = lastRound && !lastRound.details?.length && lastRound.correct === false;
    if (!currentCase && !miss && !legacyMiss) return [];

    const facts = [];
    if (currentCase) {
      const sameCase = chapterCases.filter(item => caseKey(item) === caseKey(currentCase));
      const why = currentCase.cause === 'origin' ? '没有找对零点' : currentCase.cause === 'direction' ? '读反了正方向' : '判断有误';
      if (!currentCase.correct) {
        const previous = sameCase.at(-2);
        const repeated = previous && !previous.correct && previous.cause === currentCase.cause;
        facts.push('案例「' + currentCase.topic + '」' + (repeated ? '连续两次' : '上次') + why + '。');
      } else {
        facts.push(currentCase.assisted ? '上次完成「' + currentCase.topic + '」时使用了提示。' : '已独立完成第一张图，可以换图复测。');
      }
    }
    if (miss) {
      const source = miss.entry.mode === 'mistake-review' ? '错题巩固' : miss.entry.chapterId ? '章节练习' : '综合测评';
      facts.push(source + '中的「' + miss.topic + '」' + (miss.streak > 1 ? '已连续答错 ' + miss.streak + ' 次' : '最近一次答错') + '。');
    }
    const scores = rounds.filter(item => Number.isFinite(item.score) || item.details?.length).slice(-2);
    if (scores.length) facts.push('本单元最近' + (scores.length === 2 ? '两轮' : '一轮') + '刷题成绩为 ' + scores.map(resultLabel).join(' → ') + '。');
    else if (legacyMiss) facts.push('上次章节练习还有错题。');
    if (plan?.target?.chapterId === ch.id) facts.push(plan.reason);
    if (record.completedChapters?.[ch.id]) facts.push('本单元已标记为已读，可以带着错题回看。');
    const last = [currentCase, miss?.entry, legacyMiss ? lastRound : null].filter(Boolean).sort(chronological).at(-1);
    const safety = chapterMisses.some(item => item.category === '安全知识');
    const caseOnly = currentCase && !miss && !legacyMiss;
    const route = caseOnly ? chapterActivity(ch.id, currentCase.caseId) : { view: 'tutor', target: { chapterId: ch.id } };
    const followUp = caseOnly ? null : currentCase ? { ...chapterActivity(ch.id, currentCase.caseId), action: '再做对应案例' }
      : { view: 'theory', target: { chapterId: ch.id }, action: '练习本单元' };
    return [{
      key: 'drill-' + last.id, label: safety ? '安全知识优先' : '知识点巩固',
      title: (caseOnly ? '再练' : '复习') + unitLabel(ch.id) + ' · ' + (caseOnly ? currentCase.topic : miss?.topic || ch.title),
      reason: facts.join(''), action: caseOnly ? '打开案例' : '查看单元图解', ...route, followUp,
      safety, sources: Number(Boolean(currentCase)) + Number(Boolean(miss || legacyMiss)),
      repetitions: Math.max(miss?.streak || 0, unsettled.length), at: last.at,
    }];
  }).sort((a,b) => Number(b.safety) - Number(a.safety) || b.sources - a.sources || b.repetitions - a.repetitions || chronological(b,a));
}

export function courseSuggestions(record) {
  const recent = record.submissions?.at(-1);
  const attempts = record.attempts || [];
  const caseWork = record.casePractice || [];
  const drills = record.practice || [];
  const candidates = [];
  const seen = new Set();
  function suggest(item) {
    const destination = JSON.stringify([item.view, item.target || null]);
    if (seen.has(destination) || record.skippedSuggestions?.includes(item.key)) return;
    candidates.push(item);
    seen.add(destination);
  }
  if (recent?.status === '需补交材料') {
    suggest({ key: 'review-' + recent.id, label: '教师评语', title: '补交' + (reviewFields[recent.review?.field] || '本次实操材料'),
      reason: recent.review?.comment || '教师要求补充本次实操材料。', action: '打开补交项',
      view: 'practical', target: { field: recent.review?.field || 'measurements' } });
  }
  const plan = getStudyPlan(record.preAssessment);
  const needs = unitRecommendations(record, plan);
  needs.filter(item => item.safety).forEach(suggest);
  const choice = record.studyPreference;
  const latestWork = [...caseWork, ...drills].filter(item => item.chapterId === choice?.chapterId).sort(chronological).at(-1);
  if (choice && cncChapters.some(ch => ch.id === choice.chapterId) && !(latestWork?.at > choice.at)) {
    suggest({ key: 'choice-' + choice.at, label: '自选方向', title: '练习' + unitLabel(choice.chapterId),
      reason: choice.note || '你选择了这个单元作为下一次练习。', action: '进入自选案例', ...chapterActivity(choice.chapterId) });
  }
  needs.filter(item => !item.safety).forEach(suggest);
  if (!recent && attempts.some(item => item.passed)) {
    suggest({ key: 'start-practical', label: '实操准备', title: '查看实操任务要求',
      reason: '你已通过综合测评，可以查看任务图与材料清单。现场上机须由教师确认。', action: '查看任务', view: 'practical' });
  }
  const resume = lessons.filter(lesson => {
    const video = record.videos?.[lesson.id];
    return !video?.completed && video?.watchedSeconds > 0;
  }).sort((a,b) => String(record.videos[b.id].updatedAt || '').localeCompare(String(record.videos[a.id].updatedAt || '')))[0];
  if (resume) {
    const video = record.videos[resume.id];
    const seconds = Math.floor(video.position || 0);
    suggest({ key: 'resume-' + resume.id, label: '继续学习', title: '继续观看「' + resume.title + '」',
      reason: '这节视频已开始学习。' + (seconds ? '上次停在 ' + Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') + '。' : ''),
      action: '继续观看', view: 'video', target: { lessonId: resume.id } });
  }
  const tested = [...caseWork, ...drills];
  const planDone = plan?.view === 'video' && record.videos?.[plan.target?.lessonId]?.completed
    || (plan?.target?.chapterId && tested.some(item => item.chapterId === plan.target.chapterId && item.correct && !item.assisted))
    || plan?.view === 'theory' && attempts.length > 0;
  if (plan && !planDone) {
    suggest({ key: 'pre-' + plan.targetId, label: '课前测评', title: plan.title, reason: plan.reason,
      action: '开始学习', view: plan.view, target: plan.target || null });
  }
  const read = cncChapters.find(ch => record.completedChapters?.[ch.id] && !tested.some(item => item.chapterId === ch.id));
  if (read) {
    suggest({ key: 'apply-' + read.id, label: '读后应用', title: unitLabel(read.id) + ' · 从阅读转到练习',
      reason: '你已读完「' + read.title + '」，还没有这个单元的案例或刷题记录。', action: '试做本单元案例', ...chapterActivity(read.id) });
  }
  if (!record.preAssessment && !tested.length && !attempts.length && !read && !resume &&
      !lessons.some(lesson => record.videos?.[lesson.id]?.completed) && !recent) {
    suggest({ key: 'start-assessment', label: '学习起点', title: '先做课前测评',
      reason: '填写你的学习经历与想加强的内容，用来选择第一项学习任务。', action: '填写课前测评', view: 'pre' });
  }
  const next = cncChapters.find(ch => !record.completedChapters?.[ch.id] && !tested.some(item => item.chapterId === ch.id));
  if (next && !needs.length) {
    suggest({ key: 'explore-' + next.id, label: '自由探索', title: unitLabel(next.id) + ' · ' + next.title,
      reason: '这个单元还没有阅读或章节练习记录，可以先从基础图解开始。', action: '打开单元', view: 'tutor', target: { chapterId: next.id } });
  }
  return candidates.slice(0,3);
}

export function coordinateClassSummary(students) {
  const counts = { participated: 0, missedOrigin: 0, stillMissed: 0, independent: 0 };
  for (const { record } of students) {
    const trials = (record.casePractice || []).filter(entry => caseKey(entry) === 'case-8.1');
    if (!trials.length) continue;
    counts.participated++;
    if (trials[0].cause === 'origin') counts.missedOrigin++;
    const lastTransfer = trials.filter(item => item.transfer && !item.assisted).at(-1);
    if (lastTransfer?.correct) counts.independent++;
    else if (lastTransfer) counts.stillMissed++;
  }
  return counts;
}
