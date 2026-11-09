import { useEffect, useRef, useState } from 'react';
import { Notebook } from '@phosphor-icons/react';
import { DemoNote, Heading } from './LearningUI.jsx';
import { gradeAttempt, knowledge, lessons, questions, shuffled } from './learning-data.js';
import './theory-learning.css';

const stamp = () => new Date().toISOString();
const tabs = [['video', '视频学习'], ['tutor', '课程章节'], ['theory', '题库练习']];

export function TheoryLearning({ view, record, rules, update, onNavigate }) {
  return <>
    <Heading kicker="02 / 理论阶段" title="理论学习及测评">
      看视频、读章节，再用题库练习检验掌握情况。
    </Heading>
    <nav className="tab-bar theory-tabs" aria-label="理论学习方式">
      {tabs.map(([id, label]) => (
        <button key={id} className={`tab ${view === id ? 'active' : ''}`}
          aria-current={view === id ? 'page' : undefined} onClick={() => { if (view !== id) onNavigate(id); }}>
          {label}
        </button>
      ))}
    </nav>
    {view === 'video' && <VideoView record={record} update={update} onNavigate={onNavigate} />}
    {view === 'tutor' && <ChapterView onNavigate={onNavigate} />}
    {view === 'theory' && <QuestionBank record={record} rules={rules} update={update} onNavigate={onNavigate} />}
  </>;
}

function VideoView({ record, update, onNavigate }) {
  const [selected, setSelected] = useState(lessons[0]);
  const [source, setSource] = useState('');
  const [message, setMessage] = useState('');
  const picker = useRef(null);
  const player = useRef(null);
  const lastTick = useRef(0);
  const accumulated = useRef(0);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);
  const progress = record.videos[selected.id] || {};
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
    setMessage('已载入本地视频。播放时自动记录观看进度，刷新后请重新选择原文件。');
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

  return <div className="stack">
    <DemoNote>正式教学视频待教师配置。可以选择本地视频体验播放、记笔记和续播。</DemoNote>
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
              <span className="eyebrow">课程视频</span>
              <h2>{selected.title}</h2>
              <p>教师课程视频尚未配置</p>
              <button className="button secondary" onClick={() => picker.current?.click()}>选择本地视频</button>
            </div>
          )}
        </div>
        <input ref={picker} type="file" accept="video/*" onChange={e => { chooseFile(e.target.files?.[0]); e.target.value = ''; }} hidden aria-label="本地视频文件" />
        {source && <div><button className="button ghost" onClick={() => picker.current?.click()}>更换本地视频</button></div>}
        <p className="muted" role="status">{message || '播放位置保存在当前浏览器，本地视频文件留在你的设备上。'}</p>
        <div className="row video-progress-label">
          <span>本节实际观看</span><strong>{percent}%</strong>
        </div>
        <div className="progress-track" role="progressbar" aria-label="本节实际观看" aria-valuenow={percent}>
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <small className="muted">演示中实际观看达到 90% 记为完成。</small>
      </section>
      <aside className="panel stack video-notebook">
        <h2><Notebook size={22} weight="duotone" /> 随堂笔记</h2>
        <p className="muted">{selected.title}</p>
        <textarea className="textarea" aria-label="随堂笔记" rows={9} maxLength={3000} value={note}
          placeholder="记录本节要点、疑问，或想回看的时间点…" onChange={saveNote} />
        <div className="row video-notebook-meta">
          <small className="muted">按节自动保存在当前浏览器</small>
          <small className="muted">{note.length} / 3000</small>
        </div>
      </aside>
    </div>
    <section className="panel stack">
      <h3>学习目录 <span className="muted">{lessons.length} 节</span></h3>
      <div className="lesson-list video-lesson-list">
        {lessons.map((lesson, i) => (
          <button key={lesson.id} className={`lesson ${selected.id === lesson.id ? 'selected' : ''}`}
            aria-pressed={selected.id === lesson.id} onClick={() => { if (lesson.id !== selected.id) chooseLesson(lesson); }}>
            <span className="pill">0{i + 1}</span>
            <span><strong>{lesson.title}</strong><small>{record.videos[lesson.id]?.completed ? '本地观看已完成' : '课程视频待配置'}</small></span>
          </button>
        ))}
      </div>
      <p>{selected.summary}</p>
      <div><button className="button secondary" onClick={() => onNavigate('tutor')}>阅读课程章节</button></div>
    </section>
  </div>;
}

function ChapterView({ onNavigate }) {
  const [selected, setSelected] = useState(knowledge[0]);
  return <div className="stack">
    <DemoNote>这些章节用于演示课程结构，正式教学资料待教师提供与审核。</DemoNote>
    <div className="two-column">
      <aside className="panel stack">
        <h3>课程目录</h3>
        <div className="lesson-list">
          {knowledge.map((chapter, index) => (
            <button key={chapter.id} className={`lesson ${selected.id === chapter.id ? 'selected' : ''}`}
              aria-pressed={selected.id === chapter.id} onClick={() => setSelected(chapter)}>
              <span className="pill">0{index + 1}</span>
              <strong>{chapter.chapter}</strong>
            </button>
          ))}
        </div>
      </aside>
      <article className="panel stack">
        <span className="eyebrow">{selected.chapter}</span>
        <h2>{selected.title}</h2>
        <p>{selected.content}</p>
        <small className="muted">资料来源 · {selected.source}</small>
        {selected.id === 'program' && <ProgramExample />}
        <div><button className="button secondary" onClick={() => onNavigate('theory')}>前往题库练习</button></div>
      </article>
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

function QuestionBank({ record, rules, update, onNavigate }) {
  const [order, setOrder] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  function startPractice() {
    setOrder(shuffled(questions));
    setAnswers({});
    setResult(null);
  }

  function submit(event) {
    event.preventDefault();
    const graded = {
      ...gradeAttempt(order, answers, rules),
      id: crypto.randomUUID(),
      at: stamp(),
      questionOrder: order.map(q => q.id),
    };
    update(r => ({ ...r, attempts: [...r.attempts, graded] }));
    setResult(graded);
  }

  return <div className="stack">
    <DemoNote>题库含 {questions.length} 道示例题，可重复练习。达到总分和安全知识要求后解锁平台实操任务。</DemoNote>
    {result ? <>
      <section className={`panel stack result-banner ${result.passed ? 'success' : 'warning'}`} role="status">
        <span className="eyebrow">本轮练习结果</span>
        <h2>{result.passed ? '本轮练习达标' : '补学后再练一轮'}</h2>
        <p><strong className="theory-score">{result.score}</strong> 分 · 安全知识{result.safetyPassed ? '全部正确' : '有待巩固'}</p>
        <p>{result.passed ? '已获得平台实操资格。现场上机仍须教师确认。' : `本轮达标要求为 ${result.rules.totalPass} 分${result.rules.safetyAll ? '，且安全知识全部正确' : ''}。本轮记录已保存。`}</p>
      </section>
      {result.details.some(detail => !detail.correct) && <section className="panel stack">
        <h3>本轮错题与解析</h3>
        {result.details.filter(detail => !detail.correct).map(detail => {
          const question = questions.find(q => q.id === detail.id);
          const chapter = knowledge.find(item => item.id === questionChapters[detail.id]);
          return <article className="question-card" key={detail.id}>
            <span className="pill">{detail.topic}</span>
            <h3>{question.prompt}</h3>
            <p>你的选项 · {question.options[Number(answers[detail.id])]}</p>
            <p><strong>正确答案 · {question.options[question.answer]}</strong></p>
            <p className="muted">{chapter.content}</p>
            <small className="muted">资料来源 · {chapter.source}</small>
          </article>;
        })}
      </section>}
      <div className="row">
        <button className="button" onClick={startPractice}>再练一组</button>
        {result.passed ?
          <button className="button secondary" onClick={() => onNavigate('practical')}>前往实操考核</button> :
          <button className="button secondary" onClick={() => onNavigate('tutor')}>回到课程章节复习</button>}
        <button className="button ghost" onClick={() => onNavigate('records')}>查看历次练习</button>
      </div>
    </> : order.length ? (
      <form onSubmit={submit} className="stack">
        {order.map((question, i) => (
          <fieldset className="panel question-card" key={question.id}>
            <legend className="pill">第 {i + 1} 题 · {question.category}</legend>
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
          <p className="muted">已作答 {Object.keys(answers).length} / {order.length} 题</p>
          <button className="button" type="submit" disabled={Object.keys(answers).length !== order.length}>提交并查看解析</button>
        </div>
      </form>
    ) : (
      <section className="panel stack">
        <h2>开始一轮题库练习</h2>
        <p>每轮随机排列 {questions.length} 道示例题，提交后查看得分、错题与解析。</p>
        <p className="muted">达标线 {rules.totalPass} 分 · 安全知识{rules.safetyAll ? '须全部正确' : '计入总分'} · 已练习 {record.attempts.length} 次</p>
        <div><button className="button" onClick={startPractice}>开始刷题</button></div>
      </section>
    )}
  </div>;
}
