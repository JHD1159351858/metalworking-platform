import { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from '@phosphor-icons/react';
import { Heading } from './LearningUI.jsx';
import { getStudyPlan } from './study-plan.js';
import { ElectiveStudy, LearningSnapshot } from './ElectiveStudy.jsx';
import { cncChapters, unitLabel, feedbackLabel } from './cnc-course.js';
import { literacyQuestions } from './literacy-questions.js';
import { weldingFocus, weldingQuestions } from './welding-assessment.js';
import { weldingLessons } from './welding-course.js';
import './course-evidence.css';

const surveyFields = [
  { id: 'experience', label: '你的数控车学习经历', options: ['第一次学习', '看过相关资料或演示', '参加过相关实训'] },
  { id: 'confidence', label: '你对上机前的准备有多大把握？', options: ['需要从基础开始', '了解一些，想再巩固', '基本清楚'] },
  { id: 'focus', label: '你最想加强哪部分？', options: ['设备认知', '实训安全', '图纸与工艺', '程序理解', '题库练习'] },
];

const feedbackTypes = ['学习心得', '给老师的建议', '课程建议'];
const formatDate = value => new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
const weldingSurvey = [
  { ...surveyFields[0], label: '你的焊接学习经历' },
  { ...surveyFields[1], label: '你对焊接实训前的准备有多大把握？' },
  { ...surveyFields[2], options: weldingFocus },
];
const literacyGaps = (answers, questions) => questions.filter(q => answers?.[q.id] != null && String(answers[q.id]) !== String(q.answer)).map(q => q.topic);

export function PreAssessmentView({ record, trade, update, onNavigate, evidence, onSubmitted }) {
  const welding = trade?.id === 'welding';
  const questions = welding ? weldingQuestions : literacyQuestions;
  const previous = record.preAssessment;
  const initial = previous || record.preAssessmentDraft || {};
  const [answers, setAnswers] = useState(initial.answers || {});
  const [survey, setSurvey] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [draftError, setDraftError] = useState(false);
  const plan = getStudyPlan(previous);

  function saveDraft(nextAnswers, nextSurvey) {
    setAnswers(nextAnswers);
    setSurvey(nextSurvey);
    try {
      update(current => current.preAssessment && !evidence ? current : {
        ...current,
        preAssessmentDraft: { ...nextSurvey, answers: nextAnswers },
      });
      setDraftError(false);
    } catch {
      setDraftError(true);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (saving || previous) return;
    const correct = questions.filter(q => answers[q.id] === String(q.answer)).length;
    const score = Math.round(100 * correct / questions.length);
    const { experience, confidence, focus, note = '' } = survey;
    const entry = { tradeId: trade?.id, experience, confidence, focus, note: note.trim(), answers, score, at: new Date().toISOString() };
    setSaving(true);
    setError(false);
    try {
      if (evidence) {
        await evidence.savePreAssessment(entry);
        try { update(current => ({ ...current, preAssessmentDraft: null })); }
        catch { /* The confirmed cloud record remains the completion state. */ }
      } else update(current => current.preAssessment ? current : { ...current, preAssessment: entry, preAssessmentDraft: null });
      onSubmitted?.();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return <>
    <Heading title="课前测评">先做素养测评，再填写课前调查，帮助老师了解你的学习起点。</Heading>
    {previous ? <div className="panel stack">
      <div className="evidence-heading"><h2>课前测评已保存</h2><span className="pill success">{formatDate(previous.at)}</span></div>
      <EvidenceSummary entry={previous} tradeId={trade?.id} />
      <ul className="assessment-skills" aria-label="入课程前的知识起点">{questions.map(q => {
        const answer = previous.answers?.[q.id];
        return <li key={q.id}><strong>{q.topic}</strong>　{answer == null ? '未记录' : String(answer) === String(q.answer) ? '本次判断正确' : '建议结合章节再练一次'}</li>;
      })}</ul>
      {plan && <div className="info-banner"><strong>你的学习起点 · {plan.title}</strong><p>{plan.reason}</p></div>}
      <div className="row">
        <button className="button" onClick={() => onNavigate(plan?.view || 'video', plan?.target)}>按安排开始学习 <ArrowRight size={18} /></button>
      </div>
    </div> : <form className="stack" onSubmit={submit}>
      {(draftError || Object.keys(answers).length > 0 || survey.focus || survey.experience || survey.confidence || survey.note) && <p className="muted" role="status">{draftError ? '草稿保存失败，关闭前请重试。' : '草稿已保存，可稍后继续。'}</p>}
      <div className="evidence-grid">
        <section className="panel">
          <div className="evidence-heading"><h2>{welding ? '焊接安全测评' : '素养测评'}</h2><span className="pill">{questions.length} 道题</span></div>
          <p className="muted">根据你目前的理解作答，提交后查看得分和可补学的知识点。</p>
          {questions.map((question, index) => <fieldset key={question.id} className="literacy-question">
            <legend>{index + 1}. {question.prompt}</legend>
            {question.options.map((option, choice) => <label key={option} className="answer-option">
              <input name={question.id} type="radio" required disabled={saving} checked={answers[question.id] === String(choice)}
                onChange={() => saveDraft({ ...answers, [question.id]: String(choice) }, survey)} />
              {option}
            </label>)}
          </fieldset>)}
        </section>
        <section className="panel">
          <div className="evidence-heading"><h2>调查问卷</h2><span className="pill">学情反馈</span></div>
          <p className="muted">告诉老师你的基础和最希望获得的帮助。</p>
          {(welding ? weldingSurvey : surveyFields).map(field => <label key={field.id} className="field">
            {field.label}
            <select className="input" required disabled={saving} value={survey[field.id] || ''}
              onChange={event => saveDraft(answers, { ...survey, [field.id]: event.target.value })}>
              <option value="" disabled>请选择</option>
              {field.options.map(option => <option key={option}>{option}</option>)}
            </select>
          </label>)}
          <label className="field">还有什么想让老师了解？（选填）
            <textarea className="textarea" rows={4} maxLength={500} disabled={saving} value={survey.note || ''}
              onChange={event => saveDraft(answers, { ...survey, note: event.target.value })}
              placeholder={welding ? '例如：我想知道怎样辨认焊缝上的气孔。' : '例如：我看过加工演示，但还不熟悉图纸上的标注。'} />
          </label>
        </section>
      </div>
      {error && <p className="result-banner warning" role="alert">未能确认问卷已保存。你的填写内容还在，可以重试。</p>}
      <div><button className="button" type="submit" disabled={saving}>{saving ? '正在保存…' : '保存测评和问卷'} <ArrowRight size={18} /></button></div>
    </form>}
  </>;
}

export function PreAssessmentDialog({ profile, trade, onDismiss, ...props }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  return <dialog ref={dialog} className="assessment-dialog view-panel" aria-label="首次课前测评"
    onCancel={event => { event.preventDefault(); onDismiss(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onDismiss();
    }}>
    <button className="modal-close icon-button" aria-label="关闭课前测评" onClick={onDismiss}><X /></button>
    <span className="pill">{profile.name} · {trade.name} · 首次学习</span>
    <PreAssessmentView trade={trade} {...props} />
  </dialog>;
}

function EvidenceSummary({ entry, tradeId = entry.tradeId }) {
  const questions = tradeId === 'welding' ? weldingQuestions : literacyQuestions;
  const gaps = literacyGaps(entry.answers, questions);
  return <>
    <p><strong>素养测评 {entry.score} 分</strong> · {gaps.length ? `可补学：${gaps.join('、')}` : questions.every(q => entry.answers?.[q.id] != null) ? '本次测评全部答对' : '部分历史作答未记录'}</p>
    <dl className="evidence-summary">
      <div><dt>学习经历</dt><dd>{entry.experience}</dd></div>
      <div><dt>准备情况</dt><dd>{entry.confidence}</dd></div>
      <div><dt>希望加强</dt><dd>{entry.focus}</dd></div>
    </dl>
    {entry.note && <p className="evidence-text">{entry.note}</p>}
  </>;
}

export function CourseFeedbackView({ record, update, onNavigate, evidence }) {
  return <>
    <Heading title="智能选学及课程反馈" />
    <LearningSnapshot record={record} />
    <CourseFeedbackForm record={record} update={update} evidence={evidence}>
      <ElectiveStudy record={record} update={update} onNavigate={onNavigate} />
    </CourseFeedbackForm>
  </>;
}

export function CourseFeedbackForm({ record, update, evidence, topics, prompt, children }) {
  const [type, setType] = useState(feedbackTypes[0]);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef(null);
  const [chapterId, setChapterId] = useState('');
  const selectedTopic = topics?.find(item => item.id === chapterId);
  const prefix = chapterId ? selectedTopic ? '【' + selectedTopic.title + '】' : '【第 ' + chapterId + ' 节】' : '';
  const prompts = { '学习心得': prompt || '例如：换了图纸上的零点后，我重新判断了方向……', '给老师的建议': '例如：我希望老师再演示一次……', '课程建议': '例如：你希望补充哪些课程资料或演示？' };

  async function submit(event) {
    event.preventDefault();
    if (!text.trim() || saving) return;
    const body = prefix + text.trim();
    const entry = pending.current?.type === type && pending.current.text === body
      ? pending.current : { id: crypto.randomUUID(), at: new Date().toISOString(), type, text: body };
    pending.current = entry;
    setSaving(true);
    setError(false);
    try {
      if (evidence) await evidence.saveFeedback(entry);
      else update(current => ({ ...current, feedback: [...current.feedback, entry] }));
      pending.current = null;
      setText('');
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return <>
    <div className={children ? 'evidence-grid elective-feedback' : undefined}>
      {children}
      <form className="panel stack" onSubmit={submit}>
        <div className="evidence-heading"><h2>课程反馈</h2></div>
        <label className="field">反馈类型<select className="input" value={type} disabled={saving} onChange={event => { setType(event.target.value); setSaved(false); }}>
          {feedbackTypes.map(option => <option key={option}>{option}</option>)}
        </select></label>
        <label className="field">这条反馈关于<select className="input" value={chapterId} disabled={saving} onChange={event => { setChapterId(event.target.value); setSaved(false); }}>
          <option value="">整门课程</option>
          {(topics || cncChapters).map(ch => <option key={ch.id} value={ch.id}>{topics ? ch.title : unitLabel(ch.id) + ' · ' + ch.title}</option>)}
        </select></label>
        <label className="field">反馈内容<textarea className="textarea" rows={5} required maxLength={1000 - prefix.length} disabled={saving} value={text}
          onChange={event => { setText(event.target.value); setSaved(false); }}
          placeholder={prompts[type]} /></label>
        {text.length + prefix.length > 1000 && <p role="alert">加上所选章节后超过 1000 字，请缩短反馈内容。</p>}
        {error && <p className="result-banner warning" role="alert">未能确认反馈已保存。可以重试，填写内容还在。</p>}
        <div><button className="button" type="submit" disabled={saving || !text.trim() || (prefix + text.trim()).length > 1000}>{saving ? '正在保存…' : '保存反馈'}</button></div>
        {saved && <span role="status" className="pill success">反馈已保存</span>}
      </form>
    </div>
    {record.feedback.length > 0 && <section className="panel evidence-history"><h2>我的反馈</h2><FeedbackList entries={record.feedback} /></section>}
  </>;
}

function FeedbackList({ entries }) {
  return [...entries].reverse().map(entry => <article className="record-row" key={entry.id}>
    <div><strong>{entry.type}</strong><p className="evidence-text">{feedbackLabel(entry.text)}</p></div>
    <time dateTime={entry.at} className="muted">{formatDate(entry.at)}</time>
  </article>);
}

export function TeacherCourseEvidence({ record, trade }) {
  const preferredId = record.studyPreference?.chapterId;
  const preferredTitle = trade?.id === 'welding'
    ? weldingLessons.find(lesson => lesson.id === preferredId)?.title
    : unitLabel(preferredId);
  return <div className="evidence-grid evidence-history">
    <section className="panel stack">
      <div className="evidence-heading"><h3>课前学情</h3>{record.preAssessment && <time className="muted" dateTime={record.preAssessment.at}>{formatDate(record.preAssessment.at)}</time>}</div>
      {record.preAssessment ? <EvidenceSummary entry={record.preAssessment} tradeId={trade?.id} /> : <p className="muted">当前学生还没有提交素养测评和课前问卷。</p>}
    </section>
    <section className="panel">
      <div className="evidence-heading"><h3>学生课程反馈</h3><span className="pill">{record.feedback.length} 条</span></div>
      {record.feedback.length ? <FeedbackList entries={record.feedback} /> : <p className="muted">当前学生还没有保存课程反馈。</p>}
    </section>
    {!!record.casePractice?.length && <section className="panel stack">
      <h3>案例练习过程</h3>
      {[...record.casePractice].reverse().map(entry => <div key={entry.id} className="record-row"><div>
        <strong>{unitLabel(entry.chapterId)} · {entry.topic}</strong>
        <p>{entry.correct ? (entry.assisted ? '有提示完成' : entry.transfer ? '换题独立答对' : '独立答对') : '还需练习'}
          {entry.cause === 'origin' ? ' · 零点判断' : entry.cause === 'direction' ? ' · 方向判断' : ''}</p>
      </div><time className="muted" dateTime={entry.at}>{formatDate(entry.at)}</time></div>)}
    </section>}
    {record.studyPreference && <section className="panel"><h3>学生自己选择的方向</h3><p>{preferredTitle || '历史选学内容'}</p>{record.studyPreference.note && <p className="evidence-text">{record.studyPreference.note}</p>}</section>}
  </div>;
}
