import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChatCircleDots, PaperPlaneRight, X } from '@phosphor-icons/react';
import { knowledge, lessons, loadRecord, saveRecord } from './learning-data.js';
import { cncChapters, unitLabel } from './cnc-course.js';
import { appendVideoTakeaway, conversationScope, getCompanionReply, getStarters, reviewPrompt } from './companion-guidance.js';
import { weldingGuidance, weldingStarters } from './welding-guidance.js';
import { weldingLessons } from './welding-course.js';
import { stageLabels } from './companion-stages.js';
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

const emptyContext = {};
function timeLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
function locationLabel(context, welding) {
  if (welding) {
    const item = weldingLessons.find(lesson => lesson.id === (context.lessonId || context.chapterId));
    return item ? [item.title, timeLabel(context.videoTime)].filter(Boolean).join(' · ') : stageLabels[context.view] || '';
  }
  const chapter = context.chapterId && (cncChapters.find(c => c.id === context.chapterId)?.id || knowledge.find(k => k.id === context.chapterId)?.chapter);
  const lesson = lessons.find(l => l.id === context.lessonId);
  if (lesson) return [lesson.title, timeLabel(context.videoTime)].filter(Boolean).join(' · ');
  if (chapter) return unitLabel(chapter);
  return stageLabels[context.view] || '';
}

function SourceExcerpt({ source }) {
  if (!source) return null;
  const material = knowledge.find(item => source.startsWith(item.source));
  const chapter = cncChapters.find(item => source.startsWith(item.id));
  const lesson = lessons.find(item => source === `课程目录 · ${item.title}`);
  const excerpt = material?.content || chapter?.keyPoints.join(' ') || lesson?.summary;
  if (!excerpt) return <small>资料来源 · {source}</small>;
  return <details className="companion-citation">
    <summary>查看依据 · {source}</summary><p>{excerpt}</p>
  </details>;
}

export function StudyCompanion({ profile, trade, context = emptyContext, inline = false }) {
  const welding = trade.id === 'welding';
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 900px)').matches);
  const [open, setOpen] = useState(false);
  const docked = inline && wide;
  const visible = docked || open;
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState(() => loadRecord(profile, trade).tutoring);
  const [noteId, setNoteId] = useState(null);
  const [summary, setSummary] = useState('');
  const [message, setMessage] = useState('');
  const panelId = useId();
  const launcher = useRef(null);
  const input = useRef(null);
  const transcript = useRef(null);
  useEffect(() => {
    if (!inline) return;
    const media = window.matchMedia('(min-width: 900px)');
    const resize = () => setWide(media.matches);
    resize();
    media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  }, [inline]);
  const ask = useCallback((question, current = context) => {
    if (context.examActive || current.examActive) return;
    const text = question.trim().slice(0, 3000);
    if (!text) return;
    const record = loadRecord(profile, trade);
    const guidance = welding
      ? { ...weldingGuidance(text, current, record), scope: conversationScope(current) }
      : getCompanionReply(text, current, record);
    if (!guidance) return;
    const turn = {
      id: crypto.randomUUID(), at: new Date().toISOString(), query: text, ...guidance,
      location: locationLabel(current, welding), lessonId: current.lessonId, chapterId: current.chapterId,
      videoTime: current.videoTime,
    };
    const tutoring = [...record.tutoring, turn];
    try {
      saveRecord(profile, trade, { ...record, tutoring });
    } catch {
      setMessage('对话保存失败，请检查浏览器存储空间后重试。');
      return;
    }
    if (guidance.isHint && current.questionId?.startsWith('case-')) {
      window.dispatchEvent(new CustomEvent('case-help-used', { detail: { questionId: current.questionId } }));
    }
    setHistory(tutoring);
    setQuery('');
    setNoteId(null);
    setMessage('');
    input.current?.focus({ preventScroll: true });
  }, [profile, trade, context, welding]);

  useEffect(() => {
    const receive = event => {
      if (context.examActive || typeof event.detail?.question !== 'string') return;
      const detail = event.detail;
      if (!docked) setOpen(true);
      const current = { ...context, ...detail, view: context.view };
      const note = typeof detail.note === 'string' ? detail.note.trim() : '';
      const question = note && !detail.question.includes(note) ? `${detail.question}\n${note}` : detail.question;
      ask(question, current);
    };
    window.addEventListener('companion-question', receive);
    return () => window.removeEventListener('companion-question', receive);
  }, [ask, context, docked]);

  useEffect(() => {
    if (open && !docked && !context.examActive) input.current?.focus({ preventScroll: true });
  }, [open, docked, context.examActive]);
  useEffect(() => {
    if (visible && transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [history, visible, noteId]);
  useEffect(() => {
    setQuery('');
    setNoteId(null);
    setMessage('');
  }, [context.view, context.chapterId, context.lessonId, context.examActive]);

  function close() {
    setOpen(false);
    launcher.current?.focus({ preventScroll: true });
  }
  function saveNote() {
    if (context.examActive) return;
    const next = appendVideoTakeaway(loadRecord(profile, trade), noteId, summary, welding ? weldingLessons : lessons);
    if (!next) { setMessage('请填写要点，并确认该节笔记在 3000 字以内。'); return; }
    try {
      saveRecord(profile, trade, next);
      setHistory(next.tutoring);
      setNoteId(null);
      setMessage('已加入这段视频的随堂笔记。');
    } catch { setMessage('笔记保存失败，请稍后重试。'); }
  }

  const starters = welding ? weldingStarters(context) : getStarters(context);
  const visibleHistory = context.view === 'pre' ? history.filter(turn => turn.scope === conversationScope(context)) : history;
  if (!welding && visible && !context.examActive && !stageLabels[context.view] && !context.lessonId && !context.chapterId &&
      loadRecord(profile, trade).attempts.length) starters.unshift(reviewPrompt);
  return (
    <div className={docked ? 'study-companion companion-docked' : 'study-companion'} onKeyDown={event => {
      if (event.key === 'Escape' && open && !docked) { event.stopPropagation(); close(); }
    }}>
      {visible && (
        <section id={panelId} className="companion-panel" aria-labelledby={`${panelId}-title`}>
          <header className="companion-header">
            <CompanionAvatar />
            <div>
              <h2 id={`${panelId}-title`}>{inline ? 'AI 伴学' : '智能伴学'}</h2>
              <p>{context.examActive ? '综合测评作答中' : (locationLabel(context, welding) || trade.name)}</p>
            </div>
            {!docked && <button type="button" className="companion-close" aria-label="关闭伴学窗口" onClick={close}><X size={19} /></button>}
          </header>
          {context.examActive ? <p className="companion-exam">请独立完成本次综合测评。交卷后可以查看解析、询问错题，再继续之前的对话。</p> : <>
            <div className="companion-transcript" ref={transcript} role="log" aria-label="伴学对话">
              {!visibleHistory.length && <p>{context.view === 'pre' ? '这里可以了解问卷用途和保存方式。' : '说说你卡在哪一步，或从下面的问题开始。'}</p>}
              {visibleHistory.map((turn, index) => (
                <div className="companion-turn" key={turn.id}>
                  {turn.location && <small className="companion-location">{turn.chapterId && turn.location === `第 ${turn.chapterId} 节` ? unitLabel(turn.chapterId) : turn.location}</small>}
                  <p className="companion-question"><span className="companion-sr-only">你的问题：</span>{turn.query}</p>
                  <div className="companion-answer">
                    <p>{turn.reply || '这条历史记录保存了你的提问。可以在下方重新提问。'}</p>
                    <SourceExcerpt source={turn.source} />
                    {turn.lessonId && turn.reply && <button type="button" className="companion-note-link" disabled={turn.noted}
                      onClick={() => { setSummary(turn.reply); setNoteId(turn.id); setMessage(''); }}>{turn.noted ? '已加入随堂笔记' : '整理成随堂笔记'}</button>}
                  </div>
                  {noteId === turn.id && <div className="companion-notepad">
                    <label>用自己的话记一条要点<textarea className="textarea" rows={3} maxLength={3000} value={summary} onChange={e => setSummary(e.target.value)} /></label>
                    <div><button type="button" className="button secondary" disabled={!summary.trim()} onClick={saveNote}>存入原视频笔记</button>
                      <button type="button" className="button ghost" onClick={() => setNoteId(null)}>取消</button></div>
                  </div>}
                  {index === visibleHistory.length - 1 && turn.scope === conversationScope(context) && turn.options?.length > 0 &&
                    <div className="companion-starters">{turn.options.map(option => <button key={option} type="button" onClick={() => ask(option)}>{option}</button>)}</div>}
                </div>
              ))}
            </div>
            <form className="companion-form" onSubmit={e => { e.preventDefault(); ask(query); }}>
              {(!visibleHistory.length || visibleHistory.at(-1)?.scope !== conversationScope(context) || stageLabels[context.view]) &&
                <div className="companion-starters companion-context-questions">{starters.map(text => <button type="button" key={text} onClick={() => ask(text)}>{text}</button>)}</div>}
              <div className="companion-compose">
                <input ref={input} className="input" aria-label="伴学问题" placeholder="输入你的疑问或回答…" value={query} maxLength={600} onChange={e => setQuery(e.target.value)} />
                <button className="button" type="submit" aria-label="发送问题" disabled={!query.trim()}><PaperPlaneRight weight="fill" size={17} /></button>
              </div>
              {message && <small role="status">{message}</small>}
            </form>
          </>}
        </section>
      )}
      {!docked && <button ref={launcher} type="button" className="companion-launcher" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => open ? close() : setOpen(true)}>
        <CompanionAvatar /><span>智能伴学</span><ChatCircleDots size={18} weight="duotone" />
      </button>}
    </div>
  );
}
