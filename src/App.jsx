import { useEffect, useState } from 'react';
import { Gear, GearSix, Bell, CaretDown, ArrowRight, CaretRight, Stack, SquaresFour, X, ChalkboardTeacher, UserCircle, Info, ShieldCheck } from '@phosphor-icons/react';
import { LearningView } from './LearningViews.jsx';
import { HomeDashboard } from './HomeDashboard.jsx';
import './styles.css';
import './home-dashboard.css';

const trades = [
  { id: 'lathe', name: '数控车', open: true },
  { id: 'milling', name: '数控铣' },
  { id: 'wire', name: '线切割' },
  { id: 'turning', name: '普通车' },
  { id: 'fitting', name: '钳工' },
];
const modules = [
  { id: 'video', title: '视频学习', image: 'video' },
  { id: 'tutor', title: '辅导学习', image: 'tutor' },
  { id: 'theory', title: '理论考核', image: 'exam' },
  { id: 'practical', title: '实操考核', image: 'practical' },
];
const defaultProfile = { id: 'demo-student', name: '学生', major: '机械设计制造及其自动化', className: '机械 2401 班' };
function readProfile() {
  try { return JSON.parse(localStorage.getItem('metal-profile')) || defaultProfile; } catch { return defaultProfile; }
}
const routes = ['home', 'center', 'knowledge', 'records', 'teacher', ...modules.map(m => m.id)];
const initialView = () => routes.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';

export function App() {
  const [view, setView] = useState(initialView);
  const [trade, setTrade] = useState(trades[0]);
  const [profile, setProfile] = useState(readProfile);
  const [dialog, setDialog] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [identity, setIdentity] = useState(profile);
  const [nextView, setNextView] = useState('video');
  useEffect(() => {
    const onHash = () => setView(initialView());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    const close = e => { if (e.key === 'Escape') { setDialog(null); setMenuOpen(false); } };
    addEventListener('keydown', close);
    return () => removeEventListener('keydown', close);
  }, []);
  function navigate(id) {
    setView(id); location.hash = id; setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function begin(id = 'video') {
    if (!trade.open) return;
    if (!localStorage.getItem('metal-profile')) { setIdentity(profile); setNextView(id); setDialog('identity'); }
    else navigate(id);
  }
  function saveIdentity(e) {
    e.preventDefault();
    const updated = { ...identity, name: identity.name.trim(), id: identity.id.trim() };
    setProfile(updated); localStorage.setItem('metal-profile', JSON.stringify(updated)); setDialog(null); navigate(nextView);
  }
  const currentTitle = modules.find(m => m.id === view)?.title || ({ center: '学习中心', knowledge: '知识库', records: '学习记录', teacher: '教师工作台' }[view]);
  return (
    <div className={`app ${view === 'home' && trade.open ? 'home-screen' : 'inner-screen'}`}>
      <header className="topbar">
        <button className="brand" onClick={() => navigate('home')} aria-label="金工实习智能体首页"><Gear weight="bold" className="brand-mark" /><span>金工实习智能体</span></button>
        <nav className="main-nav" aria-label="主导航">
          {[['home', '首页'], ['center', '学习中心'], ['knowledge', '知识库'], ['records', '学习记录']].map(([id, label]) => <button key={id} className={view === id || (id === 'center' && modules.some(m => m.id === view)) ? 'active' : ''} onClick={() => navigate(id)}>{label}</button>)}
        </nav>
        <div className="header-actions">
          <button className="notification icon-button" aria-label="查看通知" onClick={() => setDialog('notifications')}><Bell size={38} /><span className="notification-dot" /></button>
          <span className="header-divider" />
          <div className="user-menu-wrap">
            <button className="user-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="用户菜单"><span className="avatar"><img src="/assets/student-avatar.png" alt="" /></span><span>{view === 'teacher' ? '教师演示' : profile.name}</span><CaretDown weight="bold" size={23} /></button>
            {menuOpen && <div className="user-menu"><div className="menu-caption">{profile.major}<br />{profile.className}</div><button onClick={() => { setIdentity(profile); setNextView(view); setDialog('identity'); setMenuOpen(false); }}><UserCircle /> 学习身份</button><button onClick={() => navigate('teacher')}><ChalkboardTeacher /> 教师端演示</button><button onClick={() => { setDialog('about'); setMenuOpen(false); }}><Info /> 关于此原型</button></div>}
          </div>
        </div>
      </header>
      <div className="app-layout">
        <aside className="trade-sidebar" aria-label="工种选择">
          <h2><Stack weight="duotone" /> 实习工种</h2>
          <div className="trade-list">{trades.map(t => <button key={t.id} className={`trade-button ${trade.id === t.id ? 'selected' : ''}`} aria-pressed={trade.id === t.id} onClick={() => { setTrade(t); navigate('home'); }}><img src={`/assets/trade-${t.id}.png`} className="trade-icon" alt="" /><span>{t.name}</span>{trade.id === t.id ? <CaretRight className="trade-chevron" weight="bold" /> : !t.open && <span className="trade-state">待开放</span>}</button>)}
          <button className="trade-button more-trades" onClick={() => setDialog('trades')}><SquaresFour weight="bold" className="trade-icon" /><span>更多工种</span></button></div>
          <div className="sidebar-context"><span>当前学习身份</span><strong>{profile.name} · {profile.className}</strong><p>{profile.major}</p></div>
          <div className="sidebar-footer"><ShieldCheck weight="duotone" /><p>理论通过后，现场上机<br />仍需教师确认。</p></div>
        </aside>
        <main className="main-content" id="main-content">
          {view === 'home' ? trade.open ? <HomeDashboard profile={profile} trade={trade} onBegin={begin} onNavigate={navigate} /> : <section className="coming-soon view-panel"><span className="pill">课程筹备中</span><h1>{trade.name}实训智能体</h1><p>这个工种正在准备中</p><span className="muted">教学资料、题库与实操任务经教师配置后开放。<br />学习记录按工种独立保存。</span><div className="pending-modules">{modules.map(m => <div key={m.id}><img src={`/assets/module-${m.image}.png`} alt="" /><strong>{m.title}</strong><span>待配置</span></div>)}</div><button className="button" onClick={() => { setTrade(trades[0]); navigate('home'); }}>进入数控车学习 <ArrowRight /></button></section>
          : <>
            <div className="breadcrumb"><button onClick={() => navigate('home')}>首页</button><CaretRight /><span>{trade.name}</span><CaretRight /><strong>{currentTitle}</strong></div>
            {!trade.open && view !== 'teacher' ? <div className="view-panel empty-state"><GearSix size={52} weight="duotone" /><h2>{trade.name}课程尚未开放</h2><p>该工种暂未配置教学资料，学习记录与数控车独立。</p><button className="button" onClick={() => { setTrade(trades[0]); navigate(view); }}>查看数控车{currentTitle}</button></div> : <LearningView key={`${profile.id}-${trade.id}-${view}`} view={view} profile={profile} trade={trade} onNavigate={navigate} onProgress={() => {}} />}
          </>}
        </main>
      </div>
      <footer className="app-footer"><ShieldCheck weight="duotone" /><span>教学演示版 · 示例内容待教师审核 · 学习数据保存在当前浏览器</span><button onClick={() => setDialog('about')}>使用说明</button></footer>
      {dialog && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setDialog(null); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close icon-button" onClick={() => setDialog(null)} aria-label="关闭弹窗"><X /></button>
        {dialog === 'identity' && <form onSubmit={saveIdentity}><span className="eyebrow">LEARNING PROFILE</span><h2 id="modal-title">先选择你的学习身份</h2><p className="muted">用于区分当前设备上的学习记录，不连接学校账号。</p><label className="field">姓名<input className="input" required pattern=".*\S.*" maxLength={20} value={identity.name} onChange={e => setIdentity({ ...identity, name: e.target.value })} /></label><label className="field">学号 / 演示编号<input className="input" required pattern=".*\S.*" maxLength={40} value={identity.id} onChange={e => setIdentity({ ...identity, id: e.target.value })} /></label><label className="field">专业<select className="input" value={identity.major} onChange={e => setIdentity({ ...identity, major: e.target.value })}><option>机械设计制造及其自动化</option><option>机械电子工程</option><option>其他专业（演示）</option></select></label><label className="field">班级<select className="input" value={identity.className} onChange={e => setIdentity({ ...identity, className: e.target.value })}><option>机械 2401 班</option><option>机械 2402 班</option><option>教师待配置班级</option></select></label><div className="info-banner">以上专业、班级仅为界面演示，正式对应关系由教师配置。</div><button className="button full-width" type="submit">保存并进入学习 <ArrowRight /></button></form>}
        {dialog === 'notifications' && <><span className="eyebrow">NOTIFICATIONS</span><h2 id="modal-title">学习通知</h2><div className="notice-item"><span className="notice-icon"><Info weight="fill" /></span><div><strong>欢迎来到金工实习学习空间</strong><p>数控车四个学习模块已可体验。当前为前端教学演示，正式资源与考核规则待教师确认。</p><span className="muted">系统说明</span></div></div></>}
        {dialog === 'trades' && <><span className="eyebrow">WORKSHOPS</span><h2 id="modal-title">选择你的实习工种</h2><p className="muted">本学期 11 个工种的完整名单由教师最终确认。</p><div className="trade-modal-grid">{trades.map(t => <button key={t.id} onClick={() => { setTrade(t); navigate('home'); setDialog(null); }}><img src={`/assets/trade-${t.id}.png`} width={44} height={44} alt="" /><strong>{t.name}</strong><span className={`pill ${t.open ? 'available' : ''}`}>{t.open ? '可体验' : '待开放'}</span></button>)}</div><p className="muted">其余工种将在教学内容配置完成后展示。</p></>}
        {dialog === 'about' && <><span className="eyebrow">ABOUT THIS PROTOTYPE</span><h2 id="modal-title">金工实习智能体 · 教学演示</h2><p>本原型展示从视频学习、辅导学习到理论考核、实操提交和教师评价的完整界面流程。</p><div className="info-banner">所有课程资料、试题与实操任务均为示例，尚未接入学校账号、正式知识库或大模型服务。</div><p>学习数据仅保存在当前浏览器，清除浏览器数据后无法恢复；教师端用于演示流程，不代表真实权限管理。附件按页面说明记录。</p><p>AI 辅导与轨迹展示不代替教师确认或机床安全检查，现场上机和最终实操评价均由教师决定。</p></>}
      </section></div>}
    </div>
  );
}
