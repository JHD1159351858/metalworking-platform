import { useState } from 'react';
import { cncChapters, cncPracticeQuestions, unitLabel } from './cnc-course.js';
import './practice-library.css';

const banks = cncChapters.map(chapter => ({
  ...chapter,
  questions: cncPracticeQuestions.filter(q => q.chapterId === chapter.id),
}));
const pageSize = 10;

export function PracticeLibrary({ onNavigate, initialChapter }) {
  const [chapterId, setChapterId] = useState(initialChapter || '');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const bank = banks.find(item => item.id === chapterId);
  const keyword = search.trim().toLowerCase();
  const matches = (bank ? bank.questions : cncPracticeQuestions).filter(q =>
    `${q.prompt} ${q.topic}`.toLowerCase().includes(keyword));
  const pageCount = Math.ceil(matches.length / pageSize);
  const first = (page - 1) * pageSize;

  function chooseChapter(id) {
    setChapterId(id);
    setPage(1);
  }

  return <section className="practice-library stack" aria-label="章节题库">
    <div className="bank-directory" aria-label="选择章节">
      {banks.map(item => <button type="button" key={item.id} aria-pressed={chapterId === item.id}
        onClick={() => chooseChapter(item.id)}>
        <small>{unitLabel(item.id)} · {item.questions.length} 道题</small>
        <strong>{item.title}</strong>
      </button>)}
    </div>
    <div className="panel stack">
      <div className="row">
        <h3>{bank?.title || '全部章节'}</h3>
        {bank && <>
          <button className="button secondary" onClick={() => onNavigate('theory', { chapterId })}>进入本章练习</button>
          <button className="button ghost" onClick={() => chooseChapter('')}>查看全部章节</button>
        </>}
      </div>
      <input className="input" aria-label="搜索题干或知识点" placeholder="搜索题干或知识点"
        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      <span className="muted" aria-live="polite">{matches.length ? `共 ${matches.length} 道题 · 当前显示 ${first + 1}–${Math.min(first + pageSize, matches.length)} 题` : '没有找到匹配的练习题'}</span>
      <div>
        {matches.slice(first, first + pageSize).map((q, index) => <details className="bank-question" key={q.id}>
          <summary><small>{unitLabel(q.chapterId)} · {q.topic}</small><strong>{first + index + 1}. {q.prompt}</strong></summary>
          <ol type="A">{q.options.map(option => <li key={option}>{option}</li>)}</ol>
          <details className="source-note">
            <summary>查看答案与解析</summary>
            <p><b>{String.fromCharCode(65 + q.answer)}. {q.options[q.answer]}</b></p>
            <p>{q.explanation}</p>
          </details>
        </details>)}
      </div>
      {pageCount > 1 && <nav className="row" aria-label="题库分页">
        <button className="button secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button>
        <span className="muted">{page} / {pageCount}</span>
        <button className="button secondary" disabled={page === pageCount} onClick={() => setPage(page + 1)}>下一页</button>
      </nav>}
    </div>
  </section>;
}
