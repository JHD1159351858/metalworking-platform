import { ChatCircleDots } from '@phosphor-icons/react';
import { cncChapters } from './cnc-course.js';
import { unitKnowledge } from './unit-knowledge.js';
import { LathePhoto, UnitDemo } from './UnitDemo.jsx';

export function UnitKnowledge({ chapterId }) {
  const chapter = cncChapters.find(item => item.id === chapterId);
  const { sections, example, pitfalls } = unitKnowledge[chapterId];

  function askAbout(title) {
    window.dispatchEvent(new CustomEvent('companion-question', {
      detail: { chapterId, readingTopic: title, question: `请讲解“${title}”。` },
    }));
  }

  return <article className="unit-reading" aria-label="单元基础知识">
    <h2>{chapter.title}</h2>
    <UnitDemo key={chapterId} chapterId={chapterId} />
    {sections.map(part => <section key={part.title} className="reading-section">
      <div className="reading-heading">
        <h3>{part.title}</h3>
        <button type="button" onClick={() => askAbout(part.title)} aria-label={`请伴学讲解${part.title}`}>
          <ChatCircleDots size={16} aria-hidden="true" /> 问伴学
        </button>
      </div>
      <p>{part.text}</p>
    </section>)}
    {chapterId === '8.2' && <LathePhoto />}
    <section className="reading-example">
      <h3>例题 · {example.title}</h3>
      <p>{example.text}</p>
    </section>
    <section className="reading-pitfalls">
      <h3>容易混淆的地方</h3>
      <dl>{pitfalls.map(item => <div key={item.title}><dt>{item.title}</dt><dd>{item.text}</dd></div>)}</dl>
    </section>
    <details className="source-note"><summary>资料出处</summary><p>超星《金工实习》原课 {chapterId} · 按章节主题编写。</p>
      {chapterId === '8.5' && <a href="https://images-na.ssl-images-amazon.com/images/I/D1kzgLVVV2S.pdf#page=147" target="_blank" rel="noreferrer">查阅 GSK980TDb 用户手册（英文 PDF）</a>}
      {chapterId === '8.6' && <a href="https://cad.caxa.com/pc/functionNCL" target="_blank" rel="noreferrer">查阅 CAXA 数控车功能说明</a>}
    </details>
  </article>;
}
