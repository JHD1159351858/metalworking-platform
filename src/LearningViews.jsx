import { useEffect, useRef, useState } from 'react';
import { lessons, knowledge, questions, loadRecord, saveRecord, loadRules, saveRules, getSummary, gradeAttempt, shuffled, downloadRecords } from './learning-data';

const date = value => new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
const stamp = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
function Heading({ kicker, title, children }) { return <div className="page-heading"><div><div className="eyebrow">{kicker}</div><h1>{title}</h1>{children && <p className="muted">{children}</p>}</div></div>; }
function DemoNote({ children }) { return <div className="info-banner">{children || '教学流程示例 · 课程资料、题库与规则待教师审核配置。当前记录仅保存在此浏览器。'}</div>; }

export function LearningView({ view, profile, trade, onNavigate, onProgress }) {
  const [record, setRecord] = useState(() => loadRecord(profile, trade));
  const [rules, setRules] = useState(() => loadRules(trade));
  useEffect(() => { setRecord(loadRecord(profile, trade)); setRules(loadRules(trade)); }, [profile.id, trade.id]);
  const update = fn => {
    const next = fn(loadRecord(profile, trade));
    saveRecord(profile, trade, next); setRecord(next); onProgress?.();
  };
  const props = { profile, trade, record, rules, update, onNavigate };
  let content;
  if (view === 'video') content = <VideoView {...props} />;
  else if (view === 'tutor') content = <TutorView {...props} />;
  else if (view === 'theory') content = <TheoryView {...props} />;
  else if (view === 'practical') content = <PracticalView {...props} />;
  else if (view === 'records') content = <RecordsView {...props} />;
  else if (view === 'knowledge') content = <KnowledgeView />;
  else if (view === 'teacher') content = <TeacherView {...props} onRules={next => { saveRules(trade, next); setRules(next); }} />;
  else content = <CenterView {...props} />;
  return <section className="view-panel" key={`${profile.id}-${trade.id}-${view}`}>{content}</section>;
}

function VideoView({ profile, trade, record, update, onNavigate }) {
  const [selected, setSelected] = useState(lessons[0]);
  const [source, setSource] = useState('');
  const [message, setMessage] = useState('');
  const player = useRef(null);
  const lastTick = useRef(0);
  const accumulated = useRef(0);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);
  const progress = record.videos[selected.id] || {};
  function chooseLesson(lesson) { tick(true); setSelected(lesson); setSource(''); setMessage(''); lastTick.current = 0; accumulated.current = 0; }
  function chooseFile(event) {
    const file = event.target.files?.[0]; if (!file) return;
    setSource(URL.createObjectURL(file)); lastTick.current = 0; accumulated.current = 0;
    update(r => { const old = r.videos[selected.id]; return { ...r, videos: { ...r.videos, [selected.id]: { ...(old?.filename === file.name ? old : {}), filename: file.name, duration: 0 } } }; });
    setMessage('已载入本地视频。播放时自动记录观看进度，刷新后请重新选择原文件。');
  }
  function tick(force = false) {
    const video = player.current; if (!video || !Number.isFinite(video.duration)) return;
    const delta = video.currentTime - lastTick.current;
    if ((!video.paused || force) && delta > 0 && delta < 2) accumulated.current += delta;
    lastTick.current = video.currentTime;
    if (!force && accumulated.current < 3) return;
    const watched = accumulated.current; accumulated.current = 0;
    update(r => { const old = r.videos[selected.id] || {}; const watchedSeconds = Math.min(video.duration, (old.watchedSeconds || 0) + watched); return { ...r, videos: { ...r.videos, [selected.id]: { ...old, position: video.currentTime, duration: video.duration, watchedSeconds, completed: watchedSeconds >= video.duration * .9, updatedAt: stamp() } } }; });
  }
  return <><Heading kicker="01 / VIDEO LEARNING" title="视频学习">从设备认知开始，循序掌握实训要点。</Heading><DemoNote>正式教学视频待教师配置。可选择本地视频体验播放与进度记录；示例导读不计作视频完成。</DemoNote><div className="two-column"><aside className="panel"><h3>学习目录 <span className="muted">{lessons.length} 节</span></h3><div className="lesson-list">{lessons.map((lesson, i) => <button className={`lesson ${selected.id === lesson.id ? 'selected' : ''}`} key={lesson.id} onClick={() => chooseLesson(lesson)}><span className="pill">0{i + 1}</span><span><strong>{lesson.title}</strong><small>{record.videos[lesson.id]?.completed ? '已完成本地观看' : '课程视频待配置'}</small></span></button>)}</div></aside><div className="stack"><div className="panel"><div className="video-stage">{source ? <video ref={player} controls src={source} onLoadedMetadata={() => { const p = record.videos[selected.id]?.position || 0; if (player.current && p < player.current.duration) player.current.currentTime = p; lastTick.current = p; }} onTimeUpdate={() => tick()} onPause={() => tick(true)} onEnded={() => tick(true)} onSeeking={() => { if (player.current) lastTick.current = player.current.currentTime; }} style={{ width: '100%', maxHeight: 380 }} /> : <div className="empty-state"><span className="eyebrow">COURSE VIDEO</span><h2>{selected.title}</h2><p>教师课程视频尚未配置</p><label className="button secondary">选择本地视频体验<input type="file" accept="video/*" onChange={chooseFile} hidden aria-label="选择本地视频" /></label></div>}</div>{source && <label className="button ghost">更换本地视频<input type="file" accept="video/*" onChange={chooseFile} hidden aria-label="更换本地视频" /></label>}<p className="muted" role="status">{message || '支持继续已记录的位置；本地视频文件不会上传。'}</p><div className="row"><span>本节实际观看</span><strong>{progress.duration ? Math.min(100, Math.round((progress.watchedSeconds || 0) / progress.duration * 100)) : 0}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress.duration ? Math.min(100, (progress.watchedSeconds || 0) / progress.duration * 100) : 0}%` }} /></div><small className="muted">体验规则：实际观看达到 90% 记录为完成，正式要求由教师另行配置。</small></div><div className="panel"><span className="pill">示例导读</span><h3>{selected.topic}</h3><p>{selected.summary}</p><button className="button secondary" onClick={() => onNavigate('tutor')}>带着问题进入辅导学习</button></div></div></div></>;
}

function TutorView({ record, update, onNavigate }) {
  const [tab, setTab] = useState('qa');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [program, setProgram] = useState('G00 X40 Z10\nG01 X20 Z0\nG01 X20 Z-40\nG01 X35 Z-50');
  const [parsed, setParsed] = useState(null);
  const canvas = useRef(null);
  const [exercise, setExercise] = useState('');
  const [feedback, setFeedback] = useState('');
  function ask(text) {
    if (!text.trim()) return;
    const match = knowledge.find(k => k.tags.some(tag => text.includes(tag)));
    const reply = match ? { text: match.content, source: `${match.source} / ${match.chapter}` } : { text: '示例资料中没有足够依据回答这个问题。请补充设备、任务和课程资料，并向教师确认。', source: '未检索到匹配的示例章节' };
    setMessages(prev => [...prev, { question: text, ...reply }]); setQuery('');
    update(r => ({ ...r, tutoring: [...r.tutoring, { id: uid(), query: text, source: reply.source, at: stamp() }] }));
  }
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
  function practice() { if (!exercise) return; const correct = exercise === 'teacher'; setFeedback(correct ? '回答正确。平台资格不替代现场教师确认。' : '再想一想：网页中的考核资格，与现场上机许可是否相同？请阅读“考核说明”后重试。'); update(r => ({ ...r, practice: [...r.practice, { id: uid(), topic: '现场上机许可', correct, at: stamp() }] })); }
  return <><Heading kicker="02 / GUIDED LEARNING" title="辅导学习">把问题弄明白，再迈向下一步。</Heading><DemoNote>示例知识检索，未连接大模型。回答来自下方示例资料；课程正式知识库待教师提供与审核。</DemoNote><div className="tab-bar">{[['qa','知识答疑'],['program','程序与坐标视图'],['practice','巩固练习']].map(([id,label]) => <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>)}</div>{tab === 'qa' ? <div className="two-column"><div className="panel"><h3>从一个好问题开始</h3><div className="stack">{knowledge.map(k => <button className="lesson" key={k.id} onClick={() => ask(k.title)}>{k.title}</button>)}</div><p className="muted">依据不足时，请补充信息或咨询教师。</p><button className="button ghost" onClick={() => onNavigate('knowledge')}>浏览示例知识库</button></div><div className="panel stack"><span className="pill">课程辅导 · 数控车</span>{messages.length ? messages.map((m, i) => <div key={i} className="question-card"><strong>{m.question}</strong><p>{m.text}</p><small className="muted">资料来源：{m.source}</small></div>) : <div className="empty-state"><h2>你好，今天想了解什么？</h2><p>可以选择左侧问题，也可以描述你的疑问。</p></div>}<form className="row" onSubmit={e => { e.preventDefault(); ask(query); }}><input className="input" value={query} onChange={e => setQuery(e.target.value)} placeholder="输入关于安全、工艺或程序的问题…" aria-label="辅导问题" required /><button className="button" type="submit">提问</button></form></div></div> : tab === 'program' ? <div className="two-column"><div className="panel stack"><h3>程序结构辅助理解</h3><p className="muted">仅演示 G00 / G01 与绝对 X、Z 坐标的二维连线。其他指令会阻止计算，不进行毛坯切削或碰撞检测。</p><textarea className="textarea" rows={9} aria-label="教学示例程序" value={program} onChange={e => setProgram(e.target.value)} spellCheck={false} /><button className="button" onClick={parse}>解析并查看坐标连线</button><small className="muted">未绑定真实控制系统、单位与直径/半径模式，不得作为上机程序或安全依据。</small></div><div className="panel"><h3>二维坐标视图</h3>{parsed?.error ? <div className="result-banner warning" role="alert">{parsed.error}</div> : parsed?.points ? <><canvas ref={canvas} width={720} height={300} style={{ width: '100%', borderRadius: 12 }} aria-label="抽象 X Z 坐标路径，橙色虚线为 G00，蓝色实线为 G01" /><p className="muted">橙色虚线：G00 坐标连接 · 蓝色实线：G01 坐标连接</p><ol>{parsed.points.slice(1).map((p,i) => <li key={i}><code>{p.line}</code> → X {p.x} / Z {p.z}</li>)}</ol></> : <div className="empty-state"><p>解析左侧示例，查看坐标连接结果</p></div>}</div></div> : <div className="panel stack"><h3>想一想：通过理论考核后，能直接启动机床吗？</h3>{[['direct','能，平台已经解锁'],['teacher','不能，还需现场教师确认']].map(([id,label]) => <label key={id} className="answer-option"><input type="radio" name="practice" value={id} checked={exercise === id} onChange={e => setExercise(e.target.value)} />{label}</label>)}<div><button className="button" disabled={!exercise} onClick={practice}>检查回答</button></div>{feedback && <div className="info-banner" role="status">{feedback}</div>}<p className="muted">练习记录 {record.practice.length} 次 · 正式题库与模块小测待教师配置。</p><button className="button secondary" onClick={() => onNavigate('theory')}>进入理论考核</button></div>}</>;
}

function TheoryView({ record, rules, update, onNavigate }) {
  const [order, setOrder] = useState(() => shuffled(questions));
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [started, setStarted] = useState(false);
  function submit(event) { event.preventDefault(); const graded = { ...gradeAttempt(order, answers, rules), id: uid(), at: stamp(), questionOrder: order.map(q => q.id) }; update(r => ({ ...r, attempts: [...r.attempts, graded] })); setResult(graded); setStarted(false); }
  function restart() { setOrder(shuffled(questions)); setAnswers({}); setResult(null); setStarted(true); }
  return <><Heading kicker="03 / THEORY ASSESSMENT" title="理论考核">检验理解程度，做好实操准备。</Heading><DemoNote>本页为 5 道示例题的前端考试体验，非正式考试系统；正式题库、身份校验和防泄露机制尚未接入。</DemoNote><div className="stat-grid"><div className="stat"><span>示例题目</span><strong>5 <small>道</small></strong></div><div className="stat"><span>总分合格线</span><strong>{rules.totalPass} <small>分</small></strong></div><div className="stat"><span>安全知识要求</span><strong style={{fontSize:22}}>{rules.safetyAll ? '全部正确' : '计入总分'}</strong></div><div className="stat"><span>已完成考核</span><strong>{record.attempts.length} <small>次</small></strong></div></div>{result ? <div className={`panel stack result-banner ${result.passed ? 'success' : 'warning'}`} role="status"><span className="eyebrow">ASSESSMENT RESULT</span><h2>{result.passed ? '理论考核通过' : '继续补学，再试一次'}</h2><p><strong style={{fontSize:42}}>{result.score}</strong> 分 · 安全知识{result.safetyPassed ? '全部正确' : '仍有错误'}</p><p>{result.passed ? '已获得平台实操考核资格。现场上机仍须教师确认。' : `本次须达到 ${result.rules.totalPass} 分${result.rules.safetyAll ? '，且安全知识全部正确' : ''}。本次记录已保存，重考不会覆盖。`}</p>{!result.passed && <div><h3>建议重点补学</h3><ul>{result.details.filter(q => !q.correct).map(q => <li key={q.id}>{q.topic} <span className="muted">· {q.category}</span></li>)}</ul></div>}<div className="row"><button className="button" onClick={() => onNavigate(result.passed ? 'practical' : 'tutor')}>{result.passed ? '前往实操考核' : '前往辅导补学'}</button><button className="button secondary" onClick={restart}>再次考核</button><button className="button ghost" onClick={() => onNavigate('records')}>查看历次记录</button></div></div> : !started ? <div className="panel stack"><span className="pill">考前说明</span><h2>准备好，检验你的学习成果</h2><p>每道题 20 分；题目顺序随机。本次只测试安全认知、任务理解与学习流程。</p><p>正式试题须经教师审核。当前不强制完成待配置视频，以便体验完整学习流程。</p><div><button className="button" onClick={() => setStarted(true)}>开始示例考核</button></div></div> : <form onSubmit={submit} className="stack">{order.map((q,i) => <fieldset className="panel question-card" key={q.id}><legend className="pill">第 {i + 1} 题 · {q.category}</legend><h3>{q.prompt}</h3><div className="stack">{q.options.map((option,j) => <label className={`answer-option ${answers[q.id] === String(j) ? 'selected' : ''}`} key={option}><input type="radio" name={q.id} value={j} required checked={answers[q.id] === String(j)} onChange={e => setAnswers(a => ({...a,[q.id]:e.target.value}))} /><span>{String.fromCharCode(65+j)}. {option}</span></label>)}</div></fieldset>)}<div className="panel row"><p className="muted">已作答 {Object.keys(answers).length} / {order.length} 题</p><button className="button" type="submit" disabled={Object.keys(answers).length !== order.length}>提交答卷</button></div></form>}</>;
}

function PracticalView({ record, rules, update, onNavigate }) {
  const passed = record.attempts.some(a => a.passed);
  const [files, setFiles] = useState([]), [notes, setNotes] = useState(''), [measurements, setMeasurements] = useState(''), [submitted, setSubmitted] = useState(false);
  const latest = record.submissions.at(-1);
  function submit(event) { event.preventDefault(); update(r => ({...r,submissions:[...r.submissions,{id:uid(),at:stamp(),files,notes,measurements,status:'待教师评价'}]})); setSubmitted(true); }
  return <><Heading kicker="04 / PRACTICAL ASSESSMENT" title="实操考核">完成加工任务，提交你的实践成果。</Heading><DemoNote>实操任务与评分表示例 · 现场操作须经教师确认。最终评分、评语与通过结论由教师决定。</DemoNote>{!passed ? <div className="panel empty-state"><span className="pill">暂未解锁</span><h2>先完成理论考核</h2><p>达到总分要求，并满足安全知识规则后，即可获得平台实操考核资格。</p><button className="button" onClick={() => onNavigate('theory')}>前往理论考核</button></div> : <div className="two-column"><div className="panel stack"><span className="pill">数控车 · 示例任务</span><h2>实训任务与提交要求</h2><p>{rules.task}</p><h3>教师评价维度</h3><div className="file-list">{['操作规范','工艺执行','安全习惯','成品质量'].map(x => <span className="pill" key={x}>{x}</span>)}</div><p className="muted">图纸、正式加工对象与评分细则待教师发布。本页不提供可直接上机的工艺参数。</p>{latest && <div className="info-banner"><strong>最近一次提交：{latest.status}</strong><p>{date(latest.at)}</p>{latest.review && <><p>教师评分：{latest.review.score} 分</p><p>评语：{latest.review.comment}</p></>}</div>}</div><form className="panel stack" onSubmit={submit}><h3>提交实训材料</h3><label className="field">程序、照片或过程记录<input className="input" type="file" multiple accept=".nc,.txt,.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={e => setFiles(Array.from(e.target.files || []).map(f => ({name:f.name,type:f.type,size:f.size})))} required /></label><small className="muted">本演示只记录文件名、类型与大小，不上传或保留文件正文。教师无法在此打开原文件；正式交付需接入文件存储。</small>{files.length > 0 && <ul className="file-list">{files.map((f,i) => <li key={i}>{f.name} · {Math.ceil(f.size/1024)} KB</li>)}</ul>}<label className="field">测量数据<textarea className="textarea" rows={3} value={measurements} onChange={e => setMeasurements(e.target.value)} placeholder="填写实际测量结果，并注明测量项目与单位" required /></label><label className="field">过程记录与自查说明<textarea className="textarea" rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="记录完成情况、发现的问题与需要教师确认的事项" required /></label><button className="button" type="submit">提交材料信息</button>{submitted && <div className="result-banner success" role="status">材料信息已记录，等待教师评价。再次提交会保留本次历史。</div>}</form></div>}</>;
}

function RecordsView({ profile, trade, record, onNavigate }) {
  const summary = getSummary(profile, trade);
  const events = [...record.attempts.map(a => ({id:a.id,at:a.at,title:`理论考核 · ${a.score} 分`,detail:`${a.passed ? '通过' : '未通过'} · 安全知识${a.safetyPassed ? '全部正确' : '有待巩固'}`})),...record.submissions.map(s => ({id:s.id,at:s.at,title:`实操材料 · ${s.status}`,detail:`${s.files.length} 份文件信息${s.review ? ` · ${s.review.score} 分 · ${s.review.comment}` : ''}`})),...record.tutoring.map(t => ({id:t.id,at:t.at,title:'辅导学习',detail:t.query})),...record.practice.map(p => ({id:p.id,at:p.at,title:`巩固练习 · ${p.correct ? '正确' : '需补学'}`,detail:p.topic}))].sort((a,b) => b.at.localeCompare(a.at));
  return <><Heading kicker="LEARNING RECORDS" title="学习记录">{profile.name} · {profile.major} · {profile.className} · {trade.name}</Heading><DemoNote>记录按“学生—工种—模块”分别保存在当前浏览器。所有考核与提交历史保留；本地记录不作为正式成绩。</DemoNote><div className="stat-grid"><div className="stat"><span>视频完成</span><strong>{summary.videoCompleted} / {summary.videoTotal}</strong></div><div className="stat"><span>辅导与练习</span><strong>{record.tutoring.length+record.practice.length} <small>次</small></strong></div><div className="stat"><span>理论考核</span><strong style={{fontSize:24}}>{summary.examPassed ? '已通过' : '待完成'}</strong></div><div className="stat"><span>实操状态</span><strong style={{fontSize:24}}>{summary.practicalStatus}</strong></div></div><div className="panel"><h3>视频学习明细</h3>{lessons.map(lesson => { const v = record.videos[lesson.id]; return <div className="record-row" key={lesson.id}><div><strong>{lesson.title}</strong><p className="muted">{v?.filename || '尚未载入本地视频'} · 实际观看 {Math.round(v?.watchedSeconds || 0)} 秒 · 继续位置 {Math.round(v?.position || 0)} 秒</p></div><span className="pill">{v?.completed ? '观看完成' : '未完成'}</span></div>; })}</div><div className="panel"><div className="row"><h3>学习历程</h3><button className="button secondary" onClick={() => downloadRecords(profile,trade)}>导出本地记录</button></div>{events.length ? events.map(e => <div className="record-row" key={e.id}><div><strong>{e.title}</strong><p className="muted">{e.detail}</p></div><time className="muted">{date(e.at)}</time></div>) : <div className="empty-state"><h2>你的学习旅程即将开始</h2><p>完成辅导、练习或考核后，会在这里留下记录。</p><button className="button" onClick={() => onNavigate('video')}>开始学习</button></div>}</div></>;
}

function KnowledgeView() {
  const [search, setSearch] = useState('');
  const items = knowledge.filter(k => `${k.title}${k.content}${k.tags.join('')}`.includes(search));
  return <><Heading kicker="KNOWLEDGE LIBRARY" title="知识库">按章节理解，带着依据学习。</Heading><DemoNote>当前仅包含数控车示例资料 v0.1，尚未经课程教师审核，不含正式考试答案。</DemoNote><div className="panel stack"><input className="input" placeholder="搜索安全、程序、图纸或考核…" aria-label="搜索知识库" value={search} onChange={e => setSearch(e.target.value)} /><p className="muted">找到 {items.length} 条资料 · 适用范围：学习流程与基础认知</p>{items.map(k => <article className="question-card" key={k.id}><span className="pill">{k.chapter}</span><h3>{k.title}</h3><p>{k.content}</p><small className="muted">来源：{k.source} · 状态：待教师审核</small></article>)}{!items.length && <div className="empty-state">没有找到相关示例资料，请更换关键词或咨询教师。</div>}</div></>;
}

function CenterView({ record, onNavigate }) {
  const modules = [['video','01','视频学习',`${Object.values(record.videos).filter(v => v.completed).length} / ${lessons.length} 节本地观看完成`],['tutor','02','辅导学习',`${record.tutoring.length} 次辅导 · ${record.practice.length} 次练习`],['theory','03','理论考核',record.attempts.some(a => a.passed) ? '已通过 · 实操资格已解锁' : '待完成示例考核'],['practical','04','实操考核',record.submissions.at(-1)?.status || '尚未提交材料']];
  return <><Heading kicker="LEARNING CENTER" title="学习中心">四个阶段，一条完整的实训学习路径。</Heading><DemoNote /><div className="stack">{modules.map(([id,no,title,status]) => <div className="panel row" key={id}><span className="pill">{no}</span><div style={{flex:1}}><h3>{title}</h3><p className="muted">{status}</p></div><button className="button secondary" onClick={() => onNavigate(id)}>进入学习</button></div>)}</div></>;
}

function TeacherView({ profile, trade, record, rules, update, onRules }) {
  const [threshold, setThreshold] = useState(rules.totalPass), [safetyAll, setSafetyAll] = useState(rules.safetyAll), [task, setTask] = useState(rules.task), [saved, setSaved] = useState(false);
  const [score, setScore] = useState(''), [comment, setComment] = useState(''), [decision, setDecision] = useState('通过');
  const latest = record.submissions.at(-1);
  function save(event) { event.preventDefault(); onRules({totalPass:Number(threshold),safetyAll,task}); setSaved(true); }
  function review(event) { event.preventDefault(); update(r => ({...r,submissions:r.submissions.map(s => s.id === latest.id ? {...s,status:decision,review:{score:Number(score),comment,at:stamp()}} : s)})); }
  return <><Heading kicker="TEACHER WORKSPACE" title="教师工作台">配置考核规则，查看教学过程。</Heading><DemoNote>教师端交互演示，没有真实身份认证或权限控制。当前仅展示演示学生 {profile.name} 的本地记录，不可用于正式评价。</DemoNote><div className="two-column"><form className="panel stack" onSubmit={save}><h3>{trade.name} · 示例考核配置</h3><label className="field">理论总分合格线<input className="input" type="number" min="0" max="100" value={threshold} onChange={e => { setThreshold(e.target.value); setSaved(false); }} required /></label><label className="answer-option"><input type="checkbox" checked={safetyAll} onChange={e => {setSafetyAll(e.target.checked);setSaved(false);}} />安全类试题须全部正确</label><label className="field">实操任务说明<textarea className="textarea" rows={6} value={task} onChange={e => {setTask(e.target.value);setSaved(false);}} required /></label><button className="button" type="submit">保存演示配置</button>{saved && <p className="result-banner success" role="status">已保存。新规则用于后续考核，历次记录保留原规则。</p>}<small className="muted">视频资源、正式题库、图纸及评分表待课程资料与后台管理接入。</small></form><div className="panel stack"><h3>实操评价 · 当前演示学生</h3>{latest ? <><div className="info-banner">{date(latest.at)} · {latest.status}<p>{latest.files.map(f => f.name).join('、')}</p></div><p><strong>测量数据：</strong>{latest.measurements}</p><p><strong>过程记录：</strong>{latest.notes}</p><small className="muted">当前只保存附件信息，未保存原文件，不能根据此页确认加工质量。请结合现场表现与正式材料评价。</small>{latest.review ? <div className="result-banner success">已评价：{latest.review.score} 分 · {latest.status}<p>{latest.review.comment}</p></div> : <form className="stack" onSubmit={review}><label className="field">评分（0—100）<input className="input" type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value)} required /></label><label className="field">教师评语<textarea className="textarea" rows={3} value={comment} onChange={e => setComment(e.target.value)} required /></label><label className="field">最终结论<select className="input" value={decision} onChange={e => setDecision(e.target.value)}><option>通过</option><option>需补交材料</option><option>未通过</option></select></label><button className="button" type="submit">记录示例评价</button></form>}</> : <div className="empty-state"><p>当前还没有实操提交记录</p><small>学生完成理论考核并提交后，可在这里体验评价。</small></div>}</div></div></>;
}
