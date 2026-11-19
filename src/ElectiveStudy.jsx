import { useState } from 'react';
import { ArrowRight, BookOpenText } from '@phosphor-icons/react';
import { cncChapters, unitLabel } from './cnc-course.js';
import { chapterActivity, courseSuggestions, learningSnapshot } from './course-recommendations.js';
import './elective-study.css';

export function LearningSnapshot({ record }) {
  return <dl className="learning-snapshot" aria-label="我的学情">
    {learningSnapshot(record).map(item => <div key={item.label}>
      <dt>{item.label}</dt><dd>{item.value}</dd>
      {item.detail && <dd className="snapshot-detail">{item.detail}</dd>}
    </div>)}
  </dl>;
}

export function ElectiveStudy({ record, update, onNavigate }) {
  const [chapter, setChapter] = useState(record.studyPreference?.chapterId || '8.1');
  const [note, setNote] = useState(record.studyPreference?.note || '');
  const [editing, setEditing] = useState(false);
  const suggestions = courseSuggestions(record);
  const latest = record.submissions.at(-1);
  function saveChoice(event) {
    event.preventDefault();
    update(r => ({ ...r, studyPreference: { chapterId: chapter, at: new Date().toISOString(), note: note.trim() } }));
    setEditing(false);
    const route = chapterActivity(chapter);
    onNavigate(route.view, route.target);
  }
  return <section className="panel stack elective-plan">
    <div className="evidence-heading"><h2>为你推荐</h2><button type="button" className="button ghost" onClick={() => setEditing(!editing)} aria-expanded={editing}>自己选章节</button></div>
    {editing && <form className="elective-choice stack" onSubmit={saveChoice}>
      <label className="field">我想练<select className="input" value={chapter} onChange={e => setChapter(e.target.value)}>
        {cncChapters.map(ch => <option key={ch.id} value={ch.id}>{unitLabel(ch.id)} · {ch.title}</option>)}
      </select></label>
      <label className="field">我卡在哪里（选填）<input className="input" maxLength={180} value={note}
        onChange={e => setNote(e.target.value)} placeholder="比如：能找到零点，但总读反箭头" /></label>
      <div><button className="button">保存并进入练习</button></div>
    </form>}
    {suggestions.map((item, index) => <article key={item.key} className={'elective-item' + (index === 0 ? ' priority' : '')}>
      <div className="evidence-heading"><span className="pill">{item.label}</span>
        <button type="button" className="button ghost" onClick={() => update(r => ({ ...r,
          skippedSuggestions: [...new Set([...(r.skippedSuggestions || []), item.key])],
        }))}>暂时跳过</button></div>
      <h3>{item.title}</h3><p>{item.reason}</p>
      <div className="elective-actions">
        <button type="button" className="button secondary" onClick={() => onNavigate(item.view, item.target)}>
          {item.action} <ArrowRight size={16} />
        </button>
        {item.followUp && <button type="button" className="button ghost" onClick={() => onNavigate(item.followUp.view, item.followUp.target)}>{item.followUp.action}</button>}
      </div>
    </article>)}
    {!suggestions.length && <p className="muted">当前没有新的优先建议，可以自己选章节，也可以写下这次实训的收获。</p>}
    {latest?.status === '待教师评价' && <p className="muted" role="status">本次实操材料已提交，等待教师评阅。</p>}
    {latest?.review && latest.status !== '需补交材料' && <p><strong>最近的实操评语</strong>　{latest.review.comment}</p>}
    {record.skippedSuggestions?.length > 0 && <button type="button" className="button ghost" onClick={() => update(r => ({ ...r, skippedSuggestions: [] }))}>重新显示跳过的建议</button>}
    <div className="elective-links"><BookOpenText size={18} aria-hidden="true" />
      <button type="button" onClick={() => onNavigate('tutor')}>章节目录</button>
      <button type="button" onClick={() => onNavigate('video')}>教学视频</button>
      <button type="button" onClick={() => onNavigate('theory')}>题库练习</button>
    </div>
  </section>;
}
