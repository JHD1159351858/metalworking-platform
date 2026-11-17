import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpenText, ClipboardText, PlayCircle } from '@phosphor-icons/react';
import { Heading, DemoNote } from './LearningUI.jsx';
import { readClassEvidence } from './cloud-evidence.js';
import { getStudyPlan } from './study-plan.js';
import './course-evidence.css';

const literacyQuestions = [
  { id: 'safety', topic: '实训安全', prompt: '第一次到数控车实训区，应该先做什么？', options: ['听教师讲解现场要求', '按视频演示自行启动设备', '先操作，再补看规程'], answer: 0 },
  { id: 'drawing', topic: '图纸阅读', prompt: '图纸上的关键尺寸看不清时，你会怎么做？', options: ['参照外观估一个尺寸', '向教师确认后再继续', '先把这一项跳过'], answer: 1 },
  { id: 'program', topic: '程序认知', prompt: '阅读一段示例程序前，哪项信息最有帮助？', options: ['程序文件的大小', '程序里的注释数量', '程序对应的设备和加工任务'], answer: 2 },
];

const surveyFields = [
  { id: 'experience', label: '你的数控车学习经历', options: ['第一次学习', '看过相关资料或演示', '参加过相关实训'] },
  { id: 'confidence', label: '你对上机前的准备有多大把握？', options: ['需要从基础开始', '了解一些，想再巩固', '基本清楚'] },
  { id: 'focus', label: '你最想加强哪部分？', options: ['设备认知', '实训安全', '图纸与工艺', '程序理解', '题库练习'] },
];

const feedbackTypes = ['学习心得', '给老师的建议', '课程建议'];
const formatDate = value => new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
const literacyGaps = answers => literacyQuestions.filter(q => answers[q.id] !== String(q.answer)).map(q => q.topic);

export function PreAssessmentView({ record, update, onNavigate, evidence }) {
  const previous = record.preAssessment;
  const [answers, setAnswers] = useState(previous?.answers || {});
  const [survey, setSurvey] = useState(previous || {});
  const [editing, setEditing] = useState(!previous);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const plan = getStudyPlan(previous);

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    const score = Math.round((1 - literacyGaps(answers).length / literacyQuestions.length) * 100);
    const { experience, confidence, focus, note = '' } = survey;
    const entry = { experience, confidence, focus, note: note.trim(), answers, score, at: new Date().toISOString() };
    setSaving(true);
    setError(false);
    try {
      if (evidence) await evidence.savePreAssessment(entry);
      else update(current => ({ ...current, preAssessment: entry }));
      setEditing(false);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return <>
    <Heading kicker="01 / PREPARATION" title="课前测评">先做素养测评，再填写课前调查，帮助老师了解你的学习起点。</Heading>
    <DemoNote>{evidence ? '测评与问卷保存到当前账号，同班教师可查看。' : '本地演示 · 测评与问卷保存在当前浏览器。'}结果用于安排理论学习的起点，实操资格仍按理论测评规则判断。</DemoNote>
    {!editing && previous ? <div className="panel stack">
      <div className="evidence-heading"><h2>课前测评已保存</h2><span className="pill success">{formatDate(previous.at)}</span></div>
      <EvidenceSummary entry={previous} />
      {plan && <div className="info-banner"><strong>你的学习起点 · {plan.title}</strong><p>{plan.reason}</p></div>}
      <div className="row">
        <button className="button" onClick={() => onNavigate(plan?.view || 'video')}>按安排开始学习 <ArrowRight size={18} /></button>
        <button className="button secondary" onClick={() => setEditing(true)}>修改课前测评</button>
      </div>
    </div> : <form className="stack" onSubmit={submit}>
      <div className="evidence-grid">
        <section className="panel">
          <div className="evidence-heading"><h2>素养测评</h2><span className="pill">{literacyQuestions.length} 道示例题</span></div>
          <p className="muted">根据你目前的理解作答，提交后查看得分和可补学的知识点。</p>
          {literacyQuestions.map((question, index) => <fieldset key={question.id} className="literacy-question">
            <legend>{index + 1}. {question.prompt}</legend>
            {question.options.map((option, choice) => <label key={option} className="answer-option">
              <input name={question.id} type="radio" required disabled={saving} checked={answers[question.id] === String(choice)}
                onChange={() => setAnswers(current => ({ ...current, [question.id]: String(choice) }))} />
              {option}
            </label>)}
          </fieldset>)}
        </section>
        <section className="panel">
          <div className="evidence-heading"><h2>调查问卷</h2><span className="pill">学情反馈</span></div>
          <p className="muted">告诉老师你的基础和最希望获得的帮助。</p>
          {surveyFields.map(field => <label key={field.id} className="field">
            {field.label}
            <select className="input" required disabled={saving} value={survey[field.id] || ''}
              onChange={event => setSurvey(current => ({ ...current, [field.id]: event.target.value }))}>
              <option value="" disabled>请选择</option>
              {field.options.map(option => <option key={option}>{option}</option>)}
            </select>
          </label>)}
          <label className="field">还有什么想让老师了解？（选填）
            <textarea className="textarea" rows={4} maxLength={500} disabled={saving} value={survey.note || ''}
              onChange={event => setSurvey(current => ({ ...current, note: event.target.value }))}
              placeholder="例如：我看过加工演示，但还不熟悉图纸上的标注。" />
          </label>
        </section>
      </div>
      {error && <p className="result-banner warning" role="alert">未能确认问卷已保存。你的填写内容还在，可以重试。</p>}
      <div><button className="button" type="submit" disabled={saving}>{saving ? '正在保存…' : '保存测评和问卷'} <ArrowRight size={18} /></button></div>
    </form>}
  </>;
}

function EvidenceSummary({ entry }) {
  const gaps = literacyGaps(entry.answers);
  return <>
    <p><strong>素养测评 {entry.score} 分</strong> · {gaps.length ? `可补学：${gaps.join('、')}` : '本次示例题全部答对'}</p>
    <dl className="evidence-summary">
      <div><dt>学习经历</dt><dd>{entry.experience}</dd></div>
      <div><dt>准备情况</dt><dd>{entry.confidence}</dd></div>
      <div><dt>希望加强</dt><dd>{entry.focus}</dd></div>
    </dl>
    {entry.note && <p className="evidence-text">{entry.note}</p>}
  </>;
}

function chooseResources(record) {
  const entry = record.preAssessment;
  const plan = getStudyPlan(entry);
  const misses = record.attempts.at(-1)?.details?.filter(question => !question.correct).map(question => question.topic) || [];
  const gaps = entry ? literacyGaps(entry.answers) : [];
  const resources = [
    { view: 'video', title: '视频学习', icon: PlayCircle, detail: '按目录回看设备、操作规范和加工过程。' },
    { view: 'tutor', title: '课程章节', icon: BookOpenText, detail: gaps.length ? `课前测评可补学：${gaps.join('、')}。` : '按章节复习安全规范、图纸和程序。' },
    { view: 'theory', title: '题库练习', icon: ClipboardText, detail: misses.length ? `最近一次练习中可再巩固：${misses.join('、')}。` : '通过示例题检查对安全和工艺知识的理解。' },
  ];
  const assigned = resources.find(item => item.view === plan?.view);
  if (assigned && !(misses.length && plan.view === 'theory')) assigned.detail = plan.reason;
  const recommended = misses.length ? 'theory' : plan?.view || 'video';
  return [resources.find(item => item.view === recommended), ...resources.filter(item => item.view !== recommended)];
}

export function CourseFeedbackView({ record, update, onNavigate, evidence }) {
  const [type, setType] = useState(feedbackTypes[0]);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef(null);
  const resources = chooseResources(record);

  async function submit(event) {
    event.preventDefault();
    const body = text.trim();
    if (!body || saving) return;
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
    <Heading kicker="04 / REVIEW AND FEEDBACK" title="智能选学及课程反馈">按自己的学习情况选内容复习，也可以写下心得或建议。</Heading>
    <div className="evidence-grid">
      <section className="panel stack">
        <div className="evidence-heading"><h2>智能选学</h2><span className="pill">推荐学习</span></div>
        <p className="muted">根据课前问卷、素养测评和最近一次题库练习的错题推荐。还没有学习记录时，建议先看课程导入。</p>
        {resources.map(({ view, title, icon: Icon, detail }, index) => <button type="button" className="evidence-resource" key={view} onClick={() => onNavigate(view)}>
          <Icon size={23} weight="duotone" aria-hidden="true" />
          <span><strong>{title}</strong>{index === 0 && <span className="pill">优先建议</span>}<small>{detail}</small></span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>)}
      </section>
      <form className="panel stack" onSubmit={submit}>
        <div className="evidence-heading"><h2>课程反馈</h2></div>
        <label className="field">反馈类型<select className="input" value={type} disabled={saving} onChange={event => { setType(event.target.value); setSaved(false); }}>
          {feedbackTypes.map(option => <option key={option}>{option}</option>)}
        </select></label>
        <label className="field">反馈内容<textarea className="textarea" rows={5} required maxLength={1000} disabled={saving} value={text}
          onChange={event => { setText(event.target.value); setSaved(false); }}
          placeholder="写下这节课你学到了什么，或有哪些地方希望老师讲得更清楚。" /></label>
        <small className="muted">{evidence ? '反馈保存到当前账号，同班教师可以查看。' : '本地演示 · 反馈可在同设备的教师端演示中查看。'}</small>
        {error && <p className="result-banner warning" role="alert">未能确认反馈已保存。可以重试，填写内容还在。</p>}
        <div><button className="button" type="submit" disabled={saving || !text.trim()}>{saving ? '正在保存…' : '保存反馈'}</button></div>
        {saved && <span role="status" className="pill success">反馈已保存</span>}
      </form>
    </div>
    {record.feedback.length > 0 && <section className="panel evidence-history"><h2>我的反馈</h2><FeedbackList entries={record.feedback} /></section>}
  </>;
}

function FeedbackList({ entries }) {
  return [...entries].reverse().map(entry => <article className="record-row" key={entry.id}>
    <div><strong>{entry.type}</strong><p className="evidence-text">{entry.text}</p></div>
    <time dateTime={entry.at} className="muted">{formatDate(entry.at)}</time>
  </article>);
}

export function TeacherCourseEvidence({ record }) {
  return <div className="evidence-grid evidence-history">
    <section className="panel stack">
      <div className="evidence-heading"><h3>课前学情</h3>{record.preAssessment && <time className="muted" dateTime={record.preAssessment.at}>{formatDate(record.preAssessment.at)}</time>}</div>
      {record.preAssessment ? <EvidenceSummary entry={record.preAssessment} /> : <p className="muted">当前学生还没有提交素养测评和课前问卷。</p>}
    </section>
    <section className="panel">
      <div className="evidence-heading"><h3>学生课程反馈</h3><span className="pill">{record.feedback.length} 条</span></div>
      {record.feedback.length ? <FeedbackList entries={record.feedback} /> : <p className="muted">当前学生还没有保存课程反馈。</p>}
    </section>
  </div>;
}

export function CloudTeacherPage({ profile, trade, onSignOut }) {
  const [students, setStudents] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    readClassEvidence(trade.id).then(rows => {
      if (!cancelled) setStudents(rows);
    }).catch(() => {
      if (!cancelled) setError(true);
    });
    return () => { cancelled = true; };
  }, [trade.id, revision]);

  function refresh() {
    setError(false);
    setStudents(null);
    setRevision(value => value + 1);
  }

  const current = students?.find(student => student.profile.id === selectedId) || students?.[0];

  return <div className="app">
    <main className="view-panel cloud-teacher">
      <div className="row cloud-teacher-header">
        <Heading kicker="班级学情" title="教师工作台">{profile.name} · {profile.className} · {trade.name}</Heading>
        <button className="button secondary" onClick={onSignOut}>退出登录</button>
      </div>
      <DemoNote>这里展示已分配班级的课前测评、问卷和课程反馈。视频、题库与实操记录仍由学生设备保存。</DemoNote>
      <div className="row">
        <button className="button secondary" onClick={refresh} disabled={!error && !students}>刷新班级记录</button>
        {students && <span className="muted">{students.filter(student => student.record.preAssessment).length} / {students.length} 人已填写课前问卷</span>}
      </div>
      {error ? <p className="result-banner warning" role="alert">未能读取班级记录，请刷新重试。</p>
        : !students ? <p className="muted" role="status">正在读取班级记录…</p>
        : !current ? <p className="muted">当前班级还未分配学生账号。</p>
        : <>
          <label className="field">查看学生
            <select className="input" value={current.profile.id} onChange={event => setSelectedId(event.target.value)}>
              {students.map(student => <option key={student.profile.id} value={student.profile.id}>
                {student.profile.name}{student.profile.studentNumber ? ` · ${student.profile.studentNumber}` : ''}
              </option>)}
            </select>
          </label>
          <TeacherCourseEvidence record={current.record} />
        </>}
    </main>
  </div>;
}
