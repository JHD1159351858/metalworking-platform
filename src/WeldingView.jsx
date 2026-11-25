import { useEffect, useRef, useState } from 'react';
import { Heading } from './LearningUI.jsx';
import { VideoView } from './TheoryLearning.jsx';
import { CourseFeedbackForm } from './CourseEvidence.jsx';
import { SubmissionDetails } from './PracticalCourse.jsx';
import { gradeAttempt, shuffled } from './learning-data.js';
import { keepFiles, discardFiles } from './practical-files.js';
import { weldingQuestions as safetyQuestions } from './welding-assessment.js';
import { weldingLessons, weldingQuestions, weldingAssessmentQuestions, weldingRubric, weldingReady } from './welding-course.js';
import './welding-course.css';

const practiceQuestions = [...weldingQuestions, ...safetyQuestions.map(q => ({ ...q, category: '安全知识' }))];
const lessonById = id => weldingLessons.find(lesson => lesson.id === id) || weldingLessons[0];
const documentTitle = '课前测评的问题与考核案列';
const drawing = '/welding/butt-joint.svg';
const tabs = [['video', '视频学习'], ['tutor', '课程章节'], ['theory', '题库练习']];
const now = () => new Date().toISOString();

export function WeldingView(props) {
  const { view, target, onNavigate, onContextChange } = props;
  useEffect(() => () => onContextChange?.(null), [view, onContextChange]);
  if (view === 'practical') return <WeldingPractical {...props} />;
  if (view === 'feedback') return <WeldingFeedback {...props} />;
  if (view === 'knowledge') return <WeldingLibrary onNavigate={onNavigate} />;
  return <>
    <Heading title="理论学习及测评">焊接</Heading>
    <nav className="tab-bar theory-tabs" aria-label="焊接理论学习方式">{tabs.map(([id,label]) =>
      <button type="button" key={id} className={'tab' + (view === id ? ' active' : '')} aria-current={view === id ? 'page' : undefined}
        onClick={() => onNavigate(id)}>{label}</button>)}</nav>
    {view === 'video' && <VideoView key={target?.lessonId || 'video'} {...props} courseLessons={weldingLessons} initialLesson={target?.lessonId} />}
    {view === 'tutor' && <WeldingChapter {...props} key={target?.chapterId || 'chapter'} />}
    {view === 'theory' && <WeldingQuiz {...props} key={JSON.stringify(target)} />}
  </>;
}

function WeldingChapter({ record, update, target, onNavigate, onContextChange }) {
  const [id, setId] = useState(lessonById(target?.chapterId).id);
  const lesson = lessonById(id);
  useEffect(() => { onContextChange?.({ chapterId: id }); }, [id, onContextChange]);
  return <div className="stack">
    <label className="field">学习章节<select className="input" value={id} onChange={e => setId(e.target.value)}>
      {weldingLessons.map(item => <option key={item.id} value={item.id}>{item.elective ? '选学' : '预习'} · {item.title}</option>)}
    </select></label>
    <article className="panel stack"><h2>{lesson.title}</h2>
      {lesson.reading.map(([title, text]) => <section key={title}><h3>{title}</h3><p>{text}</p></section>)}
      <div className="row"><button type="button" className="button secondary" onClick={() => onNavigate('video', { lessonId: id })}>观看对应视频</button>
        <button type="button" className="button" onClick={() => onNavigate('theory', { chapterId: id })}>练习本章</button>
        <button type="button" className="button ghost" disabled={!!record.completedChapters?.[id]}
          onClick={() => update(r => ({ ...r, completedChapters: { ...r.completedChapters, [id]: now() } }))}>
          {record.completedChapters?.[id] ? '本章已读' : '标记本章已读'}</button></div>
    </article>
  </div>;
}

function WeldingQuiz({ target, record, update, rules, onNavigate, onContextChange }) {
  const review = Array.isArray(target?.reviewQuestionIds);
  const [scope, setScope] = useState(review ? 'review' : target?.chapterId || (target?.assessment ? 'exam' : weldingLessons[0].id));
  const [round, setRound] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const exam = scope === 'exam';
  const pool = review ? [...new Set(target.reviewQuestionIds)].map(id => practiceQuestions.find(q => q.id === id)).filter(Boolean)
    : exam ? weldingAssessmentQuestions : practiceQuestions.filter(q => q.chapterId === scope);
  useEffect(() => { onContextChange?.({ chapterId: lessonById(scope).id, examActive: exam && !!round.length && !result }); },
    [scope, exam, round.length, result, onContextChange]);

  function start() {
    setRound(review ? pool : shuffled(pool).slice(0, 10));
    setAnswers({});
    setResult(null);
  }
  function submit(e) {
    e.preventDefault();
    if (result || !round.length || round.some(q => answers[q.id] == null)) return;
    const graded = { ...gradeAttempt(round, answers, rules), id: crypto.randomUUID(), at: now(), questionOrder: round.map(q => q.id) };
    if (exam) update(r => ({ ...r, attempts: [...r.attempts, graded] }));
    else {
      const entry = { ...graded, mode: review ? 'mistake-review' : 'chapter', chapterId: review ? undefined : scope,
        topic: review ? '焊接错题巩固' : lessonById(scope).title, correct: graded.details.every(d => d.correct) };
      update(r => ({ ...r, practice: [...r.practice, entry] }));
    }
    setResult(graded);
  }
  if (result) return <div className="panel stack" role="status">
    <h2>{exam ? result.passed ? '理论测评已达标' : '理论测评待巩固' : '本轮练习已完成'}</h2>
    <p><strong className="theory-score">{result.score}</strong> 分 · 答对 {result.details.filter(d => d.correct).length} / {round.length} 题</p>
    {result.details.filter(d => !d.correct).map(d => {
      const q = round.find(item => item.id === d.id);
      return <article className="question-card" key={q.id}><h3>{q.prompt}</h3>
        <p>你的选择 · {q.options[d.selectedIndex]}</p><p>正确答案 · {q.options[q.answer]}</p><p>{q.explanation}</p></article>;
    })}
    <div className="row"><button className="button secondary" onClick={() => { setRound([]); setResult(null); }}>返回练习选择</button>
      {exam && result.passed ? <button className="button" onClick={() => onNavigate('practical')}>查看实操任务</button>
        : <button className="button" onClick={() => onNavigate('records', { section: 'mistakes' })}>打开错题本</button>}</div>
  </div>;
  if (!round.length) return <section className="panel stack">
    <h2>{review ? '焊接错题巩固' : '选择练习范围'}</h2>
    {!review && <label className="field">练习范围<select className="input" value={scope} onChange={e => setScope(e.target.value)}>
      {weldingLessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title} · 章节练习</option>)}
      <option value="exam">综合理论测评 · 实操前置</option>
    </select></label>}
    <p>{exam ? '理论测评共 ' + pool.length + ' 题，合格线为 ' + rules.totalPass + ' 分' + (rules.safetyAll ? '，安全题须全部正确。' : '。')
      : review ? '本次推荐共 ' + pool.length + ' 题。' : '本节共 ' + pool.length + ' 题，每轮练习 ' + Math.min(10, pool.length) + ' 题。'}</p>
    <div className="row"><button disabled={!pool.length} className="button" onClick={start}>{exam ? '开始理论测评' : '开始练习'}</button>
      {!review && !exam && <button className="button secondary" onClick={() => setScope('exam')}>选择综合理论测评</button>}</div>
  </section>;
  return <form className="stack" onSubmit={submit}>{round.map((q, index) =>
    <fieldset className="panel question-card" key={q.id}><legend className="pill">第 {index + 1} 题 · {q.category}</legend>
      <h3>{q.prompt}</h3>{q.options.map((choice, i) => <label key={choice} className="answer-option">
        <input type="radio" name={q.id} checked={answers[q.id] === i} required onChange={() => setAnswers(a => ({ ...a, [q.id]: i }))} /> {choice}
      </label>)}</fieldset>)}
    <div><button className="button" disabled={Object.keys(answers).length !== round.length}>提交并查看结果</button></div>
  </form>;
}

function WeldingLibrary({ onNavigate }) {
  return <div className="stack"><Heading title="焊接知识库" />
    <section className="panel stack"><h2>课程视频与阅读</h2>{weldingLessons.map(lesson =>
      <article key={lesson.id} className="record-row"><div><strong>{lesson.title}</strong><p>{lesson.summary}</p></div>
        <button className="button secondary" onClick={() => onNavigate('video', { lessonId: lesson.id })}>观看 {lesson.duration}</button>
      </article>)}</section>
    <section className="panel stack"><h2>焊接练习题库</h2>
      {[[safetyQuestions, '课前安全原题'], [weldingQuestions, '根据课程案例编写的练习']].map(([questions,label]) =>
        <details className="practical-entry" key={label}><summary>{label} · {questions.length} 题</summary>{questions.map(q =>
          <article className="question-card" key={q.id}><h3>{q.prompt}</h3><p>{q.options.map((option, i) => String.fromCharCode(65 + i) + '. ' + option).join('　')}</p>
            <details><summary>查看答案与解析</summary><p>{q.options[q.answer]}。{q.explanation}</p></details>
          </article>)}</details>)}
      <div className="row"><button className="button" onClick={() => onNavigate('theory')}>开始刷题</button>
        <button className="button secondary" onClick={() => onNavigate('practical')}>查看平焊任务图与评分表</button></div>
    </section></div>;
}

function WeldingPractical({ record, update, profile, trade, rules, evidence, onNavigate }) {
  const last = record.submissions.at(-1);
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const input = useRef(null);
  const ready = weldingReady(record);
  const draft = record.practicalDraft || {};
  const observations = draft.observations ?? last?.measurements ?? '';
  const notes = draft.notes ?? last?.notes ?? '';
  const teacherDrawing = /^https?:\/\//i.test(rules.drawingUrl || '') ? rules.drawingUrl : '';
  function saveDraft(field, value) {
    update(r => ({ ...r, practicalDraft: { ...r.practicalDraft, [field]: value } }));
    setMessage('');
  }
  async function submit(e) {
    e.preventDefault();
    if (!ready || busy.current || !notes.trim() || !observations.trim()) return;
    if (!files.length && (!last?.files?.length || last.review?.field === 'files')) {
      setMessage('请先选择本次要提交的材料。'); return;
    }
    busy.current = true;
    setSaving(true);
    setMessage('');
    let attached = [];
    try {
      attached = await keepFiles(profile.id, trade.id, files);
      const entry = { id: crypto.randomUUID(), previousId: last?.id, at: now(), status: '待教师评价',
        task: rules.task, drawing: rules.drawingVersion || '钢板对接平焊案例示意图', drawingUrl: teacherDrawing,
        notes: notes.trim(), measurements: observations.trim(), files: attached.length ? attached : last.files };
      update(r => {
        if (r.submissions.at(-1)?.id !== last?.id || !weldingReady({ ...r, ...evidence?.data })) throw new Error('changed');
        return { ...r, practicalDraft: {}, submissions: [...r.submissions, entry] };
      });
      setFiles([]);
      if (input.current) input.current.value = '';
      setMessage('本次材料已保存在当前浏览器，等待教师评阅。');
    } catch (err) {
      await discardFiles(profile.id, trade.id, attached).catch(() => {});
      setMessage(err.message === 'changed' ? '记录已更新，请核对后重试。' : '保存失败，请检查存储空间后重试。');
    } finally { busy.current = false; setSaving(false); }
  }
  return <div className="practical-course stack">
    <Heading title="实操考核">低碳钢板对接平焊</Heading>
    <section className="panel stack">
      <div className="evidence-heading"><h2>现场任务单</h2><span className="pill">15 分钟 / 人</span></div>
      <p>两块 Q235 低碳钢板对接，单板推荐尺寸 100 × 160 × 3～4 mm。使用 J422 焊条（直径 3.2 mm），在平焊位置完成单面焊。</p>
      <img className="practical-sheet" src={drawing} alt="两块钢板边缘对接，接缝居中；单块推荐长 160 mm，宽 100 mm，厚 3 至 4 mm。" />
      <div className="row"><a className="button secondary" href={drawing} target="_blank" rel="noreferrer">放大装配示意图</a>
        <a href={drawing} download="低碳钢板对接平焊示意图.svg">下载图纸</a></div>
      <p className="muted">依据《{documentTitle}》的推荐尺寸绘制。装配间隙由现场教师确认。</p>
      {teacherDrawing && <a className="button secondary" href={teacherDrawing} target="_blank" rel="noreferrer">教师发布图纸 · {rules.drawingVersion}</a>}
      {rules.task && rules.task !== '低碳钢板对接平焊' && <p><strong>教师任务要求</strong>　{rules.task}</p>}
      <p>穿戴防护用品，按现场要求检查焊机、焊钳和地线，经教师确认再操作。焊后待工件冷却并清理焊缝，记录表面与根部的观察结果。</p>
      <details className="practical-entry"><summary>查看案例中的操作要求</summary>
        <ol className="chapter-points">
          <li>按教师示范采用划擦法或敲击法引弧。</li>
          <li>本案例要求焊条与前进方向夹角为 70°～80°，左右对称。</li>
          <li>匀速前移并均匀小幅横向摆动，保持短弧稳定。</li>
          <li>尽量连续完成整条焊缝；中途断弧时，按教师指导在弧坑前方重新引弧，衔接熔池。</li>
          <li>冷却后，用清渣锤、钢丝刷清理焊缝，再提交现场考核。</li>
        </ol>
      </details>
    </section>
    <section className="panel stack"><div className="evidence-heading"><h2>现场评分表</h2><span className="pill">总分 60 分</span></div>
      <div className="weld-rubric-wrap"><table className="weld-rubric"><thead><tr><th>检查项</th><th>满分</th><th>观察现象与扣分依据</th></tr></thead>
        <tbody>{weldingRubric.map(item => <tr key={item.name}><th>{item.name}</th><td>{item.max}</td><td>{item.description}。{item.deductions}</td></tr>)}</tbody></table></div>
    </section>
    <section className="panel stack"><h2>提交实操材料</h2>
      {!ready ? <><p>完成以下学习后开放提交。</p><div className="row">
        {!record.preAssessment && <button className="button secondary" onClick={() => onNavigate('pre')}>完成课前测评</button>}
        {!record.videos?.[weldingLessons[0].id]?.completed && <button className="button secondary" onClick={() => onNavigate('video', { lessonId: weldingLessons[0].id })}>观看预习微课</button>}
        {!record.attempts.some(a => a.passed) && <button className="button secondary" onClick={() => onNavigate('theory', { assessment: true })}>完成综合理论测评</button>}
      </div></> : <form className="stack" onSubmit={submit}>
        {last?.status === '需补交材料' && <p className="info-banner">教师补交要求 · {last.review?.comment}</p>}
        <label className="field">焊缝观察记录<textarea className="textarea" rows={3} value={observations} required maxLength={3500}
          onChange={e => saveDraft('observations', e.target.value)} placeholder="说明部位、观察到的现象和待教师核实的项目。" /></label>
        <label className="field">现场过程记录<textarea className="textarea" rows={3} value={notes} required maxLength={3500}
          onChange={e => saveDraft('notes', e.target.value)} placeholder="记录现场检查、作品完成情况或需要复核的问题。" /></label>
        <label className="field">焊件照片或检查记录<input ref={input} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={e => setFiles(Array.from(e.target.files || []))} /></label>
        {last?.files?.length > 0 && <small>上次材料 · {last.files.map(f => f.name).join('、')}。选择新文件可替换本次提交中的附件。</small>}
        <div><button className="button" disabled={saving}>{saving ? '正在保存…' : '提交给教师评阅'}</button></div>
      </form>}
      {message && <p role="status">{message}</p>}
    </section>
    {!!record.submissions.length && <section className="panel stack"><h2>历次提交与评语</h2>{[...record.submissions].reverse().map(entry =>
      <details key={entry.id} open={entry.id === last.id} className="practical-entry"><summary>{new Date(entry.at).toLocaleString('zh-CN')} · {entry.status}</summary>
        <SubmissionDetails entry={entry} trade={trade} profile={profile} /></details>)}</section>}
  </div>;
}

function WeldingFeedback({ record, update, evidence, onNavigate }) {
  const electives = weldingLessons.filter(lesson => lesson.elective);
  const needsQuality = record.preAssessment?.focus === '焊缝缺陷识别' || record.submissions.length > 0 ||
    record.attempts.at(-1)?.details.some(d => !d.correct && ['焊缝缺陷','检查证据'].includes(d.topic));
  const preferred = needsQuality ? electives[1] : electives[0];
  const suggested = !record.videos[preferred.id]?.completed ? preferred : electives.find(lesson => !record.videos[lesson.id]?.completed);
  function choose(lesson) {
    update(r => ({ ...r, studyPreference: { chapterId: lesson.id, at: now() } }));
    onNavigate('video', { lessonId: lesson.id });
  }
  return <><Heading title="智能选学及课程反馈">焊接</Heading>
    <CourseFeedbackForm {...{record, update, evidence}} topics={weldingLessons} prompt="例如：这次检查焊缝时，你认出了哪一种缺陷？">
      <section className="panel stack"><h2>焊接选学</h2>
        {suggested ? <p>{suggested === preferred && needsQuality ? '结合你的关注点或实操记录，建议先看焊缝缺陷与检测。'
          : suggested === preferred ? '先从常见焊接方法入手，再看焊缝质量案例。' : '可以接着看还未完成的选学视频。'}</p>
          : <p>两节选学均已看完，可回看笔记或提交课程心得。</p>}
        {electives.map(lesson => <article className="question-card stack" key={lesson.id}><div className="evidence-heading"><h3>{lesson.title}</h3>
          {lesson.id === suggested?.id && <span className="pill">推荐</span>}</div><p>{lesson.summary}</p>
          <div className="row"><button className="button secondary" onClick={() => choose(lesson)}>{record.videos[lesson.id]?.completed ? '回看视频' : '去选学'}</button>
            <span className="muted">{lesson.duration}</span></div></article>)}
      </section>
    </CourseFeedbackForm></>;
}
