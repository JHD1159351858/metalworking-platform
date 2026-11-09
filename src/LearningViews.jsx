import { useEffect, useState } from 'react';
import { lessons, knowledge, loadRecord, saveRecord, loadRules, saveRules, getSummary, getCoursePath, downloadRecords } from './learning-data';
import { Heading, DemoNote } from './LearningUI.jsx';
import { PreAssessmentView, CourseFeedbackView, TeacherCourseEvidence } from './CourseEvidence.jsx';
import { TheoryLearning } from './TheoryLearning.jsx';

const date = value => new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
const stamp = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
export function LearningView({ view, profile, trade, onNavigate }) {
  const [record, setRecord] = useState(() => loadRecord(profile, trade));
  const [rules, setRules] = useState(() => loadRules(trade));
  useEffect(() => {
    const refresh = () => setRecord(loadRecord(profile, trade));
    window.addEventListener('learning-updated', refresh);
    return () => window.removeEventListener('learning-updated', refresh);
  }, [profile, trade]);
  const update = fn => {
    const next = fn(loadRecord(profile, trade));
    saveRecord(profile, trade, next);
  };
  const props = { profile, trade, record, rules, update, onNavigate };
  let content;
  if (['video', 'tutor', 'theory'].includes(view)) content = <TheoryLearning {...props} view={view} />;
  else if (view === 'pre') content = <PreAssessmentView {...props} />;
  else if (view === 'feedback') content = <CourseFeedbackView {...props} />;
  else if (view === 'practical') content = <PracticalView {...props} />;
  else if (view === 'records') content = <RecordsView {...props} />;
  else if (view === 'knowledge') content = <KnowledgeView />;
  else if (view === 'teacher') content = <><TeacherView {...props} onRules={next => { saveRules(trade, next); setRules(next); }} /><TeacherCourseEvidence record={record} /></>;
  else content = <CenterView {...props} />;
  return <section className="view-panel" key={`${profile.id}-${trade.id}-${view}`}>{content}</section>;
}

function PracticalView({ record, rules, update, onNavigate }) {
  const passed = record.attempts.some(a => a.passed);
  const [files, setFiles] = useState([]), [notes, setNotes] = useState(''), [measurements, setMeasurements] = useState(''), [submitted, setSubmitted] = useState(false);
  const latest = record.submissions.at(-1);
  function submit(event) { event.preventDefault(); update(r => ({...r,submissions:[...r.submissions,{id:uid(),at:stamp(),files,notes,measurements,status:'待教师评价'}]})); setSubmitted(true); }
  return <><Heading kicker="03 / PRACTICAL ASSESSMENT" title="实操考核">完成加工任务，提交你的实践成果。</Heading><DemoNote>实操任务与评分表示例 · 现场操作须经教师确认。最终评分、评语与通过结论由教师决定。</DemoNote>{!passed ? <div className="panel empty-state"><span className="pill">暂未解锁</span><h2>先完成理论测评</h2><p>达到总分要求，并满足安全知识规则后，即可获得平台实操考核资格。</p><button className="button" onClick={() => onNavigate('theory')}>前往题库练习</button></div> : <div className="two-column"><div className="panel stack"><span className="pill">数控车 · 示例任务</span><h2>实训任务与提交要求</h2><p>{rules.task}</p><h3>教师评价维度</h3><div className="file-list">{['操作规范','工艺执行','安全习惯','成品质量'].map(x => <span className="pill" key={x}>{x}</span>)}</div><p className="muted">图纸、正式加工对象与评分细则待教师发布。本页不提供可直接上机的工艺参数。</p>{latest && <div className="info-banner"><strong>最近一次提交：{latest.status}</strong><p>{date(latest.at)}</p>{latest.review && <><p>教师评分：{latest.review.score} 分</p><p>评语：{latest.review.comment}</p></>}</div>}</div><form className="panel stack" onSubmit={submit}><h3>提交实训材料</h3><label className="field">程序、照片或过程记录<input className="input" type="file" multiple accept=".nc,.txt,.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={e => setFiles(Array.from(e.target.files || []).map(f => ({name:f.name,type:f.type,size:f.size})))} required /></label><small className="muted">本演示只记录文件名、类型与大小，不上传或保留文件正文。教师无法在此打开原文件；正式交付需接入文件存储。</small>{files.length > 0 && <ul className="file-list">{files.map((f,i) => <li key={i}>{f.name} · {Math.ceil(f.size/1024)} KB</li>)}</ul>}<label className="field">测量数据<textarea className="textarea" rows={3} value={measurements} onChange={e => setMeasurements(e.target.value)} placeholder="填写实际测量结果，并注明测量项目与单位" required /></label><label className="field">过程记录与自查说明<textarea className="textarea" rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="记录完成情况、发现的问题与需要教师确认的事项" required /></label><button className="button" type="submit">提交材料信息</button>{submitted && <div className="result-banner success" role="status">材料信息已记录，等待教师评价。再次提交会保留本次历史。</div>}{latest && <button className="button secondary" type="button" onClick={() => onNavigate('feedback')}>前往选学与课程反馈</button>}</form></div>}</>;
}

function RecordsView({ profile, trade, record, onNavigate }) {
  const summary = getSummary(profile, trade);
  const events = [
    ...(record.preAssessment ? [{ id: 'pre-assessment', at: record.preAssessment.at, title: '课前测评与调查问卷', detail: `素养测评 ${record.preAssessment.score} 分` }] : []),
    ...record.attempts.map(a => ({ id: a.id, at: a.at, title: `理论测评 · ${a.score} 分`, detail: `${a.passed ? '已达标' : '待巩固'} · 安全知识${a.safetyPassed ? '全部正确' : '有待巩固'}` })),
    ...record.submissions.map(s => ({ id: s.id, at: s.at, title: `实操材料 · ${s.status}`, detail: `${s.files.length} 份文件信息${s.review ? ` · ${s.review.score} 分 · ${s.review.comment}` : ''}` })),
    ...record.tutoring.map(t => ({ id: t.id, at: t.at, title: '伴学问答', detail: t.query })),
    ...record.practice.map(p => ({ id: p.id, at: p.at, title: `巩固练习 · ${p.correct ? '正确' : '需补学'}`, detail: p.topic })),
    ...record.feedback.map(f => ({ id: f.id, at: f.at, title: `课程反馈 · ${f.type}`, detail: f.text })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return <><Heading kicker="LEARNING RECORDS" title="学习记录">{profile.name} · {profile.major} · {profile.className} · {trade.name}</Heading><DemoNote>记录按“学生—工种—模块”分别保存在当前浏览器。所有考核与提交历史保留；本地记录不作为正式成绩。</DemoNote><div className="stat-grid"><div className="stat"><span>视频完成</span><strong>{summary.videoCompleted} / {summary.videoTotal}</strong></div><div className="stat"><span>伴学与练习</span><strong>{record.tutoring.length+record.practice.length} <small>次</small></strong></div><div className="stat"><span>理论测评</span><strong style={{fontSize:24}}>{summary.examPassed ? '已通过' : '待完成'}</strong></div><div className="stat"><span>实操状态</span><strong style={{fontSize:24}}>{summary.practicalStatus}</strong></div></div><div className="panel"><h3>视频学习明细</h3>{lessons.map(lesson => { const v = record.videos[lesson.id]; return <div className="record-row" key={lesson.id}><div><strong>{lesson.title}</strong><p className="muted">{v?.filename || '尚未载入本地视频'} · 实际观看 {Math.round(v?.watchedSeconds || 0)} 秒 · 继续位置 {Math.round(v?.position || 0)} 秒</p></div><span className="pill">{v?.completed ? '观看完成' : '未完成'}</span></div>; })}</div><div className="panel"><div className="row"><h3>学习历程</h3><button className="button secondary" onClick={() => downloadRecords(profile,trade)}>导出本地记录</button></div>{events.length ? events.map(e => <div className="record-row" key={e.id}><div><strong>{e.title}</strong><p className="muted">{e.detail}</p></div><time className="muted">{date(e.at)}</time></div>) : <div className="empty-state"><h2>你的学习旅程即将开始</h2><p>填写课前问卷、完成练习或提交反馈后，会在这里留下记录。</p><button className="button" onClick={() => onNavigate('pre')}>开始学习</button></div>}</div></>;
}

function KnowledgeView() {
  const [search, setSearch] = useState('');
  const items = knowledge.filter(k => `${k.title}${k.content}${k.tags.join('')}`.includes(search));
  return <><Heading kicker="KNOWLEDGE LIBRARY" title="知识库">按章节理解，带着依据学习。</Heading><DemoNote>当前仅包含数控车示例资料 v0.1，尚未经课程教师审核，不含正式考试答案。</DemoNote><div className="panel stack"><input className="input" placeholder="搜索安全、程序、图纸或考核…" aria-label="搜索知识库" value={search} onChange={e => setSearch(e.target.value)} /><p className="muted">找到 {items.length} 条资料 · 适用范围：学习流程与基础认知</p>{items.map(k => <article className="question-card" key={k.id}><span className="pill">{k.chapter}</span><h3>{k.title}</h3><p>{k.content}</p><small className="muted">来源：{k.source} · 状态：待教师审核</small></article>)}{!items.length && <div className="empty-state">没有找到相关示例资料，请更换关键词或咨询教师。</div>}</div></>;
}

function CenterView({ record, onNavigate }) {
  return <>
    <Heading kicker="LEARNING CENTER" title="学习中心">从课前测评到实操和课程反馈。</Heading>
    <DemoNote />
    <div className="stack">
      {getCoursePath(record).map(step => <div className="panel row" key={step.id}>
        <span className="pill">{step.index}</span>
        <div style={{ flex: 1 }}><h3>{step.title}</h3><p className="muted">{step.status}</p></div>
        <button className="button secondary" onClick={() => onNavigate(step.id)}>{step.action}</button>
      </div>)}
    </div>
  </>;
}

function TeacherView({ profile, trade, record, rules, update, onRules }) {
  const [threshold, setThreshold] = useState(rules.totalPass), [safetyAll, setSafetyAll] = useState(rules.safetyAll), [task, setTask] = useState(rules.task), [saved, setSaved] = useState(false);
  const [score, setScore] = useState(''), [comment, setComment] = useState(''), [decision, setDecision] = useState('通过');
  const latest = record.submissions.at(-1);
  function save(event) { event.preventDefault(); onRules({totalPass:Number(threshold),safetyAll,task}); setSaved(true); }
  function review(event) { event.preventDefault(); update(r => ({...r,submissions:r.submissions.map(s => s.id === latest.id ? {...s,status:decision,review:{score:Number(score),comment,at:stamp()}} : s)})); }
  return <><Heading kicker="TEACHER WORKSPACE" title="教师工作台">配置考核规则，查看教学过程。</Heading><DemoNote>教师端交互演示，没有真实身份认证或权限控制。当前仅展示演示学生 {profile.name} 的本地记录，不可用于正式评价。</DemoNote><div className="two-column"><form className="panel stack" onSubmit={save}><h3>{trade.name} · 示例考核配置</h3><label className="field">理论测评合格线<input className="input" type="number" min="0" max="100" value={threshold} onChange={e => { setThreshold(e.target.value); setSaved(false); }} required /></label><label className="answer-option"><input type="checkbox" checked={safetyAll} onChange={e => {setSafetyAll(e.target.checked);setSaved(false);}} />安全类试题须全部正确</label><label className="field">实操任务说明<textarea className="textarea" rows={6} value={task} onChange={e => {setTask(e.target.value);setSaved(false);}} required /></label><button className="button" type="submit">保存演示配置</button>{saved && <p className="result-banner success" role="status">已保存。新规则用于后续考核，历次记录保留原规则。</p>}<small className="muted">视频资源、正式题库、图纸及评分表待课程资料与后台管理接入。</small></form><div className="panel stack"><h3>实操评价 · 当前演示学生</h3>{latest ? <><div className="info-banner">{date(latest.at)} · {latest.status}<p>{latest.files.map(f => f.name).join('、')}</p></div><p><strong>测量数据：</strong>{latest.measurements}</p><p><strong>过程记录：</strong>{latest.notes}</p><small className="muted">当前只保存附件信息，未保存原文件，不能根据此页确认加工质量。请结合现场表现与正式材料评价。</small>{latest.review ? <div className="result-banner success">已评价：{latest.review.score} 分 · {latest.status}<p>{latest.review.comment}</p></div> : <form className="stack" onSubmit={review}><label className="field">评分（0—100）<input className="input" type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value)} required /></label><label className="field">教师评语<textarea className="textarea" rows={3} value={comment} onChange={e => setComment(e.target.value)} required /></label><label className="field">最终结论<select className="input" value={decision} onChange={e => setDecision(e.target.value)}><option>通过</option><option>需补交材料</option><option>未通过</option></select></label><button className="button" type="submit">记录示例评价</button></form>}</> : <div className="empty-state"><p>当前还没有实操提交记录</p><small>学生理论测评达标并提交后，可在这里体验评价。</small></div>}</div></div></>;
}
