import { useEffect, useRef, useState } from 'react';
import { Notebook } from '@phosphor-icons/react';
import { Heading } from './LearningUI.jsx';
import { CaseLesson } from './CaseLesson.jsx';
import { chapterCases } from './case-exercises.js';
import { UnitKnowledge } from './UnitKnowledge.jsx';
import { gradeAttempt, knowledge, lessons, questions, shuffled } from './learning-data.js';
import { chapterRoundSize, cncAssessmentQuestions, cncChapters, cncPracticeQuestions, drawChapterRound, unitLabel } from './cnc-course.js';
import { getStudyPlan } from './study-plan.js';
import './theory-learning.css';

const stamp = () => new Date().toISOString();
const tabs = [['video', '视频学习'], ['tutor', '课程章节'], ['theory', '题库练习']];
const assessmentQuestions = [...questions, ...cncAssessmentQuestions];

export function TheoryLearning({ view, record, rules, update, onNavigate, target, onContextChange }) {
  const plan = getStudyPlan(record.preAssessment);
  const initialChapter = target?.chapterId || (plan?.view === 'tutor' ? plan.target?.chapterId : null);
  const initialLesson = target?.lessonId || (plan?.view === 'video' ? plan.targetId : null);
  const reviewOrder = Array.isArray(target?.reviewQuestionIds)
    ? [...new Set(target.reviewQuestionIds)].map(id => cncPracticeQuestions.find(q => q.id === id)).filter(Boolean).slice(0, chapterRoundSize)
    : null;
  useEffect(() => () => onContextChange?.(null), [view, onContextChange]);
  return <>
    <Heading title="理论学习及测评" />
    <nav className="tab-bar theory-tabs" aria-label="理论学习方式">
      {tabs.map(([id, label]) => (
        <button key={id} className={`tab ${view === id ? 'active' : ''}`}
          aria-current={view === id ? 'page' : undefined} onClick={() => { if (view !== id) onNavigate(id); }}>
          {label}
        </button>
      ))}
    </nav>
    {view === 'video' && <VideoView key={initialLesson || 'video'} record={record} update={update} onNavigate={onNavigate} initialLesson={initialLesson} onContextChange={onContextChange} />}
    {view === 'tutor' && <ChapterView key={`${initialChapter || 'chapter-list'}-${target?.caseId || ''}-${target?.caseRound ?? ''}`} record={record} update={update}
      onNavigate={onNavigate} initialChapter={initialChapter} initialCaseId={target?.caseId} initialCaseRound={target?.caseRound} focusCase={target?.activity === 'case'} onContextChange={onContextChange} />}
    {view === 'theory' && <QuestionBank key={reviewOrder ? 'review-' + reviewOrder.map(q => q.id).join(',') : target?.assessment ? 'assessment' : target?.chapterId || 'question-bank'} record={record} rules={rules} reviewOrder={reviewOrder}
      update={update} onNavigate={onNavigate} initialChapter={target?.assessment ? '' : target?.chapterId || cncChapters[0].id} onContextChange={onContextChange} />}
  </>;
}

const videoChapters = { intro: '8.2', safety: '8.2', process: '8.3', program: '8.4' };

function VideoView({ record, update, onNavigate, initialLesson, onContextChange }) {
  const [selected, setSelected] = useState(() => lessons.find(lesson => lesson.id === initialLesson) || lessons[0]);
  const [source, setSource] = useState('');
  const [message, setMessage] = useState('');
  const picker = useRef(null);
  const notebook = useRef(null);
  const player = useRef(null);
  const lastTick = useRef(0);
  const accumulated = useRef(0);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);
  const progress = record.videos[selected.id] || {};
  const chapterId = videoChapters[selected.id];
  const videoTime = Math.floor(progress.position || 0);
  useEffect(() => {
    onContextChange?.({ chapterId, lessonId: selected.id, videoTime });
  }, [chapterId, selected.id, videoTime, onContextChange]);
  function chooseLesson(lesson) {
    tick(true);
    setSelected(lesson);
    setSource('');
    setMessage('');
  }
  function chooseFile(file) {
    if (!file) return;
    tick(true);
    setSource(URL.createObjectURL(file));
    lastTick.current = 0;
    accumulated.current = 0;
    update(r => {
      const previous = r.videos[selected.id];
      const entry = previous?.filename === file.name ? previous : { filename: file.name, duration: 0 };
      return { ...r, videos: { ...r.videos, [selected.id]: entry } };
    });
    setMessage(`已载入 ${file.name}`);
  }
  function tick(force = false) {
    const video = player.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const { currentTime, duration } = video;
    const delta = currentTime - lastTick.current;
    if ((!video.paused || force) && delta > 0 && delta < 2) accumulated.current += delta;
    lastTick.current = currentTime;
    if (!force && accumulated.current < 3) return;
    const watched = accumulated.current;
    accumulated.current = 0;
    update(r => {
      const old = r.videos[selected.id] || {};
      const watchedSeconds = Math.min(duration, (old.watchedSeconds || 0) + watched);
      const entry = { ...old, position: currentTime, duration, watchedSeconds, completed: watchedSeconds >= duration * .9, updatedAt: stamp() };
      return { ...r, videos: { ...r.videos, [selected.id]: entry } };
    });
  }
  const note = record.videoNotes?.[selected.id] || '';
  const percent = progress.duration ? Math.min(100, Math.round((progress.watchedSeconds || 0) / progress.duration * 100)) : 0;

  function saveNote(event) {
    const text = event.target.value;
    update(r => ({ ...r, videoNotes: { ...r.videoNotes, [selected.id]: text } }));
  }
  function askAboutNote() {
    const { selectionStart, selectionEnd } = notebook.current;
    const question = (note.slice(selectionStart, selectionEnd) || note).trim();
    if (!question) return;
    player.current?.pause();
    window.dispatchEvent(new CustomEvent('companion-question', { detail: {
      question, note: question, chapterId, lessonId: selected.id, videoTime: Math.floor(player.current?.currentTime ?? videoTime),
    } }));
  }

  return <div className="stack">
    <div className="video-workspace">
      <section className="panel stack">
        <div className="video-stage">
          {source ? (
            <video ref={player} controls src={source} onLoadedMetadata={e => {
              const position = progress.position || 0;
              const video = e.currentTarget;
              if (position < video.duration) video.currentTime = position;
              lastTick.current = video.currentTime;
            }} onTimeUpdate={() => tick()} onPause={() => tick(true)} onEnded={() => tick(true)}
              onSeeking={() => { if (player.current) lastTick.current = player.current.currentTime; }} />
          ) : (
            <div className="empty-state">
              <h2>{selected.title}</h2>
              <p>教师课程视频尚未配置</p>
              <button className="button secondary" onClick={() => picker.current?.click()}>选择本地视频</button>
            </div>
          )}
        </div>
        <input ref={picker} type="file" accept="video/*" onChange={e => { chooseFile(e.target.files?.[0]); e.target.value = ''; }} hidden aria-label="本地视频文件" />
        {source && <div><button className="button ghost" onClick={() => picker.current?.click()}>更换本地视频</button></div>}
        {message && <p className="muted" role="status">{message}</p>}
        <div className="row video-progress-label">
          <span>本节实际观看</span><strong>{percent}%</strong>
        </div>
        <div className="progress-track" role="progressbar" aria-label="本节实际观看" aria-valuenow={percent}>
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
      </section>
      <aside className="panel stack video-notebook">
        <h2><Notebook size={22} weight="duotone" /> 随堂笔记</h2>
        <p className="muted">{selected.title}</p>
        <textarea ref={notebook} className="textarea" aria-label="随堂笔记" rows={9} maxLength={3000} value={note}
          placeholder="记录本节要点、疑问，或想回看的时间点…" onChange={saveNote} />
        <div className="row video-notebook-meta">
          {note && <small className="muted">已保存</small>}
          <small className="muted">{note.length} / 3000</small>
        </div>
        <button className="button secondary" disabled={!note.trim()} onClick={askAboutNote}>用笔记问伴学</button>
      </aside>
    </div>
    <section className="panel stack">
      <h3>学习目录 <span className="muted">{lessons.length} 节</span></h3>
      <div className="lesson-list video-lesson-list">
        {lessons.map((lesson, i) => (
          <button key={lesson.id} className={`lesson ${selected.id === lesson.id ? 'selected' : ''}`}
            aria-pressed={selected.id === lesson.id} onClick={() => { if (lesson.id !== selected.id) chooseLesson(lesson); }}>
            <span className="pill">0{i + 1}</span>
            <span><strong>{lesson.title}</strong>{record.videos[lesson.id]?.filename &&
              <small>{record.videos[lesson.id].completed ? '已看完' : '学习中'}</small>}</span>
          </button>
        ))}
      </div>
      <div><button className="button secondary" onClick={() => onNavigate('tutor', { chapterId })}>阅读对应章节</button></div>
    </section>
  </div>;
}

function ChapterView({ record, update, onNavigate, initialChapter, initialCaseId, initialCaseRound, focusCase, onContextChange }) {
  const [selectedId, setSelectedId] = useState(() => [...cncChapters, ...knowledge]
    .find(chapter => chapter.id === initialChapter)?.id || cncChapters[0].id);
  const courseChapter = cncChapters.find(chapter => chapter.id === selectedId);
  const selected = courseChapter || knowledge.find(chapter => chapter.id === selectedId);
  const [activity, setActivity] = useState(focusCase ? 'case' : 'knowledge');
  const completedChapters = record.completedChapters || {};
  useEffect(() => {
    if (activity !== 'case' || !courseChapter) onContextChange?.({ chapterId: selectedId });
  }, [activity, courseChapter, selectedId, onContextChange]);

  function chooseChapter(id) {
    setSelectedId(id);
    setActivity('knowledge');
  }
  function markRead() {
    update(previous => ({
      ...previous, completedChapters: { ...previous.completedChapters, [selectedId]: true },
    }));
  }

  return <div className="two-column chapter-layout">
      <label className="field chapter-picker">选择学习单元
        <select className="input" value={selectedId} onChange={event => chooseChapter(event.target.value)}>
          <optgroup label="数控车学习单元">{cncChapters.map(chapter => <option key={chapter.id} value={chapter.id}>
            {unitLabel(chapter.id)} · {chapter.title}{completedChapters[chapter.id] ? ' · 已读' : ''}
          </option>)}</optgroup>
          <optgroup label="补充学习">{knowledge.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.chapter}</option>)}</optgroup>
        </select>
      </label>
      <aside className="panel stack chapter-index">
        <h3>数控车学习单元</h3>
        <nav className="lesson-list" aria-label="数控车床实训章节">
          {cncChapters.map(chapter => (
            <button key={chapter.id} className={`lesson ${selectedId === chapter.id ? 'selected' : ''}`}
              aria-pressed={selectedId === chapter.id} onClick={() => chooseChapter(chapter.id)}>
              <span className="pill">{unitLabel(chapter.id)}</span>
              <span><strong>{chapter.title}</strong><small>{chapterCases(chapter.id).length} 个案例 · {cncPracticeQuestions.filter(q => q.chapterId === chapter.id).length} 道题{completedChapters[chapter.id] ? ' · 已读' : ''}</small></span>
            </button>
          ))}
        </nav>
        <details open={courseChapter ? undefined : true}>
          <summary>补充学习</summary>
          <nav className="lesson-list supplemental-lessons" aria-label="补充学习章节">
            {knowledge.map(chapter => (
              <button key={chapter.id} className={`lesson ${selectedId === chapter.id ? 'selected' : ''}`}
                aria-pressed={selectedId === chapter.id} onClick={() => chooseChapter(chapter.id)}>
                <strong>{chapter.chapter}</strong>
              </button>
            ))}
          </nav>
        </details>
      </aside>
      <div className="stack">
        {courseChapter ? <>
          <nav className="tab-bar" aria-label="单元内容">
            <button type="button" className={`tab ${activity === 'knowledge' ? 'active' : ''}`} aria-pressed={activity === 'knowledge'} onClick={() => setActivity('knowledge')}>基础知识</button>
            <button type="button" className={`tab ${activity === 'case' ? 'active' : ''}`} aria-pressed={activity === 'case'} onClick={() => setActivity('case')}>案例练习</button>
          </nav>
          {activity === 'case' ? <CaseLesson key={selectedId} chapterId={selectedId} initialCaseId={selectedId === initialChapter ? initialCaseId : undefined}
            record={record} update={update} onNavigate={onNavigate} initialRound={focusCase ? initialCaseRound : undefined}
            focusCase={focusCase && initialChapter === selectedId} onContextChange={onContextChange} /> : <>
            <UnitKnowledge chapterId={selectedId} />
            {selectedId === '8.4' && <ProgramExample />}
          </>}
        </> : <section className="panel stack">
          <h2>{selected.title}</h2>
          <p>{selected.content}</p>
          <small className="muted">资料来源 · {selected.source}</small>
          {selectedId === 'program' && <ProgramExample />}
        </section>}
        <div className="row">
          {courseChapter && activity === 'knowledge' && <button className="button ghost" disabled={completedChapters[selectedId]} onClick={markRead}>
            {completedChapters[selectedId] ? '本节已读' : '标记本节已读'}
          </button>}
          <button className="button secondary" onClick={() => onNavigate('theory', courseChapter ? { chapterId: selectedId } : undefined)}>
            {courseChapter ? '练习本节' : '前往题库练习'}
          </button>
        </div>
      </div>
  </div>;
}

function ProgramExample() {
  const [program, setProgram] = useState('G00 X40 Z10\nG01 X20 Z0\nG01 X20 Z-40\nG01 X35 Z-50');
  const [parsed, setParsed] = useState(null);
  const canvas = useRef(null);
  function parse() {
    const rows = program.split('\n').map(s => s.trim()).filter(Boolean);
    if (!rows.length) { setParsed({ error: '请先输入受支持的坐标指令。' }); return; }
    const invalid = rows.find(s => !/^G0?[01](?:\s+[XZ]-?\d+(?:\.\d+)?){1,2}$/i.test(s) || (s.match(/\bX/gi) || []).length > 1 || (s.match(/\bZ/gi) || []).length > 1);
    if (invalid) { setParsed({ error: `当前视图不支持此行：${invalid}。只接受 G00/G01 与 X、Z 数值；未计算任何轨迹。` }); return; }
    let x = 0, z = 0;
    const points = [{ x, z, rapid: false }];
    rows.forEach(s => { const xv = s.match(/X(-?\d+(?:\.\d+)?)/i), zv = s.match(/Z(-?\d+(?:\.\d+)?)/i); if (xv) x = Number(xv[1]); if (zv) z = Number(zv[1]); points.push({ x, z, rapid: /^G0?0\b/i.test(s), line: s }); });
    setParsed({ points });
  }
  useEffect(() => {
    if (!parsed?.points || !canvas.current) return;
    const ctx = canvas.current.getContext('2d'), points = parsed.points;
    const w = 720, h = 300, pad = 36, xs = points.map(p => p.z), ys = points.map(p => p.x);
    const minZ = Math.min(...xs), maxZ = Math.max(...xs), minX = Math.min(...ys), maxX = Math.max(...ys);
    const px = p => pad + (p.z - minZ) / (maxZ - minZ || 1) * (w - pad * 2), py = p => h - pad - (p.x - minX) / (maxX - minX || 1) * (h - pad * 2);
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#eff6ff'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d5e4f6'; ctx.lineWidth = 1;
    for (let i = pad; i < w; i += 40) { ctx.beginPath(); ctx.moveTo(i, pad); ctx.lineTo(i, h - pad); ctx.stroke(); }
    for (let i = pad; i < h; i += 40) { ctx.beginPath(); ctx.moveTo(pad, i); ctx.lineTo(w - pad, i); ctx.stroke(); }
    points.slice(1).forEach((p, i) => { ctx.strokeStyle = p.rapid ? '#e99b34' : '#1765e9'; ctx.setLineDash(p.rapid ? [8, 5] : []); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px(points[i]), py(points[i])); ctx.lineTo(px(p), py(p)); ctx.stroke(); });
    ctx.setLineDash([]); ctx.fillStyle = '#163a64'; ctx.font = '14px sans-serif'; ctx.fillText('X ↑', 10, 23); ctx.fillText('Z →', w - 48, h - 10);
  }, [parsed]);
  return <details>
    <summary>练习查看程序坐标</summary>
    <div className="stack theory-program">
      <p className="muted">仅演示 G00、G01 与绝对 X、Z 坐标的二维连线。实际程序须由教师结合设备验证。</p>
      <textarea className="textarea" rows={5} aria-label="教学示例程序" value={program}
        onChange={e => { setProgram(e.target.value); setParsed(null); }} spellCheck={false} />
      <div><button className="button secondary" onClick={parse}>解析并查看坐标连线</button></div>
      {parsed?.error && <div className="result-banner warning" role="alert">{parsed.error}</div>}
      {parsed?.points && <>
        <canvas ref={canvas} width={720} height={300} aria-label="X Z 坐标路径，橙色虚线为 G00，蓝色实线为 G01" />
        <small className="muted">橙色虚线 G00 · 蓝色实线 G01</small>
        <ol>{parsed.points.slice(1).map((point, i) => <li key={i}><code>{point.line}</code> → X {point.x} / Z {point.z}</li>)}</ol>
      </>}
    </div>
  </details>;
}

const questionChapters = {
  q1: 'safety',
  q2: 'safety',
  q3: 'program',
  q4: 'drawing',
  q5: 'assessment',
};

function QuestionBank({ record, rules, update, onNavigate, initialChapter, reviewOrder, onContextChange }) {
  const [chapterId, setChapterId] = useState(() => cncChapters.some(chapter => chapter.id === initialChapter) ? initialChapter : '');
  const [order, setOrder] = useState(() => reviewOrder || []);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const chapter = cncChapters.find(item => item.id === chapterId);
  const pool = chapter ? cncPracticeQuestions.filter(question => question.chapterId === chapterId) : assessmentQuestions;
  const review = reviewOrder !== null;
  const isDrill = review || Boolean(chapter);
  const activeExam = !isDrill && order.length > 0 && !result;
  const [questionIndex, setQuestionIndex] = useState(0);
  const questionId = isDrill && !result ? order[questionIndex]?.id || null : null;
  const contextChapter = review ? order[questionIndex]?.chapterId : chapterId;
  const answeredCount = Object.keys(answers).length;
  const unansweredIndex = order.findIndex(q => !(q.id in answers));
  const lastQuestion = questionIndex === order.length - 1;
  useEffect(() => {
    onContextChange?.({ chapterId: contextChapter || null, questionId, examActive: activeExam });
  }, [activeExam, contextChapter, questionId, onContextChange]);

  function startPractice() {
    onContextChange?.({ chapterId: chapterId || null, examActive: !chapter });
    setQuestionIndex(0);
    setOrder(chapter ? drawChapterRound(pool) : shuffled(pool));
    setAnswers({});
    setResult(null);
  }

  function submit(event) {
    event.preventDefault();
    if (result || !order.length || unansweredIndex !== -1) return;
    const graded = {
      ...gradeAttempt(order, answers, rules),
      id: crypto.randomUUID(),
      at: stamp(),
      questionOrder: order.map(q => q.id),
    };
    if (isDrill) {
      const practice = {
        id: graded.id, at: graded.at,
        ...(review ? { mode: 'mistake-review', topic: '错题巩固练习' } : { topic: chapter.title, chapterId }),
        correct: graded.details.every(detail => detail.correct), score: graded.score,
        details: graded.details, questionOrder: graded.questionOrder,
      };
      update(r => ({ ...r, practice: [...r.practice, practice] }));
      setResult({ ...graded, passed: practice.correct });
    } else {
      update(r => ({ ...r, attempts: [...r.attempts, graded] }));
      setResult(graded);
    }
  }

  const returnToMistakes = () => onNavigate('records', { section: 'mistakes' });
  if (review && !order.length) return <section className="panel stack">
    <h2>这组推荐题已不可用</h2>
    <div><button className="button secondary" onClick={returnToMistakes}>返回错题本</button></div>
  </section>;
  return <div className="stack">
    {result ? <>
      <section className={`panel stack result-banner ${result.passed ? 'success' : 'warning'}`} role="status">
        <span className="eyebrow">本轮练习结果</span>
        <h2>{review ? '已完成错题巩固练习' : result.passed ? (chapter ? '本节练习已完成' : '本轮练习达标') : '补学后再练一轮'}</h2>
        <p><strong className="theory-score">{result.score}</strong> 分{review ? ` · 答对 ${result.details.filter(item => item.correct).length} / ${order.length} 题` : chapter ? ` · ${unitLabel(chapterId)}` : ` · 安全知识${result.safetyPassed ? '全部正确' : '有待巩固'}`}</p>
        {!review && <p>{chapter ? '全部答对后计为本节练习完成。' : result.passed ? '已获得平台实操资格。现场上机仍须教师确认。' : `本轮达标要求为 ${result.rules.totalPass} 分${result.rules.safetyAll ? '，且安全知识全部正确' : ''}。本轮记录已保存。`}</p>}
      </section>
      {result.details.some(detail => !detail.correct) && <section className="panel stack">
        <h3>本轮错题与解析</h3>
        {result.details.filter(detail => !detail.correct).map(detail => {
          const question = order.find(q => q.id === detail.id);
          const supplementary = knowledge.find(item => item.id === questionChapters[detail.id]);
          return <article className="question-card" key={detail.id}>
            <span className="pill">{detail.topic}</span>
            <h3>{question.prompt}</h3>
            <p>你的选项 · {question.options[Number(answers[detail.id])]}</p>
            <p><strong>正确答案 · {question.options[question.answer]}</strong></p>
            <p className="muted">{question.explanation || supplementary?.content}</p>
          </article>;
        })}
      </section>}
      {review ? <div><button className="button" onClick={returnToMistakes}>返回错题本</button></div> : <div className="row">
        <button className="button" onClick={startPractice}>再练一组</button>
        {!chapter && result.passed ?
          <button className="button secondary" onClick={() => onNavigate('practical')}>前往实操考核</button> :
          <button className="button secondary" onClick={() => onNavigate('tutor', chapter ? { chapterId } : undefined)}>回到课程章节复习</button>}
        <button className="button ghost" onClick={() => { setOrder([]); setResult(null); }}>选择练习范围</button>
        {result.details.some(detail => !detail.correct) && <button className="button secondary" onClick={returnToMistakes}>去错题本练同类题</button>}
        <button className="button ghost" onClick={() => onNavigate('records')}>查看历次练习</button>
      </div>}
    </> : order.length ? (
      <form onSubmit={submit} className="stack">
        {isDrill && <nav className="panel stack" aria-label={review ? '错题巩固答题卡' : '本节答题卡'}>
          <div className="row"><strong>{review ? '错题巩固练习' : unitLabel(chapterId) + ' · ' + chapter.title}</strong><span className="muted">已答 {answeredCount} / {order.length}</span></div>
          <div className="row">{order.map((q, index) => <button type="button" key={q.id}
            className={index === questionIndex ? 'button' : 'button secondary'}
            aria-label={`第 ${index + 1} 题，${q.id in answers ? '已答' : '未答'}`}
            aria-current={index === questionIndex ? 'step' : undefined} onClick={() => setQuestionIndex(index)}>
            {index + 1}{q.id in answers ? ' ✓' : ''}
          </button>)}</div>
        </nav>}
        {(isDrill ? [order[questionIndex]] : order).map((question, i) => (
          <fieldset className="panel question-card" key={question.id}>
            <legend className="pill">第 {isDrill ? questionIndex + 1 : i + 1} 题 · {review ? unitLabel(question.chapterId) + ' · ' + question.topic : question.category}</legend>
            <h3>{question.prompt}</h3>
            <div className="stack">
              {question.options.map((option, index) => (
                <label className={`answer-option ${answers[question.id] === String(index) ? 'selected' : ''}`} key={option}>
                  <input type="radio" name={question.id} value={index} required
                    checked={answers[question.id] === String(index)}
                    onChange={e => setAnswers(a => ({ ...a, [question.id]: e.target.value }))} />
                  <span>{String.fromCharCode(65 + index)}. {option}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <div className="panel row">
          {isDrill
            ? <button type="button" className="button secondary" disabled={!questionIndex} onClick={() => setQuestionIndex(questionIndex - 1)}>上一题</button>
            : <p className="muted">已作答 {answeredCount} / {order.length} 题</p>}
          {isDrill && !lastQuestion && <button type="button" className="button" onClick={() => setQuestionIndex(questionIndex + 1)}>下一题</button>}
          {isDrill && lastQuestion && unansweredIndex !== -1 && <button type="button" className="button secondary"
            onClick={() => setQuestionIndex(unansweredIndex)}>前往待答题</button>}
          {(!isDrill || (lastQuestion && unansweredIndex === -1)) && <button className="button" type="submit"
            disabled={unansweredIndex !== -1}>提交并查看解析</button>}
        </div>
      </form>
    ) : (
      <section className="panel stack">
        <h2>开始一轮题库练习</h2>
        <label className="field">练习范围
          <select className="input" value={chapterId} onChange={event => setChapterId(event.target.value)}>
            {cncChapters.map(item => <option key={item.id} value={item.id}>{unitLabel(item.id)} · {item.title} · {cncPracticeQuestions.filter(q => q.chapterId === item.id).length} 道题</option>)}
            <option value="">综合测评 · {assessmentQuestions.length} 道题（实操资格）</option>
          </select>
        </label>
        <p>{chapter ? `从本章 ${pool.length} 道题中随机抽取 ${chapterRoundSize} 道，本轮内不重复。` : `综合测评共 ${pool.length} 道题，包含安全知识。`}提交后可查看得分和错题解析。</p>
        <p className="muted">{chapter ? '本节练习要求全部答对。请通过综合练习获得平台实操资格。' : `达标线 ${rules.totalPass} 分 · 安全知识${rules.safetyAll ? '须全部正确' : '计入总分'} · 已完成综合练习 ${record.attempts.length} 次`}</p>
        <div className="row"><button className="button" disabled={!pool.length} onClick={startPractice}>{chapter ? '开始刷题' : '开始综合测评'}</button>
          {chapter && <button className="button secondary" onClick={() => onNavigate('knowledge', { chapterId })}>查看本章完整题库</button>}</div>
      </section>
    )}
  </div>;
}
