import { useState } from 'react';
import { ArrowClockwise, ArrowRight, ChalkboardTeacher, ChartBar, ClipboardText, Gauge, SignOut, Users, ChatCircleText } from '@phosphor-icons/react';
import { lessons } from './learning-data.js';
import { coordinateClassSummary } from './course-recommendations.js';
import { cncChapters, unitLabel, feedbackLabel } from './cnc-course.js';
import './teacher-dashboard.css';

const noStudents = [];
const noClass = '未分班';
const focusOptions = ['设备认知', '实训安全', '图纸与工艺', '程序理解', '题库练习'];

function proportion(count, total) {
  return total ? Math.round((count / total) * 100) : 0;
}

function BarChart({ title, rows, total, unit, description }) {
  return <section className="teacher-chart">
    <h2>{title}</h2>
    <p>{description}</p>
    <ul className="teacher-bars">
      {rows.map(({ label, count }) => <li key={label}>
        <div><span>{label}</span><span>{count} <small>{unit}</small></span></div>
        <span className="teacher-bar-track" aria-hidden="true"><span style={{ width: `${proportion(count, total)}%` }} /></span>
      </li>)}
    </ul>
  </section>;
}

function ClassFeedback({ students }) {
  const [chapter, setChapter] = useState('');
  const entries = students.flatMap(({ profile, record }) => (record.feedback || []).map(entry => ({ ...entry, student: profile.name })));
  if (!entries.length) return null;
  const matches = entries.filter(entry => !chapter || entry.text.startsWith('【第 ' + chapter + ' 节】'))
    .sort((a,b) => String(b.at).localeCompare(String(a.at)));
  return <details className="teacher-settings">
    <summary>按章节查看班级反馈 · {entries.length} 条</summary>
    <div className="panel stack"><label className="field">反馈范围<select className="input" value={chapter} onChange={e => setChapter(e.target.value)}>
      <option value="">全部反馈</option>{cncChapters.map(ch => <option key={ch.id} value={ch.id}>{unitLabel(ch.id)} · {ch.title}</option>)}
    </select></label>
    {matches.length ? matches.map(entry => <article key={entry.id} className="record-row"><div><strong>{entry.student} · {entry.type}</strong>
      <p className="evidence-text">{feedbackLabel(entry.text)}</p></div></article>) : <p>本节还没有课程反馈。</p>}
    </div>
  </details>;
}

function TeacherOverview({ students, cloud }) {
  const submitted = students.filter(student => student.record.preAssessment);
  const scores = submitted.map(student => student.record.preAssessment.score).filter(Number.isFinite);
  const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : '—';
  const respondents = students.filter(student => student.record.feedback?.length).length;
  const coordinates = !cloud && coordinateClassSummary(students);
  const feedbackCount = students.reduce((total, student) => total + (student.record.feedback?.length || 0), 0);
  const progress = [
    { label: '课前测评已提交', count: submitted.length },
    ...(!cloud ? [
      { label: '理论测评已达标', count: students.filter(student => student.record.attempts?.some(attempt => attempt.passed)).length },
      { label: '已提交实操考核', count: students.filter(student => student.record.submissions?.length).length },
    ] : []),
    { label: '已反馈课程', count: respondents },
  ];
  const topics = focusOptions.map(label => ({
    label, count: submitted.filter(student => student.record.preAssessment.focus === label).length,
  }));
  const cards = [
    { label: '学生人数', value: students.length, unit: '人', note: '当前班级范围', icon: Users },
    { label: '课前测评已提交', value: submitted.length, unit: '人', note: `提交率 ${proportion(submitted.length, students.length)}%`, icon: ClipboardText },
    { label: '课前测评平均分', value: average, unit: scores.length ? '分' : '', note: scores.length ? `统计 ${scores.length} 份有效成绩` : '暂无成绩', icon: Gauge },
    { label: '参与课程反馈', value: respondents, unit: '人', note: `共 ${feedbackCount} 条反馈`, icon: ChatCircleText },
  ];
  return <>
    <dl className="teacher-metrics">
      {cards.map(({ label, value, unit, note, icon: Icon }) => <div className="teacher-metric" key={label}>
        <dt><Icon size={18} aria-hidden="true" />{label}</dt>
        <dd><strong>{value}</strong>{unit && <span>{unit}</span>}</dd>
        <small>{note}</small>
      </div>)}
    </dl>
    <div className="teacher-charts">
      <BarChart title={cloud ? '提交进度' : '四阶段进度'} rows={progress} total={students.length} unit="人"
        description={`以当前范围的 ${students.length} 名学生为基数`} />
      <BarChart title="问卷关注点" rows={topics} total={submitted.length} unit="人"
        description={submitted.length ? `来自 ${submitted.length} 份已提交的课前问卷` : '收到课前问卷后显示分布'} />
      {coordinates && <BarChart title="坐标读图" unit="人" total={students.length}
        description={`按学生人数统计 · 已练 ${coordinates.participated} 人，未练 ${students.length - coordinates.participated} 人`}
        rows={[{ label: '首次错在零点', count: coordinates.missedOrigin }, { label: '最近一次独立换图答错', count: coordinates.stillMissed },
          { label: '最近一次独立换图答对', count: coordinates.independent }]} />}
    </div>
  </>;
}

function RosterTable({ students, cloud, selectedId, onSelect }) {
  return <div className="teacher-table-scroll">
    <table className="teacher-table">
      <caption className="teacher-sr-only">当前筛选范围内的学生与学习进度</caption>
      <thead><tr>
        <th scope="col">学生</th>
        <th scope="col">班级</th>
        <th scope="col">课前测评</th>
        {!cloud && <><th scope="col">视频学习</th><th scope="col">理论测评</th><th scope="col">实操考核</th></>}
        <th scope="col">课程反馈</th>
        <th scope="col">详情</th>
      </tr></thead>
      <tbody>{students.map(({ profile, record }) => {
        const selected = selectedId === profile.id;
        const videoCount = lessons.filter(lesson => record.videos?.[lesson.id]?.completed).length;
        const theoryPassed = record.attempts?.some(attempt => attempt.passed);
        const practicalStatus = record.submissions?.at(-1)?.status || '未提交';
        return <tr key={profile.id} className={selected ? 'teacher-row-selected' : undefined}>
          <th scope="row" className="teacher-student-name">
            <span>{profile.name}</span>
            {profile.studentNumber && <small>{profile.studentNumber}</small>}
          </th>
          <td>{profile.className || noClass}</td>
          <td>{record.preAssessment
            ? <span className="teacher-status-positive">已提交{Number.isFinite(record.preAssessment.score) ? ` · ${record.preAssessment.score} 分` : ''}</span>
            : '未提交'}</td>
          {!cloud && <>
            <td>{videoCount} / {lessons.length} 节</td>
            <td>{theoryPassed ? <span className="teacher-status-positive">已达标</span> : (record.attempts?.length ? '待巩固' : '未练习')}</td>
            <td>{practicalStatus}</td>
          </>}
          <td>{record.feedback?.length || 0} 条</td>
          <td><button type="button" className="teacher-row-button" aria-pressed={selected}
            aria-label={`查看${profile.name}的详情`} onClick={() => onSelect(profile.id)}>
            {selected ? '已选中' : '查看'} <ArrowRight size={14} aria-hidden="true" />
          </button></td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

export function TeacherDashboard({
  students = noStudents, trade, profile, scopeLabel, cloud, loading, error, onRefresh, onExit, renderStudent, children,
}) {
  const [classFilter, setClassFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const classes = [...new Set(students.map(student => student.profile.className || noClass))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const currentClass = classes.includes(classFilter) ? classFilter : '';
  const scope = currentClass ? students.filter(student => (student.profile.className || noClass) === currentClass) : students;
  const term = search.trim().toLowerCase();
  const matches = scope.filter(({ profile }) => [profile.name, profile.studentNumber].some(value => String(value || '').toLowerCase().includes(term)));
  const selected = matches.find(student => student.profile.id === selectedId);
  const ready = !loading && !error;

  return <div className="teacher-dashboard" aria-label="教师端">
    <section className="teacher-screen" aria-labelledby="teacher-overview-title" aria-busy={loading || undefined}>
      <header className="teacher-screen-header">
        <div className="teacher-title-group">
          <span className="teacher-dashboard-mark" aria-hidden="true"><ChalkboardTeacher size={28} /></span>
          <div>
            <p className="teacher-scope">{[trade?.name, currentClass || scopeLabel, profile?.name].filter(Boolean).join(' · ')}</p>
            <h1 id="teacher-overview-title">教学数据总览</h1>
          </div>
        </div>
        <div className="teacher-screen-actions">
          {onRefresh && <button className="teacher-screen-button" type="button" onClick={onRefresh} disabled={loading}><ArrowClockwise size={17} aria-hidden="true" /> 刷新数据</button>}
          {onExit && <button className="teacher-screen-button" type="button" onClick={onExit}><SignOut size={17} aria-hidden="true" />{cloud ? '退出登录' : '退出教师端'}</button>}
        </div>
      </header>
      {!ready ? <p className="teacher-screen-message" role={error ? 'alert' : 'status'}>
        {error ? '未能读取班级数据，请刷新重试。' : '正在读取学生数据…'}
      </p> : scope.length > 0 ? <TeacherOverview students={scope} cloud={cloud} />
        : <p className="teacher-screen-message" role="status">当前范围内暂无学生记录。</p>}
      {cloud && ready && <p className="teacher-source">云端汇总课前问卷与课程反馈。视频、理论练习及实操记录保存在学生端。</p>}
    </section>

    {ready && <section className="teacher-roster" aria-labelledby="teacher-roster-title">
      <div className="teacher-roster-header">
        <div>
          <h2 id="teacher-roster-title"><ChartBar size={24} aria-hidden="true" /> 学生学习数据</h2>
          <p>显示 {matches.length} / {scope.length} 人</p>
        </div>
        {students.length > 0 && <div className="teacher-roster-filters">
          <label className="teacher-sr-only" htmlFor="teacher-roster-search">搜索姓名或学号</label>
          <input id="teacher-roster-search" className="input" type="search" placeholder="搜索姓名或学号" value={search} onChange={event => setSearch(event.target.value)} />
          {classes.length > 1 && <><label className="teacher-sr-only" htmlFor="teacher-class-filter">筛选班级</label>
            <select id="teacher-class-filter" className="input" value={currentClass} onChange={event => setClassFilter(event.target.value)}>
              <option value="">全部班级</option>
              {classes.map(name => <option key={name}>{name}</option>)}
            </select>
          </>}
        </div>}
      </div>
      {matches.length ? <RosterTable students={matches} cloud={cloud} selectedId={selectedId} onSelect={setSelectedId} />
        : <p className="teacher-roster-empty">{students.length ? '没有匹配的学生，请调整搜索条件。' : (cloud ? '当前班级还未分配学生账号。' : '学生选择学习身份后会显示在这里。')}</p>}
    </section>}
    {ready && selected && renderStudent && <section className="teacher-student-detail" aria-labelledby="teacher-student-title">
      <header>
        <h2 id="teacher-student-title">{selected.profile.name} <span>个人学习记录</span></h2>
        <p>{[selected.profile.className, selected.profile.studentNumber].filter(Boolean).join(' · ')}</p>
      </header>
      {renderStudent(selected)}
    </section>}
    {ready && <ClassFeedback students={scope} />}
    {children}
  </div>;
}
