import { useEffect, useRef, useState } from 'react';
import { Heading } from './LearningUI.jsx';
import { loadRules, saveRules } from './learning-data.js';
import { measurementResult, measurementText, reviewFields } from './practical-work.js';
import { keepFiles, readFile, discardFiles } from './practical-files.js';
import './practical-course.css';

const time = value => new Date(value).toLocaleString('zh-CN');
const snapshotTime = () => new Date().toISOString();
const practiceDrawing = '/drawings/stepped-shaft-l01-a.svg';

function drawingLink(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

function PracticeDrawing() {
  const viewer = useRef(null);
  const description = '阶梯轴主视图。A 为左端面，B 为轴肩面，A 至 B 长 20.00 ± 0.10 mm。左段直径 30 mm，右段直径 20 mm，总长 60 mm。';
  return <section className="panel stack practical-drawing">
    <div className="evidence-heading">
      <div><h2>阶梯轴练习图</h2><p className="muted">项目教学图 · L-01 · A 版</p></div>
      <div className="row">
        <button type="button" className="button secondary" onClick={() => viewer.current.showModal()}>放大图纸</button>
        <a className="button ghost" href={practiceDrawing} download="阶梯轴教学图-L-01-A.svg">下载图纸</a>
      </div>
    </div>
    <img className="practical-sheet" src={practiceDrawing} alt={description} width="900" height="400" />
    <dialog className="drawing-viewer" ref={viewer} aria-label="阶梯轴练习图大图" onClick={e => {
      if (e.target === e.currentTarget) viewer.current.close();
    }}>
      <div className="drawing-viewer-content">
        <div className="evidence-heading"><strong>阶梯轴 · L-01 · A 版</strong><button type="button" className="button secondary" onClick={() => viewer.current.close()}>关闭大图</button></div>
        <div className="drawing-viewport"><img src={practiceDrawing} alt={description} width="900" height="400" /></div>
      </div>
    </dialog>
  </section>;
}

function SubmissionDetails({ entry, profile, trade }) {
  const [error, setError] = useState('');
  const submittedDrawing = drawingLink(entry.drawingUrl);
  async function download(file) {
    try {
      const blob = await readFile(profile.id, trade.id, file.id);
      if (!blob) throw new Error('缺少文件');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = file.name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setError('');
    } catch { setError('这台设备暂时无法读取该原件，请提供或重新选择原文件。'); }
  }
  return <div className="practical-submission-data">
    {entry.task && <p><strong>任务要求</strong>　{entry.task}</p>}
    {entry.drawing && <p><strong>图纸版本</strong>　{entry.drawing}　{submittedDrawing && <a href={submittedDrawing} target="_blank" rel="noopener noreferrer">打开提交时的图纸链接</a>}</p>}
    {entry.plan && <p><strong>工艺方案</strong>　{entry.plan}</p>}
    <p><strong>测量记录</strong>　{entry.measurements}</p>
    {entry.measurement?.check && <p><strong>提交时的尺寸自查</strong>　{entry.measurement.check}</p>}
    <p><strong>过程记录</strong>　{entry.notes}</p>
    <div className="file-list">{entry.files?.map((file, i) => file.id
      ? <button type="button" className="button ghost" key={file.id} onClick={() => download(file)}>下载 {file.name}</button>
      : <span className="pill" key={i}>{file.name} · 仅有文件信息</span>)}</div>
    {error && <p role="alert">{error}</p>}
    {entry.review && <p className="info-banner"><strong>教师评语</strong>　{entry.review.comment}
      {entry.review.field && ' · 补交' + reviewFields[entry.review.field]}
      {entry.review.score != null && ' · ' + entry.review.score + ' 分'}</p>}
  </div>;
}

export function PracticalView({ record, rules, update, onNavigate, profile, trade, target }) {
  const qualified = record.attempts.some(a => a.passed);
  const last = record.submissions.at(-1);
  const draft = record.practicalDraft || {};
  const plan = record.caseDraft?.plan ?? last?.plan ?? '';
  const sample = record.caseDraft?.sampleReading ?? '';
  const official = rules.measurement;
  const officialDrawing = drawingLink(rules.drawingUrl);
  const drawing = draft.drawing ?? last?.drawing ?? rules.drawingVersion ?? '';
  const item = draft.item ?? last?.measurement?.item ?? official?.item ?? '';
  const value = draft.value ?? last?.measurement?.value ?? '';
  const tool = draft.tool ?? last?.measurement?.tool ?? '';
  const notes = draft.notes ?? last?.notes ?? '';
  const recheck = draft.recheck ?? last?.measurement?.recheck ?? '';
  const priorFiles = last?.files || [];
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const busy = useRef(false);
  const filePicker = useRef(null);
  const fieldRefs = useRef({});
  const field = target?.field;
  const fieldRef = name => el => { fieldRefs.current[name] = el; };
  useEffect(() => { if (field) fieldRefs.current[field]?.focus(); }, [field, target]);

  function writeDraft(key, val) {
    setNotice('');
    update(r => ({ ...r, practicalDraft: { ...r.practicalDraft, [key]: val } }));
  }
  function writeCase(key, val) {
    setNotice('');
    update(r => ({ ...r, caseDraft: { ...r.caseDraft, [key]: val } }));
  }
  const matchesStandard = official && drawing.trim() === rules.drawingVersion && item.trim() === official.item;
  const check = matchesStandard && measurementText(measurementResult(value, official.lower, official.upper));

  async function submit(event) {
    event.preventDefault();
    if (!qualified || busy.current) return;
    if (![drawing, plan, item, tool, notes].every(v => v.trim())) { setNotice('请补全图纸版本、工艺方案、测量项、量具和现场记录。'); return; }
    if (rules.drawingVersion && drawing.trim() !== rules.drawingVersion) { setNotice('教师已发布另一图纸版本，请核对后更新图号。'); return; }
    if (official && !matchesStandard) { setNotice('请填写教师指定的测量项：' + official.item); return; }
    if (!(files.length || priorFiles.length) || (last?.status === '需补交材料' && last.review?.field === 'files' && !files.length)) {
      setNotice('请选择本次需要提交的材料文件。'); return;
    }
    busy.current = true; setSaving(true);
    let kept = [];
    const previousId = last?.id;
    try {
      kept = await keepFiles(profile.id, trade.id, files);
      const entry = {
        id: crypto.randomUUID(), at: snapshotTime(), status: '待教师评价',
        task: rules.task, drawing: drawing.trim(), drawingUrl: officialDrawing, plan: plan.trim(), notes: notes.trim(),
        files: kept.length ? kept : priorFiles, previousId,
        measurement: { item, value, tool, recheck, unit: 'mm', check: check || '', standard: matchesStandard ? official : null },
        measurements: item + ' ' + value + ' mm · 量具 ' + tool + (recheck.trim() ? ' · 复测 ' + recheck : ''),
      };
      update(r => {
        if (r.submissions.at(-1)?.id !== previousId || !r.attempts.some(a => a.passed)) throw new Error('changed');
        return { ...r, submissions: [...r.submissions, entry], practicalDraft: {} };
      });
      setFiles([]); if (filePicker.current) filePicker.current.value = '';
      setNotice('本次材料和测量记录已保存在当前浏览器，等待教师评价。');
    } catch (error) {
      await discardFiles(profile.id, trade.id, kept).catch(() => {});
      setNotice(error.message === 'changed' ? '已有新记录，请核对后再提交。' : '未能保存本次材料，请检查浏览器存储空间后重试。');
    } finally { busy.current = false; setSaving(false); }
  }

  return <div className="practical-course stack">
    <Heading title="实操考核">用一张任务单把读图方案、现场记录和教师评价连起来。</Heading>
    {trade.id === 'lathe' && <PracticeDrawing />}
    <div className="practical-preparation">
      <section className="panel stack">
        <h2>工艺方案草稿</h2>
        <p>对照图纸，写出要检查的部位、计划的工序和选择理由。这里与“加工工艺与程序编制”单元共用同一份草稿。</p>
        <label className="field">工艺方案<textarea ref={fieldRef('plan')} className="textarea" rows={4} value={plan} maxLength={5000}
          onChange={e => writeCase('plan', e.target.value)} placeholder="我关注哪一处尺寸？准备在哪一步检查？" /></label>
        <div><button type="button" className="button secondary" onClick={() => onNavigate('tutor', { chapterId: '8.3', activity: 'case' })}>回看加工工艺与程序编制</button></div>
      </section>
      {trade.id === 'lathe' && <section className="panel stack">
        <h2>纸上测量自查</h2>
        <p>练习图 L-01 中，左端面 A 至轴肩面 B 的长度为 <strong>20.00 ± 0.10 mm</strong>。试填一次读数，比较它与上下限的距离。</p>
        <label className="field">练习读数（mm）<input className="input" inputMode="decimal" value={sample} maxLength={16}
          onChange={e => writeCase('sampleReading', e.target.value)} placeholder="例如 20.12" /></label>
        <p className="info-banner" role="status">{sample ? measurementText(measurementResult(sample, '19.90', '20.10')) || '请输入非负毫米数值，最多四位小数。' : '练习范围　19.90 至 20.10 mm，两个端点均在范围内。'}</p>
        <small className="muted">本题供独立练习。实训采用教师发布的图纸与要求。</small>
      </section>}
    </div>
    <section className="panel stack">
      <div className="evidence-heading"><h2>现场实训任务单</h2><span className="pill">{qualified ? '理论已达标' : '待理论达标'}</span></div>
      <p>{rules.task}</p>
      {officialDrawing
        ? <p className="task-drawing"><strong>教师发布的正式图纸 · {rules.drawingVersion}</strong><a className="button secondary" href={officialDrawing} target="_blank" rel="noopener noreferrer">打开正式图纸</a></p>
        : <p className="muted">{rules.drawingVersion ? '教师发布版本 · ' + rules.drawingVersion + '。' : ''}正式图纸请向现场教师领取。</p>}
      <p className="muted">评价维度为操作规范、工艺执行、安全习惯、成品质量。现场教师确认后方可上机，并由教师结合操作表现和成品给出最终评价。</p>
      <small className="muted">本任务单借鉴超星普通车床「车削质量检验」的作品与过程记录设计，考核要求以本次数控车任务书为准。</small>
      {!qualified ? <div><p className="muted">综合测评达到总分和安全要求后开放材料提交。</p>
        <button className="button secondary" onClick={() => onNavigate('theory', { assessment: true })}>前往理论测评</button></div>
        : <form className="practical-form" onSubmit={submit}>
          {last?.status === '需补交材料' && <p className="info-banner"><strong>教师要求补交{reviewFields[last.review?.field]}</strong>　{last.review?.comment}</p>}
          <fieldset disabled={saving}>
            <legend>测量与现场记录</legend>
            <label className="field">图纸或任务书版本<input required className="input" value={drawing} maxLength={120}
              onChange={e => writeDraft('drawing', e.target.value)} placeholder="填写现场教师发布的图号或版本" /></label>
            {rules.drawingVersion && <small className="muted">教师当前发布　{rules.drawingVersion}</small>}
            {official && <p className="info-banner">教师指定测量项　{official.item}　{official.lower} 至 {official.upper} mm</p>}
            <div className="practical-inputs">
              <label className="field">测量项目<input ref={fieldRef('measurements')} required className="input" value={item} maxLength={160} onChange={e => writeDraft('item', e.target.value)} placeholder="如轴肩长度" /></label>
              <label className="field">实测值（mm）<input required className="input" inputMode="decimal" pattern="[0-9]+([.][0-9]{1,4})?" title="请填写非负毫米数值，最多四位小数" maxLength={15} value={value} onChange={e => writeDraft('value', e.target.value)} /></label>
              <label className="field">使用量具<input required className="input" value={tool} maxLength={100} onChange={e => writeDraft('tool', e.target.value)} /></label>
            </div>
            {check && <p role="status" className="info-banner">本次实测值{check}。最终评价由教师确认。</p>}
            <label className="field">复测或待核实事项（选填）<input className="input" value={recheck} maxLength={500} onChange={e => writeDraft('recheck', e.target.value)} /></label>
            <label className="field">过程记录与自查说明<textarea required ref={fieldRef('notes')} className="textarea" rows={3} value={notes} maxLength={6000}
              onChange={e => writeDraft('notes', e.target.value)} placeholder="记录现场做了什么、发现了什么、哪一项仍需教师确认" /></label>
            <label className="field">程序、作品照片或过程材料<input className="input" ref={el => { filePicker.current = el; fieldRefs.current.files = el; }}
              type="file" multiple accept=".nc,.txt,.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={e => { setNotice(''); setFiles(Array.from(e.target.files || [])); }} /></label>
            {priorFiles.length > 0 && <p className="muted">上一版材料　{priorFiles.map(f => f.name).join('、')}。选择新文件将替换本次提交的整组材料。</p>}
            <small className="muted">文字自动保存为草稿。文件在提交时保存在此浏览器，同一浏览器的教师工作台可以下载。</small>
          </fieldset>
          <button className="button" disabled={saving}>{saving ? '正在保存材料…' : last ? '提交本次修订' : '提交实操材料'}</button>
          {notice && <p role="status">{notice}</p>}
        </form>}
    </section>
    {last && <section className="panel stack"><div className="evidence-heading"><h2>历次提交与评语</h2><button className="button secondary" onClick={() => onNavigate('feedback')}>查看选学建议</button></div>
      {record.submissions.slice().reverse().map((s, i) => <details className="practical-entry" key={s.id} open={i === 0}>
        <summary>第 {record.submissions.length - i} 次　{s.status}　{time(s.at)}</summary><SubmissionDetails entry={s} profile={profile} trade={trade} />
      </details>)}</section>}
  </div>;
}

export function TeacherPracticalReview({ record, update, profile, trade }) {
  const latest = record.submissions.at(-1);
  const [score, setScore] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('通过');
  const [field, setField] = useState('measurements');
  function review(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    const action = { at: snapshotTime(), comment: comment.trim(), score: score === '' ? null : Number(score) };
    if (status === '需补交材料') action.field = field;
    update(r => ({
      ...r, submissions: r.submissions.map(s => s.id === latest.id && !s.review && r.submissions.at(-1).id === s.id
        ? { ...s, status, review: action } : s),
    }));
    setScore(''); setComment('');
  }
  return <section className="panel stack practical-course"><h3>实操评价</h3>
    {latest ? <>
      {record.submissions.slice().reverse().map((entry, i) => <details key={entry.id} className="practical-entry" open={i === 0}>
        <summary>第 {record.submissions.length - i} 次提交　{entry.status}　{time(entry.at)}</summary>
        <SubmissionDetails entry={entry} profile={profile} trade={trade} />
      </details>)}
      {!latest.review && <form className="practical-form" onSubmit={review}>
        <p>结合现场操作、材料和成品评阅最新提交。退回后学生可从选学建议直接打开需补交的项目。</p>
        <label className="field">最终结论<select className="input" value={status} onChange={e => setStatus(e.target.value)}>
          <option>通过</option><option>需补交材料</option><option>未通过</option></select></label>
        {status === '需补交材料' && <label className="field">需要补交的位置<select className="input" value={field} onChange={e => setField(e.target.value)}>
          {Object.entries(reviewFields).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>}
        <label className="field">评分（0 至 100 分{status === '需补交材料' ? '，可留空' : ''}）<input className="input" type="number" min="0" max="100"
          value={score} onChange={e => setScore(e.target.value)} required={status !== '需补交材料'} /></label>
        <label className="field">教师评语<textarea className="textarea" rows={3} value={comment} onChange={e => setComment(e.target.value)} required maxLength={3000} placeholder="结合某条材料，写明依据或待补充的内容" /></label>
        <button className="button">保存实操评价</button>
      </form>}
    </> : <p className="muted">这名学生还没有提交实操材料。</p>}
  </section>;
}

export function TeacherCourseSettings({ trade }) {
  const [rules] = useState(() => loadRules(trade));
  const [threshold, setThreshold] = useState(rules.totalPass);
  const [safetyAll, setSafetyAll] = useState(rules.safetyAll);
  const [task, setTask] = useState(rules.task);
  const [version, setVersion] = useState(rules.drawingVersion || '');
  const [drawingUrl, setDrawingUrl] = useState(rules.drawingUrl || '');
  const [limits, setLimits] = useState(rules.measurement || { item: '', lower: '', upper: '' });
  const [notice, setNotice] = useState('');
  function save(event) {
    event.preventDefault();
    const url = drawingLink(drawingUrl.trim());
    if (drawingUrl.trim() && (!url || !version.trim())) {
      setNotice('请填写正式图纸版本，以及以 https:// 或 http:// 开头的有效图纸链接。'); return;
    }
    const hasLimits = Object.values(limits).some(v => String(v).trim());
    if (hasLimits && (!version.trim() || !limits.item.trim() || !measurementResult(limits.lower, limits.lower, limits.upper))) {
      setNotice('启用尺寸核对时请填写图纸版本、测量项及有效上下限（mm，最多四位小数）。'); return;
    }
    if (!task.trim()) { setNotice('请填写实操任务说明。'); return; }
    saveRules(trade, { ...loadRules(trade), totalPass: Number(threshold), safetyAll, task: task.trim(), drawingVersion: version.trim(), drawingUrl: url,
      measurement: hasLimits ? { ...limits, item: limits.item.trim() } : null });
    setNotice('已保存。此浏览器内的后续考核采用新要求，历次提交保留当时的任务与核对结果。');
  }
  return <form className="panel stack practical-course" onSubmit={save} onChange={() => setNotice('')}>
    <h3>{trade.name} · 考核配置</h3>
    <label className="field">理论测评合格线<input className="input" type="number" min="0" max="100" value={threshold} onChange={e => setThreshold(e.target.value)} required /></label>
    <label className="answer-option"><input type="checkbox" checked={safetyAll} onChange={e => setSafetyAll(e.target.checked)} />安全类试题须全部正确</label>
    <label className="field">实操任务说明<textarea className="textarea" rows={3} value={task} onChange={e => setTask(e.target.value)} required /></label>
    <label className="field">正式图纸或任务书版本（选填）<input className="input" value={version} onChange={e => setVersion(e.target.value)} maxLength={120} /></label>
    <label className="field">正式图纸链接（选填）<input className="input" type="url" value={drawingUrl} onChange={e => setDrawingUrl(e.target.value)} placeholder="https://" /></label>
    <p className="muted">可为此版本指定一个测量项。留空时由学生记录实测值，教师结合现场图纸评阅。</p>
    <div className="practical-inputs">{[['item','测量项目'],['lower','下限（mm）'],['upper','上限（mm）']].map(([key, label]) =>
      <label key={key} className="field">{label}<input className="input" inputMode={key === 'item' ? 'text' : 'decimal'} value={limits[key]}
        maxLength={key === 'item' ? 160 : 15} onChange={e => setLimits({ ...limits, [key]: e.target.value })} /></label>)}</div>
    <button className="button">保存考核配置</button>{notice && <p role="status">{notice}</p>}
  </form>;
}
