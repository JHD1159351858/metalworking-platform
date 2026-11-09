import { useEffect, useId, useRef, useState } from 'react';
import { ChatCircleDots, PaperPlaneRight, X } from '@phosphor-icons/react';
import { knowledge, loadRecord, saveRecord } from './learning-data.js';
import './study-companion.css';

function CompanionAvatar() {
  return (
    <svg className="companion-avatar" width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r="22" fill="#dceaff" />
      <path d="M7 38c2-7 7-10 15-10s13 3 15 10a22 22 0 0 1-30 0Z" fill="#2466d4" />
      <path d="m17 28 5 5 5-5-2-3h-6Z" fill="#f1b98e" />
      <path d="M13 16c0-6 4-9 9-9s9 3 9 9v4c0 5-4 9-9 9s-9-4-9-9Z" fill="#ffcfaa" />
      <path d="M12 17v-3a10 10 0 0 1 20 0v3c-3 0-6-2-7-5-3 3-7 4-13 5Z" fill="#183158" />
      <path d="M12 17h8l2 1 2-1h8v2h-2l-1 4h-5l-2-3-2 3h-5l-1-4h-2Z" fill="#4776ad" />
      <path d="M16 19h4l-1 2h-2Zm8 0h4l-1 2h-2Z" fill="#eaf4ff" />
      <path d="M20 25c1.4 1 2.6 1 4 0" fill="none" stroke="#a45d52" strokeLinecap="round" />
    </svg>
  );
}

function findMaterial(query) {
  const normalized = query.toLowerCase();
  const ranked = knowledge
    .map(item => ({
      item,
      matches: item.tags.filter(tag => normalized.includes(tag.toLowerCase())).length,
    }))
    .sort((a, b) => b.matches - a.matches);

  return knowledge.find(item => item.title === query)
    || (ranked[0]?.matches > (ranked[1]?.matches ?? 0) ? ranked[0].item : null);
}

export function StudyCompanion({ profile, trade }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState(() => loadRecord(profile, trade).tutoring);
  const panelId = useId();
  const launcher = useRef(null);
  const input = useRef(null);
  const transcript = useRef(null);

  useEffect(() => {
    if (open) input.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (open && transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [history, open]);

  function close() {
    setOpen(false);
    launcher.current?.focus({ preventScroll: true });
  }

  function ask(question) {
    const text = question.trim();
    if (!text) return;
    const material = findMaterial(text);
    const turn = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      query: text,
      reply: material?.content || '当前示例资料里没有找到明确对应的内容。可以补充课程章节或具体疑问。涉及设备操作与加工参数，请向现场教师确认。',
      source: material ? `${material.source} · ${material.chapter}` : '',
    };
    const record = loadRecord(profile, trade);
    const tutoring = [...record.tutoring, turn];
    saveRecord(profile, trade, { ...record, tutoring });
    setHistory(tutoring);
    setQuery('');
    input.current?.focus({ preventScroll: true });
  }

  return (
    <div className="study-companion" onKeyDown={event => {
      if (event.key === 'Escape' && open) { event.stopPropagation(); close(); }
    }}>
      {open && (
        <section id={panelId} className="companion-panel" aria-labelledby={`${panelId}-title`}>
          <header className="companion-header">
            <CompanionAvatar />
            <div>
              <h2 id={`${panelId}-title`}>智能伴学</h2>
              <p>{trade.name} · 示例资料检索</p>
            </div>
            <button type="button" className="companion-close" aria-label="关闭伴学窗口" onClick={close}><X size={19} /></button>
          </header>
          <div className="companion-transcript" ref={transcript} role="log" aria-label="伴学对话">
            {!history.length && (
              <div className="companion-welcome">
                <p>学习中遇到问题，可以在这里查找对应的课程资料。</p>
                <div className="companion-starters">
                  {knowledge.map(item => <button type="button" key={item.id} onClick={() => ask(item.title)}>{item.title}</button>)}
                </div>
              </div>
            )}
            {history.map(turn => (
              <div className="companion-turn" key={turn.id}>
                <p className="companion-question"><span className="companion-sr-only">你的问题：</span>{turn.query}</p>
                <div className="companion-answer">
                  <p>{turn.reply || '这条历史记录保存了你的提问。可以在下方重新提问。'}</p>
                  {turn.source && <small>资料来源：{turn.source}</small>}
                </div>
              </div>
            ))}
          </div>
          <form className="companion-form" onSubmit={event => { event.preventDefault(); ask(query); }}>
            <div className="companion-compose">
              <input ref={input} className="input" aria-label="伴学问题" placeholder="输入你想问的问题" value={query} maxLength={300} onChange={event => setQuery(event.target.value)} />
              <button className="button" type="submit" aria-label="发送问题" disabled={!query.trim()}><PaperPlaneRight weight="fill" size={17} /></button>
            </div>
            <small>示例资料待教师审核 · 未接入大模型</small>
          </form>
        </section>
      )}
      <button ref={launcher} type="button" className="companion-launcher" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => open ? close() : setOpen(true)}>
        <CompanionAvatar />
        <span>智能伴学</span>
        <ChatCircleDots size={18} weight="duotone" />
      </button>
    </div>
  );
}
