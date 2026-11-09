import { useEffect, useState } from 'react';
import { ArrowRight, PlayCircle, ShieldCheck, LockSimple, CheckCircle, FileText, Code, ChatsCircle, ClipboardText } from '@phosphor-icons/react';
import { getCoursePath, loadRecord, lessons } from './learning-data.js';

const preparationItems = [
  { title: '先确认安全规范', text: '阅读现场规程，上机前取得教师许可。', icon: ShieldCheck },
  { title: '读懂任务与图纸', text: '明确加工要求、提交材料和评价标准。', icon: FileText },
  { title: '核对程序适用条件', text: '结合控制系统、刀具和坐标理解程序。', icon: Code },
];

export function HomeDashboard({ profile, trade, onBegin, onNavigate }) {
  const [, refresh] = useState(0);
  useEffect(() => {
    const update = () => refresh(value => value + 1);
    window.addEventListener('learning-updated', update);
    return () => window.removeEventListener('learning-updated', update);
  }, []);

  const record = loadRecord(profile, trade);
  const path = getCoursePath(record);
  const hasActivity = Boolean(record.preAssessment || Object.keys(record.videos).length || record.attempts.length);
  const nextLesson = lessons.find(lesson => !record.videos[lesson.id]?.completed) || lessons[0];
  let nextTask = {
    view: 'video',
    label: hasActivity ? '继续你的学习' : '建议从这里开始',
    title: nextLesson.title,
    note: '可以观看视频、阅读课程章节，再到题库刷题。',
    icon: PlayCircle,
  };
  if (path[1].complete) {
    nextTask = record.submissions.length
      ? { view: 'feedback', label: '课程回顾', title: '按需复习并分享课程反馈', note: '查看推荐内容，记录学习心得或给课程提建议。', icon: ChatsCircle }
      : { view: 'practical', label: '下一步学习任务', title: '准备实操任务与提交材料', note: '理论资格已解锁，现场操作仍须教师确认。', icon: ClipboardText };
  } else if (record.attempts.length > 0) {
    nextTask = { view: 'tutor', label: '建议先完成补学', title: '回看相关章节，再到题库练习', note: '结合上次错题，复习安全与工艺知识。', icon: FileText };
  } else if (!record.preAssessment) {
    nextTask = { view: 'pre', label: '建议从这里开始', title: '先做素养测评，填写课前问卷', note: '记录你的学习基础和希望重点了解的内容。', icon: ClipboardText };
  } else if (Object.values(record.videos).filter(video => video.completed).length === lessons.length) {
    nextTask = { view: 'theory', label: '下一步学习任务', title: '到题库练习，检验理论知识', note: '查看答题结果和错题解析，达标后准备实操。', icon: ClipboardText };
  }
  const NextTaskIcon = nextTask.icon;

  return (
    <div className="home-dashboard">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">实训学习空间</span>
          <h1>{trade.name}实训工作台</h1>
          <p>从课前测评到课程反馈，按阶段完成本次实训。</p>
        </div>
        <button className="workspace-record-link" onClick={() => onNavigate('records')}>查看学习记录 <ArrowRight size={18} /></button>
      </div>

      <section className="course-overview" aria-label="课程概览与当前学习任务">
        <div className="course-intro">
          <span className="course-label">{trade.name} · 教学演示</span>
          <h2>把每一步实训，<br />学明白、做扎实。</h2>
          <p className="course-description">认识设备与安全要求，理解工艺和程序，再把所学带到实践中。</p>
          <div className="current-task">
            <span className="task-icon"><NextTaskIcon size={25} weight="duotone" /></span>
            <div className="task-copy">
              <span>{nextTask.label}</span>
              <strong>{nextTask.title}</strong>
              <p className="task-note">{nextTask.note}</p>
            </div>
          </div>
          <div className="course-actions">
            <button className="button" onClick={() => onBegin(nextTask.view)}>{hasActivity ? '继续学习' : '开始学习'} <ArrowRight size={18} /></button>
            <button className="course-secondary-action" onClick={() => onNavigate('center')}>了解学习路径 <ArrowRight size={16} /></button>
          </div>
        </div>
        <div className="equipment-panel">
          <div className="equipment-topline"><span>设备认知</span><span className="pill">数控车床</span></div>
          <div className="equipment-stage"><img src="/assets/cnc-lathe-workstation.png" alt="完整展示的数控车床教学设备示意" /></div>
          <p className="equipment-caption">设备示意图 · 非机床仿真</p>
        </div>
      </section>

      <section className="learning-path" id="learning-path" aria-labelledby="learning-path-title">
        <div className="section-heading"><div><h2 id="learning-path-title">四步完成实训学习</h2><p>先了解自己的基础，再学习、实操和回顾。</p></div><span className="pill path-overview-label">{profile.className}</span></div>
        <div className="path-grid">
          {path.map(step => (
            <button key={step.id} className={`path-card path-${step.id}`} onClick={() => onBegin(step.id)}>
              <div className="path-card-top"><span className="path-index">{step.index}</span><img src={`/assets/module-${step.image}.png`} alt="" /></div>
              <h3>{step.title}</h3>
              <p>{step.description[0]}<br />{step.description[1]}</p>
              <span className={`path-status${step.complete ? ' is-complete' : ''}${step.locked ? ' is-locked' : ''}`}>{step.complete ? <CheckCircle size={15} weight="fill" /> : step.locked ? <LockSimple size={15} /> : null}{step.status}</span>
              <span className="path-card-action">{step.action} <ArrowRight size={18} /></span>
            </button>
          ))}
        </div>
      </section>

      <section className="preparation-strip" aria-labelledby="preparation-title">
        <div className="preparation-heading"><h3 id="preparation-title"><ShieldCheck size={23} weight="duotone" />进入实训前，先做好准备</h3><button onClick={() => onNavigate('knowledge')}>查看学习资料 <ArrowRight size={16} /></button></div>
        <div className="preparation-items">{preparationItems.map(item => <div className="preparation-item" key={item.title}><span className="preparation-item-icon"><item.icon size={20} weight="duotone" /></span><div><strong>{item.title}</strong><p>{item.text}</p></div></div>)}</div>
      </section>
    </div>
  );
}
