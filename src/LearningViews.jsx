import { useEffect, useState } from 'react';
import { lessonsForTrade, knowledge, loadRecord, saveRecord, loadRules, getSummary, downloadRecords } from './learning-data';
import { unitLabel, feedbackLabel } from './cnc-course.js';
import { Heading } from './LearningUI.jsx';
import { PreAssessmentView, CourseFeedbackView, TeacherCourseEvidence } from './CourseEvidence.jsx';
import { PracticalView, TeacherPracticalReview } from './PracticalCourse.jsx';
export { TeacherCourseSettings } from './PracticalCourse.jsx';
import { TheoryLearning } from './TheoryLearning.jsx';
import { PracticeLibrary } from './PracticeLibrary.jsx';
import { WeldingView } from './WeldingView.jsx';
import { LearningCenter } from './LearningCenter.jsx';
import { MistakeNotebook } from './MistakeNotebook.jsx';

const date = value => new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
export function LearningView({ view, profile, trade, onNavigate, evidence, target, onContextChange }) {
  const [localRecord, setRecord] = useState(() => loadRecord(profile, trade));
  const [rules] = useState(() => loadRules(trade));
  useEffect(() => {
    const refresh = () => setRecord(loadRecord(profile, trade));
    window.addEventListener('learning-updated', refresh);
    return () => window.removeEventListener('learning-updated', refresh);
  }, [profile, trade]);
  const update = fn => {
    const next = fn(loadRecord(profile, trade));
    saveRecord(profile, trade, next);
  };
  const record = { ...localRecord, ...evidence?.data };
  const props = { profile, trade, record, rules, update, onNavigate, evidence, target, onContextChange };
  let content;
  if (trade.id === 'welding' && ['video', 'tutor', 'theory', 'practical', 'feedback', 'knowledge'].includes(view)) content = <WeldingView {...props} view={view} />;
  else if (['video', 'tutor', 'theory'].includes(view)) content = <TheoryLearning {...props} view={view} target={target} />;
  else if (view === 'pre') content = record.preAssessment ? <PreAssessmentView {...props} />
    : <><Heading title="课前测评">填写进度会自动保留，可以随时继续。</Heading><button className="button" onClick={() => onNavigate('pre')}>继续填写课前测评</button></>;
  else if (view === 'feedback') content = <CourseFeedbackView {...props} />;
  else if (view === 'practical') content = <PracticalView {...props} />;
  else if (view === 'records') content = <RecordsView {...props} />;
  else if (view === 'knowledge') content = <KnowledgeView onNavigate={onNavigate} initialChapter={target?.chapterId} />;
  else if (view === 'teacher') content = <><TeacherPracticalReview {...props} /><TeacherCourseEvidence trade={trade} record={record} /></>;
  else content = <LearningCenter {...props} />;
  return <section className="view-panel" key={`${profile.id}-${trade.id}-${view}`}>{content}</section>;
}

function RecordsView(props) {
  const { profile, trade, target } = props;
  const [section, setSection] = useState(target?.section === 'mistakes' ? 'mistakes' : 'overview');
  return <>
    <Heading title="学习记录">{profile.name} · {profile.major} · {profile.className} · {trade.name}</Heading>
    <nav className="tab-bar" aria-label="学习记录分类">
      {[['overview', '学习概览'], ['mistakes', '错题本']].map(([id, label]) =>
        <button type="button" key={id} className={section === id ? 'tab active' : 'tab'} aria-pressed={section === id} onClick={() => setSection(id)}>{label}</button>)}
    </nav>
    {section === 'mistakes' ? <MistakeNotebook {...props} /> : <RecordsOverview {...props} />}
  </>;
}

function RecordsOverview({ profile, trade, record, onNavigate }) {
  const summary = getSummary(profile, trade);
  const events = [
    ...(record.casePractice || []).map(item => ({ id: item.id, at: item.at, title: `${unitLabel(item.chapterId)} · ${item.topic}`, detail: item.correct ? (item.assisted ? '在提示下完成' : item.transfer ? '换题独立答对' : '独立答对') : '需要再练' })),
    ...(record.preAssessment ? [{ id: 'pre-assessment', at: record.preAssessment.at, title: '课前测评与调查问卷', detail: `素养测评 ${record.preAssessment.score} 分` }] : []),
    ...record.attempts.map(a => ({ id: a.id, at: a.at, title: `理论测评 · ${a.score} 分`, detail: `${a.passed ? '已达标' : '待巩固'} · 安全知识${a.safetyPassed ? '全部正确' : '有待巩固'}` })),
    ...record.submissions.map(s => ({ id: s.id, at: s.at, title: `实操材料 · ${s.status}`,
      detail: [`${s.files.length} 份附件信息`, Number.isFinite(s.review?.score) ? `${s.review.score} 分` : null, s.review?.comment].filter(Boolean).join(' · ') })),
    ...record.tutoring.map(t => ({ id: t.id, at: t.at, title: '伴学问答', detail: t.query })),
    ...record.practice.map(p => ({ id: p.id, at: p.at, title: `巩固练习 · ${p.correct ? '正确' : '需补学'}`, detail: p.topic })),
    ...record.feedback.map(f => ({ id: f.id, at: f.at, title: `课程反馈 · ${f.type}`, detail: feedbackLabel(f.text) })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return <><div className="stat-grid"><div className="stat"><span>视频完成</span><strong>{summary.videoCompleted} / {summary.videoTotal}</strong></div><div className="stat"><span>伴学与练习</span><strong>{record.tutoring.length + record.practice.length + (record.casePractice?.length || 0)} <small>次</small></strong></div><div className="stat"><span>理论测评</span><strong style={{fontSize:24}}>{summary.examPassed ? '已通过' : '待完成'}</strong></div><div className="stat"><span>实操状态</span><strong style={{fontSize:24}}>{summary.practicalStatus}</strong></div></div><div className="panel"><h3>视频学习明细</h3>{lessonsForTrade(trade).map(lesson => { const v = record.videos[lesson.id]; return <div className="record-row" key={lesson.id}><div><strong>{lesson.title}</strong><p className="muted">{v?.filename || (lesson.src ? '课程视频' : '尚未载入本地视频')} · 实际观看 {Math.round(v?.watchedSeconds || 0)} 秒 · 继续位置 {Math.round(v?.position || 0)} 秒</p></div><span className="pill">{v?.completed ? '观看完成' : '未完成'}</span></div>; })}</div><div className="panel"><div className="row"><h3>学习历程</h3><button className="button secondary" onClick={() => downloadRecords(profile, trade, record)}>导出学习记录</button></div>{events.length ? events.map(e => <div className="record-row" key={e.id}><div><strong>{e.title}</strong><p className="muted">{e.detail}</p></div><time className="muted">{date(e.at)}</time></div>) : <div className="empty-state"><h2>你的学习旅程即将开始</h2><p>填写课前问卷、完成练习或提交反馈后，会在这里留下记录。</p><button className="button" onClick={() => onNavigate('pre')}>开始学习</button></div>}</div></>;
}

function KnowledgeView({ onNavigate, initialChapter }) {
  const [tab, setTab] = useState(initialChapter ? 'banks' : 'materials');
  const [search, setSearch] = useState('');
  const items = knowledge.filter(k => `${k.title}${k.content}${k.tags.join('')}`.includes(search));
  return <>
    <Heading title="知识库" />
    <nav className="tab-bar" aria-label="知识库分类">
      {[['materials', '知识资料'], ['banks', '章节题库']].map(([id, label]) =>
        <button type="button" key={id} className={tab === id ? 'tab active' : 'tab'} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}
    </nav>
    {tab === 'banks' ? <PracticeLibrary onNavigate={onNavigate} initialChapter={initialChapter} /> : <div className="panel stack"><input className="input" placeholder="搜索安全、程序、图纸或考核…" aria-label="搜索知识库" value={search} onChange={e => setSearch(e.target.value)} /><p className="muted">找到 {items.length} 条资料</p>{items.map(k => <article className="question-card" key={k.id}><span className="pill">{k.chapter}</span><h3>{k.title}</h3><p>{k.content}</p><details className="source-note"><summary>资料出处</summary><p>{k.source} · 待教师审核</p></details></article>)}{!items.length && <div className="empty-state">没有找到相关示例资料，请更换关键词或咨询教师。</div>}</div>}
  </>;
}

