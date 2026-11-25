import { useMemo, useState } from 'react';
import { weldingLessons, weldingQuestions } from './welding-course.js';
import { unitLabel } from './cnc-course.js';
import { gradeAttempt } from './learning-data.js';
import { mistakeHistory } from './mistake-history.js';
import { recommendMistakeQuestions } from './mistake-recommendations.js';
import './mistake-notebook.css';

function Recommendations({ items, onNavigate }) {
  function start(questions) {
    onNavigate('theory', { reviewQuestionIds: questions.map(item => item.question.id) });
  }
  function suggestion(item) {
    return <li key={item.question.id}>
      <div><strong>{item.question.prompt}</strong><p>{item.reason}</p></div>
      <button type="button" className="button ghost" onClick={() => start([item])}>练这道题</button>
    </li>;
  }
  return <section className="panel notebook-recommendations" aria-label="智能推荐练习">
    <header className="evidence-heading"><h2>智能推荐练习</h2>
      <button type="button" className="button" onClick={() => start(items)}>开始练习这 {items.length} 道题</button>
    </header>
    <ul>{items.slice(0, 2).map(suggestion)}</ul>
    {items.length > 2 && <details><summary>查看其余 {items.length - 2} 道推荐题</summary><ul>{items.slice(2).map(suggestion)}</ul></details>}
  </section>;
}

function MistakeItem({ item, onCorrect, onNavigate, welding }) {
  const canRetry = !item.resolved && !item.caseId && item.questionId && item.options.includes(item.correctText);
  return <details className="notebook-question">
    <summary>
      <span>{[item.source, item.chapterId && (welding ? weldingLessons.find(lesson => lesson.id === item.chapterId)?.title : unitLabel(item.chapterId)), `答错 ${item.wrongCount} 次`].filter(Boolean).join(' · ')}</span>
      <strong>{item.prompt}</strong>
    </summary>
    <p className="muted">知识点 · {item.topic}</p>
    {canRetry && <form onSubmit={event => {
      event.preventDefault();
      const form = event.currentTarget;
      const choice = new FormData(form).get('choice');
      if (choice !== null) { form.reset(); onCorrect(item, Number(choice)); }
    }}>
      <fieldset className="stack"><legend>重新作答</legend>
        {item.options.map((text, index) => <label className="answer-option" key={text}>
          <input type="radio" name="choice" value={index} required />{text}</label>)}
      </fieldset>
      <button className="button secondary" type="submit">提交订正</button>
    </form>}
    {item.caseId && <button type="button" className="button secondary" onClick={() => onNavigate('tutor', {
      chapterId: item.chapterId, activity: 'case', caseId: item.caseId, caseRound: item.round,
    })}>重做原案例</button>}
    <details className="notebook-analysis"><summary>查看上次错答与解析</summary>
      {item.lastWrongAt && !Number.isNaN(Date.parse(item.lastWrongAt)) && <p><strong>上次答错时间</strong>　<time dateTime={item.lastWrongAt}>{new Date(item.lastWrongAt).toLocaleString('zh-CN')}</time></p>}
      <p><strong>上次错答</strong>　{item.selectedText || '这次记录未保存所选答案'}</p>
      {item.correctText && <p><strong>参考答案</strong>　{item.correctText}</p>}
      {item.explanation && <p>{item.explanation}</p>}
    </details>
  </details>;
}

export function MistakeNotebook({ record, update, onNavigate, trade }) {
  const [resolved, setResolved] = useState(false);
  const [visible, setVisible] = useState(10);
  const [notice, setNotice] = useState('');
  const mistakes = useMemo(() => mistakeHistory(record, trade), [record, trade]);
  const recommendations = useMemo(() => recommendMistakeQuestions(mistakes, record, 10, trade?.id === 'welding' ? weldingQuestions : undefined), [mistakes, record, trade]);
  const pendingCount = mistakes.filter(item => !item.resolved).length;
  const filtered = mistakes.filter(item => item.resolved === resolved);

  function correct(item, choice) {
    const q = { id: item.questionId, topic: item.topic, category: item.category || '原题订正', answer: item.options.indexOf(item.correctText), options: item.options };
    const graded = gradeAttempt([q], { [q.id]: choice }, { totalPass: 100, safetyAll: false });
    const entry = { id: crypto.randomUUID(), at: new Date().toISOString(), mode: 'mistake-review',
      topic: `原题订正 · ${item.topic}`, correct: graded.details[0].correct, score: graded.score,
      details: graded.details, questionOrder: [q.id] };
    update(previous => ({ ...previous, practice: [...previous.practice, entry] }));
    setNotice(entry.correct ? `「${item.topic}」已订正，原错题保存在“已订正”中。` : `「${item.topic}」本次仍有误，可以展开解析后再试。`);
  }

  if (!mistakes.length) return <section className="empty-state">
    <h2>还没有收录错题</h2>
    <p>完成练习后，答错的题目和对应的巩固练习会出现在这里。</p>
    <button type="button" className="button secondary" onClick={() => onNavigate('theory')}>前往题库练习</button>
  </section>;
  return <div className="stack mistake-notebook">
    {recommendations.length > 0 && <Recommendations items={recommendations} onNavigate={onNavigate} />}
    {pendingCount > 0 && !recommendations.length && <p className="muted">当前没有新的同类推荐题，可以展开下方错题重新作答。</p>}
    <section className="panel" aria-label="我的错题">
      <header className="evidence-heading"><h2>我的错题</h2>
        <div className="row">{[[false, '待订正', pendingCount], [true, '已订正', mistakes.length - pendingCount]].map(([value, label, count]) =>
          <button type="button" key={label} aria-pressed={value === resolved} className={value === resolved ? 'button secondary' : 'button ghost'}
            onClick={() => { setResolved(value); setVisible(10); setNotice(''); }}>{label}（{count}）</button>)}</div>
      </header>
      {notice && <p role="status">{notice}</p>}
      {filtered.slice(0, visible).map(item => <MistakeItem welding={trade?.id === 'welding'} key={item.key} item={item} onCorrect={correct} onNavigate={onNavigate} />)}
      {!filtered.length && <p className="muted">{resolved ? '还没有已订正的题目。' : '当前错题已全部订正。'}</p>}
      {visible < filtered.length && <button type="button" className="button ghost" onClick={() => setVisible(visible + 10)}>显示更多错题</button>}
    </section>
  </div>;
}
