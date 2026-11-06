import { useEffect, useState } from 'react';
import { ArrowRight, PlayCircle, ShieldCheck, LockSimple, CheckCircle, FileText, Code, ChatsCircle, ClipboardText } from '@phosphor-icons/react';
import { getSummary, loadRecord, lessons } from './learning-data.js';

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

  const summary = getSummary(profile, trade);
  const record = loadRecord(profile, trade);
  const tutoringCount = record.tutoring.length + record.practice.length;
  const hasActivity = Object.keys(record.videos).length > 0 || tutoringCount > 0 || summary.attempts > 0 || record.submissions.length > 0;
  const nextLesson = lessons.find(lesson => !record.videos[lesson.id]?.completed) || lessons[0];
  let nextTask = {
    view: 'video',
    label: hasActivity ? '继续你的学习' : '建议从这里开始',
    title: nextLesson.title,
    note: '先阅读课程导读；正式教学视频待教师配置。',
    icon: PlayCircle,
  };
  if (summary.examPassed) {
    nextTask = record.submissions.length
      ? { view: 'records', label: '查看你的实训进展', title: `实操材料 · ${summary.practicalStatus}`, note: '查看提交记录与教师评价，继续完善实训成果。', icon: ClipboardText }
      : { view: 'practical', label: '下一步学习任务', title: '准备实操任务与提交材料', note: '理论资格已解锁，现场操作仍须教师确认。', icon: ClipboardText };
  } else if (summary.attempts > 0) {
    nextTask = { view: 'tutor', label: '建议先完成补学', title: '回看薄弱知识点，准备再次考核', note: '结合上次考核结果，在辅导学习中巩固理解。', icon: ChatsCircle };
  } else if (summary.videoCompleted === summary.videoTotal) {
    nextTask = tutoringCount > 0
      ? { view: 'theory', label: '下一步学习任务', title: '检验你的理论理解', note: '当前为示例考核，合格规则与正式题库由教师配置。', icon: ClipboardText }
      : { view: 'tutor', label: '下一步学习任务', title: '从问题出发，理解工艺与程序', note: '通过示例知识讲解与练习，为考核做好准备。', icon: ChatsCircle };
  }
  const NextTaskIcon = nextTask.icon;
  const path = [
    { id: 'video', index: '01', title: '视频学习', description: ['观看工艺视频', '建立设备与操作认知'], image: 'video', status: summary.videoCompleted > 0 ? `${summary.videoCompleted} / ${summary.videoTotal} 节本地观看完成` : '课程视频待配置', action: '进入学习', complete: summary.videoCompleted === summary.videoTotal },
    { id: 'tutor', index: '02', title: '辅导学习', description: ['理解工艺知识', '学习程序与典型案例'], image: 'tutor', status: tutoringCount > 0 ? `已记录 ${tutoringCount} 次辅导与练习` : '从一个问题开始', action: '进入辅导' },
    { id: 'theory', index: '03', title: '理论考核', description: ['检验安全与工艺理论', '为实操做好准备'], image: 'exam', status: summary.examPassed ? '已通过理论考核' : summary.attempts > 0 ? `已完成 ${summary.attempts} 次示例考核` : '尚未完成示例考核', action: summary.examPassed ? '查看考核' : '开始考核', complete: summary.examPassed },
    { id: 'practical', index: '04', title: '实操考核', description: ['完成现场实训任务', '提交材料，等待教师评价'], image: 'practical', status: summary.examPassed ? summary.practicalStatus : '通过理论考核后解锁', action: '查看任务', locked: !summary.examPassed, complete: summary.practicalStatus === '通过' },
  ];

  return (
    <div className="home-dashboard">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">实训学习空间</span>
          <h1>{trade.name}实训工作台</h1>
          <p>从课前准备到实践评价，按阶段完成本次实训。</p>
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
        <div className="section-heading"><div><h2 id="learning-path-title">四步完成实训学习</h2><p>依次理解、练习与检验，让每一步都有方向。</p></div><span className="pill path-overview-label">{profile.className}</span></div>
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
