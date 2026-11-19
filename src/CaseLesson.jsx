import { useEffect, useId, useRef, useState } from 'react';
import { unitLabel } from './cnc-course.js';
import { chapterCases, checkCoordinate, coordinateFigure, coordinateHints, recordedCaseId, recordedCaseRound, referenceFigure, usedCaseHelp } from './case-exercises.js';
import './chapter-cases.css';

function ShaftFigure({ figure, label }) {
  const { shoulder, pointX, originX, point, origin, rightward } = figure;
  const top = pointX <= shoulder ? 44 : 58;
  return <figure className="shaft-figure">
    <figcaption>{label}</figcaption>
    <svg viewBox="0 0 282 134" role="img" aria-label={`${label}。O 在${origin}，${point} 在 O 的${pointX > originX ? '右' : '左'}侧，+Z 箭头向${rightward ? '右' : '左'}。`}>
      <path d={`M36 44 H${shoulder} V58 H232 V94 H${shoulder} V108 H36 Z`} fill="#d9e9f7" stroke="#456782" strokeWidth="2" />
      <path d="M10 76 H272" stroke="#536f86" strokeDasharray="4 3" />
      <path d={rightward ? 'M272 76 L263 72 V80 Z' : 'M10 76 L19 72 V80 Z'} fill="#36516a" />
      <text x={rightward ? 252 : 9} y="62">+Z</text>
      <circle cx={pointX} cy={top} r="4" fill="#135fa7" />
      <text x={pointX} y={top - 10} textAnchor="middle" fill="#135fa7">{point}</text>
      <path d={`M${originX} 76 V117`} stroke="#935521" />
      <circle cx={originX} cy="76" r="4" fill="#99551d" />
      <text x={originX} y="132" textAnchor="middle" fill="#85491a">O</text>
    </svg>
  </figure>;
}

function CoordinateChoices({ label, values, value, onChange }) {
  const name = useId();
  return <fieldset className="case-field"><legend>{label}</legend><div className="case-options">
    {values.map(item => <label key={item} className={value === item ? 'selected' : ''}>
      <input type="radio" name={name} required value={item} checked={value === item} onChange={() => onChange(item)} />{item}
    </label>)}
  </div></fieldset>;
}

function ContourFigure({ overlay }) {
  return <figure className="shaft-figure contour-figure">
    <figcaption>{overlay ? '目标轮廓与预览叠图' : '阶梯轴上缘的三个轮廓段'}</figcaption>
    <svg viewBox="0 0 340 104" role="img" aria-label={overlay ? '图样的轴肩 B 在虚线预览转折的左侧，A、C 的平直部分与预览重合。' : '从左至右，A 与 C 是两条高度不同的水平直段，B 是连接两者的竖直轴肩。'}>
      <path d="M20 32 H142 V77 H318" fill="none" stroke="#365975" strokeWidth="3.5" />
      {overlay && <path d="M20 32 H168 V77 H318" fill="none" stroke="#b56623" strokeDasharray="7 5" strokeWidth="2.5" />}
      <text x="62" y="22">A</text><text x="126" y="61">B</text><text x="248" y="99">C</text>
    </svg>
  </figure>;
}

export function CaseLesson({ chapterId, initialCaseId, initialRound, record, update, onNavigate, focusCase, onContextChange }) {
  const tasks = chapterCases(chapterId);
  const attempts = (record.casePractice || []).filter(entry => entry.chapterId === chapterId);
  const latest = new Map(attempts.map(entry => [recordedCaseId(entry), entry]));
  const [index, setIndex] = useState(() => {
    const last = attempts.at(-1);
    const wanted = initialCaseId || (!focusCase && last && recordedCaseId(last));
    return Math.max(0, tasks.findIndex(task => task.id === wanted));
  });
  const task = tasks[index];
  return <section className="case-lesson case-library panel stack" aria-label="章节案例练习">
    <details className="case-library-index" open>
      <summary>本单元案例 <span>已练 {tasks.filter(item => latest.has(item.id)).length} / {tasks.length}</span></summary>
      <nav aria-label="选择本单元案例">{tasks.map((item, position) => {
        const last = latest.get(item.id);
        return <button type="button" key={item.id} aria-current={index === position ? 'true' : undefined} onClick={() => setIndex(position)}>
          <span className="case-library-number">{String(position + 1).padStart(2, '0')}</span>
          <span>{item.topic}{last && <small>{last.correct ? '已答对' : '待巩固'}</small>}</span>
        </button>;
      })}</nav>
    </details>
    <CaseActivity key={task.id} task={task} chapterId={chapterId} record={record} update={update}
      history={attempts.filter(item => recordedCaseId(item) === task.id)} initialRound={initialCaseId === task.id ? initialRound : undefined}
      position={index + 1} count={tasks.length}
      onNavigate={onNavigate} focusCase={focusCase} onContextChange={onContextChange} />
    <div className="case-pagination">
      <button className="button ghost" type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>上一案例</button>
      <span>{index + 1} / {tasks.length}</span>
      <button className="button secondary" type="button" disabled={index === tasks.length - 1} onClick={() => setIndex(index + 1)}>下一案例</button>
    </div>
  </section>;
}

function CaseActivity({ task, chapterId, history, initialRound, position, count, record, update, onNavigate, focusCase, onContextChange }) {
  const original = task.id === 'case-' + chapterId;
  const coordinate = original && chapterId === '8.1';
  const retry = Number.isSafeInteger(initialRound) && initialRound >= 0 && history.some(entry => recordedCaseRound(entry) === initialRound);
  const [round, setRound] = useState(() => retry ? initialRound : history.at(-1)?.round ?? 0);
  const [response, setResponse] = useState({});
  const [showResult, setShowResult] = useState(!retry);
  const region = useRef(null);
  const exercise = round ? task.transfer : task;
  const figure = coordinate && coordinateFigure(round);
  const exerciseId = `${task.id}-${round}`;
  const topic = task.topic;
  const latest = history.filter(entry => entry.exerciseId === exerciseId).at(-1);
  const result = showResult && latest;
  const canSubmit = coordinate ? response.origin && response.sign : response.option != null;
  const hint = coordinate ? coordinateHints[latest?.cause || 'origin'] : exercise.hint;
  useEffect(() => {
    if (focusCase) region.current?.focus({ preventScroll: false });
  }, [focusCase]);
  useEffect(() => {
    onContextChange?.({ chapterId, questionId: exerciseId, caseId: task.id, caseHint: hint, caseTopic: topic, caseRound: round });
  }, [chapterId, exerciseId, task.id, hint, topic, round, onContextChange]);
  useEffect(() => {
    function registerHelp(event) {
      if (event.detail?.questionId === exerciseId) markHint();
    }
    window.addEventListener('case-help-used', registerHelp);
    return () => window.removeEventListener('case-help-used', registerHelp);
  });

  function answer(key, value) {
    setResponse(old => ({ ...(showResult ? latest?.response : old), [key]: value }));
    setShowResult(false);
  }

  function submit(event) {
    event.preventDefault();
    if (!canSubmit || result) return;
    const outcome = coordinate ? checkCoordinate(figure, response.origin, response.sign) : {
      correct: response.option === exercise.correctIndex,
      cause: response.option === exercise.correctIndex ? null : topic,
      feedback: response.option === exercise.correctIndex ? exercise.feedback : exercise.hint,
    };
    update(previous => {
      const attempts = previous.casePractice || [];
      const entry = {
        id: crypto.randomUUID(), at: new Date().toISOString(), chapterId, caseId: task.id, exerciseId, round, topic,
        assisted: (retry && round === initialRound) || usedCaseHelp(attempts, previous.caseHints, exerciseId), transfer: round > 0,
        response: { ...response }, ...outcome,
      };
      return { ...previous, casePractice: [...attempts, entry] };
    });
    setShowResult(true);
  }

  function markHint() {
    update(previous => ({ ...previous, caseHints: { ...previous.caseHints, [exerciseId]: true } }));
  }

  function changeFigure(next) {
    setRound(next);
    setResponse({});
    setShowResult(true);
  }

  const displayed = showResult ? latest?.response || {} : response;
  return <div className="stack" ref={region} tabIndex={-1}>
    <header><span className="case-current">{unitLabel(chapterId)} · 案例 {position} / {count}</span><h2>{topic}</h2></header>
    {coordinate ? <>
      <p>{round ? '换一张图，独立找出零点和轴向符号。注意这一张图的箭头方向。' : '同一件阶梯轴上，P 的位置保持不动。比较两张图，再用图乙的约定作答。'}</p>
      <div className="shaft-pair">
        {!round && <ShaftFigure label="图甲" figure={referenceFigure} />}
        <ShaftFigure label={round ? `复测图 ${round}` : '图乙'} figure={figure} />
      </div>
    </> : <>
      {round > 0 && <strong>独立复测 · 新情境</strong>}
      <p>{exercise.situation}</p>
      {original && !round && ['8.4', '8.6'].includes(chapterId) && <ContourFigure overlay={chapterId === '8.6'} />}
    </>}
    <form className="stack" onSubmit={submit}>
      {coordinate ? <>
        <CoordinateChoices label={`${round ? '复测图' : '图乙'}把哪一处定为零点 O？`} values={['左端面', '轴肩', '右端面']} value={displayed.origin} onChange={v => answer('origin', v)} />
        <CoordinateChoices label={`${figure.point} 点的轴向读数符号是什么？`} values={['正', '负']} value={displayed.sign} onChange={v => answer('sign', v)} />
      </> : <fieldset className="case-field"><legend>{exercise.prompt}</legend>
        {exercise.options.map((text, index) => <label className="answer-option" key={text}>
          <input type="radio" name={exerciseId} required checked={displayed.option === index} onChange={() => answer('option', index)} />
          <span>{text}</span>
        </label>)}
      </fieldset>}
      <div className="row">
        <button className="button" type="submit" disabled={!canSubmit || Boolean(result)}>核对判断</button>
        {!result && !record.caseHints?.[exerciseId] && <button className="button ghost" type="button" onClick={markHint}>给我一个提示</button>}
        {coordinate ? <button type="button" className="button secondary" onClick={() => changeFigure(history.reduce((max, entry) => Math.max(max, entry.round || 0), round) + 1)}>换图独立复测</button>
          : !round ? <button type="button" className="button secondary" onClick={() => changeFigure(1)}>换情境独立复测</button>
          : <button type="button" className="button secondary" onClick={() => onNavigate('theory', { chapterId })}>再练本节题库</button>}
        {round > 0 && <button type="button" className="button ghost" onClick={() => changeFigure(0)}>{coordinate ? '回看两幅对照图' : '回看原情境'}</button>}
      </div>
    </form>
    {!result && record.caseHints?.[exerciseId] && <p className="info-banner" role="status">{hint}</p>}
    {result && <div className={`result-banner ${result.correct ? 'success' : 'warning'}`} role="status">
      <strong>{result.correct ? (result.assisted ? '有提示完成' : result.transfer ? '独立复测正确' : '独立判断正确') : '再核对一次'}</strong>
      <p>{result.feedback}</p>
    </div>}
    {original && chapterId === '8.3' && <>
      <label className="field">我的工艺方案草稿
        <textarea className="textarea" rows={3} value={record.caseDraft?.plan || ''} placeholder="我准备先核对……图纸依据是……打算怎样检查……"
          onChange={event => { const plan = event.target.value; update(previous => ({ ...previous, caseDraft: { ...previous.caseDraft, plan } })); }} />
      </label>
      <div><button className="button secondary" onClick={() => onNavigate('practical')}>到实操任务单继续填写</button></div>
    </>}
  </div>;
}
