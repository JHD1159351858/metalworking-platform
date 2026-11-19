import { useCallback, useEffect, useState } from 'react';
import { Gear, GearSix, Bell, CaretDown, ArrowRight, CaretRight, Stack, SquaresFour, X, ChalkboardTeacher, UserCircle, Info } from '@phosphor-icons/react';
import { LearningView } from './LearningViews.jsx';
import { HomeDashboard } from './HomeDashboard.jsx';
import { GuestAccess } from './GuestAccess.jsx';
import { StartupAnimation } from './GuestHome.jsx';
import { StudyCompanion } from './StudyCompanion.jsx';
import { CloudGate } from './CloudGate.jsx';
import { PreAssessmentDialog } from './CourseEvidence.jsx';
import { CloudTeacherWorkspace, LocalTeacherWorkspace } from './TeacherWorkspace.jsx';
import { useCloudEvidence } from './cloud-evidence.js';
import { cloudRequested, getSupabase, hasCloud, platformCloud } from './lib/supabase.js';
import { courseSteps, loadRecord, rememberStudent, saveRecord } from './learning-data.js';
import { courseSuggestions } from './course-recommendations.js';
import './styles.css';
import './home-dashboard.css';
import './course-colors.css';

const trades = [
  { id: 'lathe', name: '数控车', open: true },
  { id: 'milling', name: '数控铣' },
  { id: 'wire', name: '线切割' },
  { id: 'turning', name: '普通车' },
  { id: 'fitting', name: '钳工' },
];
const defaultProfile = { id: 'demo-student', name: '学生', major: '机械设计制造及其自动化', className: '机械 2401 班' };
function readProfile() {
  try { return JSON.parse(localStorage.getItem('metal-profile')) || defaultProfile; } catch { return defaultProfile; }
}
const stepRoutes = [...courseSteps.map(step => step.id), 'tutor', 'theory'];
const routes = ['home', 'center', 'knowledge', 'records', 'teacher', ...stepRoutes];
const initialView = () => {
  const id = location.hash.slice(1);
  return id === 'tasks' ? 'center' : routes.includes(id) ? id : 'home';
};
const localLoginEnabled = import.meta.env.LOCAL_CHAOXING_ENABLED;
const localLoginErrors = {
  invalid_callback: '这次超星登录已过期，请重新登录。',
  verification_failed: '未能验证超星身份，请重新登录。',
  service_unavailable: '暂时无法连接超星认证中心，请稍后重试。',
};

export function App() {
  useEffect(() => {
    function redirectOldLink() {
      if (location.hash === '#tasks') history.replaceState(history.state, '', '#center');
    }
    redirectOldLink();
    window.addEventListener('hashchange', redirectOldLink);
    return () => window.removeEventListener('hashchange', redirectOldLink);
  }, []);
  const [teacherPassword, setTeacherPassword] = useState('');
  const clearTeacherPassword = useCallback(() => setTeacherPassword(''), []);

  async function signInTeacher(pin, credentials) {
    setTeacherPassword(pin);
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ ...credentials, email: credentials.email.trim() });
      if (!error) return true;
      setTeacherPassword('');
      return '教师账号或账号密码不正确，请核对后重试。';
    } catch {
      setTeacherPassword('');
      return '暂时无法登录课程账号，请检查网络后重试。';
    }
  }

  function renderGuest(options) {
    return <GuestAccess trades={trades}
      initialMode={initialView() === 'teacher' ? 'teacher' : initialView() !== 'home' ? 'login' : undefined}
      onVisit={clearTeacherPassword}
      onCloudTeacher={hasCloud && !platformCloud ? signInTeacher : undefined}
      {...options} />;
  }

  return <>
    {cloudRequested ? <CloudGate renderGuest={renderGuest}>{(account, signOut) => {
      if (account.role === 'teacher') return <CloudTeacherWorkspace key={account.id} profile={account} trade={trades[0]}
        onSignOut={signOut} initialPassword={teacherPassword} onPasswordUsed={clearTeacherPassword} />;
      if (teacherPassword) return <main className="app">
        <div className="modal-backdrop"><section className="modal" aria-labelledby="teacher-role-title">
          <h2 id="teacher-role-title">此账号未获教师权限</h2>
          <p>请换用管理员开通的教师账号。</p>
          <button className="button secondary" type="button" onClick={signOut}>退出账号</button>
        </section></div>
      </main>;
      return <Workspace key={account.id} account={account} onSignOut={signOut} />;
    }}</CloudGate> : <LocalApp />}
    <StartupAnimation />
  </>;
}

function LocalApp() {
  const [route, setRoute] = useState(initialView);
  const [teacherUnlocked, setTeacherUnlocked] = useState(false);
  const [account, setAccount] = useState(localLoginEnabled ? undefined : null);
  const [loginError, setLoginError] = useState(() => {
    const code = new URLSearchParams(location.search).get('chaoxing_error');
    return Object.hasOwn(localLoginErrors, code) ? localLoginErrors[code] : '';
  });

  useEffect(() => {
    if (!localLoginEnabled) return;
    const callback = new URL(location.href);
    if (callback.searchParams.has('chaoxing_error')) {
      callback.searchParams.delete('chaoxing_error');
      history.replaceState(history.state, '', callback);
    }
    const controller = new AbortController();
    fetch('/api/auth/me', { cache: 'no-store', signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then(({ account: verified }) => setAccount(verified?.role === 'student' ? verified : null))
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoginError('暂时无法读取本地登录状态，请刷新后重试。');
        setAccount(null);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const change = () => {
      const next = initialView();
      setRoute(next);
      if (next !== 'teacher') setTeacherUnlocked(false);
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const teacherRoute = route === 'teacher';
  function goHome() {
    location.hash = 'home';
    setRoute('home');
    setTeacherUnlocked(false);
  }
  async function signOut() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error();
      setAccount(null);
      setLoginError('');
      goHome();
    } catch {
      setLoginError('暂时无法退出登录，请稍后重试。');
    }
  }
  if (teacherRoute && teacherUnlocked) return <LocalTeacherWorkspace trade={trades[0]} onExit={goHome} />;
  if (account && !teacherRoute) return <Workspace account={account} local onSignOut={signOut} error={loginError} />;
  return <GuestAccess key={teacherRoute ? 'teacher' : 'guest'} trades={trades}
    initialMode={teacherRoute ? 'teacher' : route !== 'home' ? 'login' : undefined}
    onDismiss={route !== 'home' ? goHome : undefined}
    authError={loginError}
    oauthBusy={account === undefined}
    onChaoxing={localLoginEnabled ? () => location.assign('/api/auth/chaoxing/start') : undefined}
    onLocalTeacher={() => {
      location.hash = 'teacher';
      setRoute('teacher');
      setTeacherUnlocked(true);
    }} />;
}

function studentView() {
  const view = initialView();
  return view === 'teacher' ? 'home' : view;
}

function Workspace({ account, onSignOut, local, error }) {
  const [view, setView] = useState(studentView);
  const [studyTarget, setStudyTarget] = useState(null);
  const [studyContext, setStudyContext] = useState(null);
  const [trade, setTrade] = useState(trades[0]);
  const [profile, setProfile] = useState(() => account || readProfile());
  const cloud = Boolean(account && !local);
  const evidence = useCloudEvidence(cloud && trade.open ? account.id : undefined, trade.id);
  const [dialog, setDialog] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [identity, setIdentity] = useState(profile);
  const [nextView, setNextView] = useState('pre');
  const [assessmentPrompt, setAssessmentPrompt] = useState(null);
  const [, refreshRecord] = useState(0);
  const identityReady = Boolean(account || localStorage.getItem('metal-profile'));
  const localRecord = loadRecord(profile, trade);
  const assessmentScope = JSON.stringify([profile.id, trade.id]);
  const preAssessment = cloud ? evidence.data?.preAssessment : localRecord.preAssessment;
  const assessmentReady = !cloud || Boolean(evidence.data && !evidence.loading && !evidence.error);
  const theoryScreen = trade.open && ['video', 'tutor', 'theory'].includes(view);
  const showTheoryChat = theoryScreen && assessmentReady;
  const assessmentOpen = assessmentPrompt?.scope === assessmentScope ? assessmentPrompt.open : !localRecord.preAssessmentDraft?.dismissed;
  const showAssessment = trade.open && view !== 'teacher' && identityReady && assessmentReady && !preAssessment && assessmentOpen;
  const companionContext = showAssessment ? { view: 'pre' } : view === 'feedback'
    ? { view, suggestions: courseSuggestions({ ...localRecord, ...evidence.data }) }
    : ['video', 'tutor', 'theory'].includes(view) ? { ...studyContext, view } : { view };
  useEffect(() => {
    if (!cloud && identityReady) rememberStudent(profile);
  }, [cloud, identityReady, profile]);
  useEffect(() => {
    const refresh = () => refreshRecord(value => value + 1);
    window.addEventListener('learning-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('learning-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  useEffect(() => {
    if (!identityReady && trade.open && view !== 'teacher') {
      setIdentity(profile);
      setNextView(view);
      setDialog('identity');
    }
  }, [identityReady, profile, trade.open, view]);
  useEffect(() => {
    const onHash = () => {
      const next = studentView();
      if (next === 'home') {
        setStudyTarget(null);
        window.scrollTo(0, 0);
      }
      setView(next);
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    const close = e => { if (e.key === 'Escape') { setDialog(null); setMenuOpen(false); } };
    addEventListener('keydown', close);
    return () => removeEventListener('keydown', close);
  }, []);
  function navigate(id, target = null) {
    if (id === 'teacher') {
      location.hash = id;
      return;
    }
    if (id === 'pre') setAssessmentPrompt({ scope: assessmentScope, open: true });
    setStudyTarget(target);
    setView(id); location.hash = id; setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function dismissAssessment() {
    setAssessmentPrompt({ scope: assessmentScope, open: false });
    const current = loadRecord(profile, trade);
    try {
      saveRecord(profile, trade, {
        ...current,
        preAssessmentDraft: { ...current.preAssessmentDraft, dismissed: true },
      });
    } catch { /* The dialog can still close when local storage is unavailable. */ }
  }
  function begin(id = 'pre', target = null) {
    if (!trade.open) return;
    if (!account && !localStorage.getItem('metal-profile')) { setIdentity(profile); setNextView(id); setDialog('identity'); }
    else navigate(id, target);
  }
  function saveIdentity(e) {
    e.preventDefault();
    const updated = { ...identity, name: identity.name.trim(), id: identity.id.trim() };
    setProfile(updated); localStorage.setItem('metal-profile', JSON.stringify(updated)); setDialog(null); navigate(nextView);
    if (nextView === 'pre') setAssessmentPrompt({ scope: JSON.stringify([updated.id, trade.id]), open: true });
  }
  const stepId = view === 'tutor' || view === 'theory' ? 'video' : view;
  const currentTitle = courseSteps.find(step => step.id === stepId)?.title || ({ center: '学习中心', knowledge: '知识库', records: '学习记录', teacher: '教师工作台' }[view]);
  return (
    <div className={`app ${view === 'home' && trade.open ? 'home-screen' : 'inner-screen'}`}
      data-page={view === 'tutor' && studyContext?.questionId?.startsWith('case-') ? 'case' : view}>
      <header className="topbar">
        <button className="brand" onClick={() => navigate('home')} aria-label="金工实习智能体首页"><Gear weight="bold" className="brand-mark" /><span>金工实习智能体</span></button>
        <nav className="main-nav" aria-label="主导航">
          {[['home', '首页'], ['center', '学习中心'], ['knowledge', '知识库'], ['records', '学习记录']].map(([id, label]) => <button key={id} className={view === id || (id === 'center' && stepRoutes.includes(view)) ? 'active' : ''} onClick={() => navigate(id)}>{label}</button>)}
        </nav>
        <div className="header-actions">
          <button className="notification icon-button" aria-label="查看通知" onClick={() => setDialog('notifications')}><Bell size={38} /><span className="notification-dot" /></button>
          <span className="header-divider" />
          <div className="user-menu-wrap">
            <button className="user-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="用户菜单"><span className="avatar"><img src="/assets/student-avatar.png" alt="" /></span><span>{view === 'teacher' ? '教师' : profile.name}</span><CaretDown weight="bold" size={23} /></button>
            {menuOpen && <div className="user-menu">
              <div className="menu-caption">{profile.major}<br />{profile.className}</div>
              {account ? <button onClick={onSignOut}><UserCircle /> 退出登录</button> : <>
                <button onClick={() => { setIdentity(profile); setNextView(view); setDialog('identity'); setMenuOpen(false); }}><UserCircle /> 学习身份</button>
                <button onClick={() => navigate('teacher')}><ChalkboardTeacher /> 教师登录</button>
                <button onClick={onSignOut}><UserCircle /> 退出登录</button>
              </>}
              <button onClick={() => { setDialog('about'); setMenuOpen(false); }}><Info /> 使用说明</button>
            </div>}
          </div>
        </div>
      </header>
      <div className="app-layout">
        <aside className="trade-sidebar" aria-label="工种选择">
          <h2><Stack weight="duotone" /> 实习工种</h2>
          <div className="trade-list">{trades.map(t => <button key={t.id} className={`trade-button ${trade.id === t.id ? 'selected' : ''}`} aria-pressed={trade.id === t.id} onClick={() => { setTrade(t); navigate('home'); }}><img src={`/assets/trade-${t.id}.png`} className="trade-icon" alt="" /><span>{t.name}</span>{trade.id === t.id ? <CaretRight className="trade-chevron" weight="bold" /> : !t.open && <span className="trade-state">待开放</span>}</button>)}
          <button className="trade-button more-trades" onClick={() => setDialog('trades')}><SquaresFour weight="bold" className="trade-icon" /><span>更多工种</span></button></div>
          <div className="sidebar-context"><span>当前学习身份</span><strong>{profile.name} · {profile.className}</strong><p>{profile.major}</p></div>
        </aside>
        <main className={showTheoryChat ? 'main-content theory-page' : 'main-content'} id="main-content">
          {error && <p className="result-banner warning" role="alert">{error}</p>}
          {cloud && trade.open && (evidence.loading || evidence.error || !evidence.data) ? (
            <section className="view-panel empty-state">
              {evidence.error ? <><h1>暂时无法读取云端学习记录</h1><p>请检查连接后重试，问卷和反馈不会改存到本机。</p><button className="button" onClick={evidence.retry}>重新读取</button></>
                : <p role="status">正在读取云端问卷和反馈…</p>}
            </section>
          ) : view === 'home' ? trade.open ? <HomeDashboard profile={profile} trade={trade} onBegin={begin} onNavigate={navigate} evidence={evidence.data} /> : <section className="coming-soon view-panel"><span className="pill">课程筹备中</span><h1>{trade.name}实训智能体</h1><p>这个工种正在准备中</p><span className="muted">教学资料、题库与实操任务经教师配置后开放。<br />学习记录按工种独立保存。</span><div className="pending-modules">{courseSteps.map(step => <div key={step.id}><img src={`/assets/module-${step.image}.png`} alt="" /><strong>{step.title}</strong><span>待配置</span></div>)}</div><button className="button" onClick={() => { setTrade(trades[0]); navigate('home'); }}>进入数控车学习 <ArrowRight /></button></section>
          : <>
            <nav className="breadcrumb" aria-label="面包屑"><a href="#home">首页</a><CaretRight aria-hidden="true" />
              <a className="trade-link" href="#home" title={`返回${trade.name}课程首页`}>{trade.name}</a>
              <CaretRight aria-hidden="true" /><strong aria-current="page">{currentTitle}</strong></nav>
            {!trade.open && view !== 'teacher' ? <div className="view-panel empty-state"><GearSix size={52} weight="duotone" /><h2>{trade.name}课程尚未开放</h2><p>该工种暂未配置教学资料，学习记录与数控车独立。</p><button className="button" onClick={() => { setTrade(trades[0]); navigate(view); }}>查看数控车{currentTitle}</button></div> : <LearningView key={`${profile.id}-${trade.id}-${view}`} view={view} profile={profile} trade={trade} target={studyTarget} onContextChange={setStudyContext} evidence={cloud ? evidence : null} onNavigate={view === 'center' ? begin : navigate} />}
          </>}
          {showTheoryChat && <StudyCompanion key={`${profile.id}-${trade.id}`} inline profile={profile} trade={trade} context={companionContext} />}
        </main>
      </div>
      {trade.open && !theoryScreen && view !== 'teacher' && <StudyCompanion key={`${profile.id}-${trade.id}`} profile={profile} trade={trade} context={companionContext} />}
      {dialog && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setDialog(null); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close icon-button" onClick={() => setDialog(null)} aria-label="关闭弹窗"><X /></button>
        {dialog === 'identity' && <form onSubmit={saveIdentity}><span className="eyebrow">LEARNING PROFILE</span><h2 id="modal-title">先选择你的学习身份</h2><label className="field">姓名<input className="input" required pattern=".*\S.*" maxLength={20} value={identity.name} onChange={e => setIdentity({ ...identity, name: e.target.value })} /></label><label className="field">学号 / 学习编号<input className="input" required pattern=".*\S.*" maxLength={40} value={identity.id} onChange={e => setIdentity({ ...identity, id: e.target.value })} /></label><label className="field">专业<select className="input" value={identity.major} onChange={e => setIdentity({ ...identity, major: e.target.value })}><option>机械设计制造及其自动化</option><option>机械电子工程</option><option>其他专业（演示）</option></select></label><label className="field">班级<select className="input" value={identity.className} onChange={e => setIdentity({ ...identity, className: e.target.value })}><option>机械 2401 班</option><option>机械 2402 班</option><option>教师待配置班级</option></select></label><button className="button full-width" type="submit">保存并进入学习 <ArrowRight /></button><button className="button secondary full-width teacher-login-link" type="button" onClick={() => { setDialog(null); navigate('teacher'); }}>教师登录</button></form>}
        {dialog === 'notifications' && <><span className="eyebrow">NOTIFICATIONS</span><h2 id="modal-title">学习通知</h2><div className="notice-item"><span className="notice-icon"><Info weight="fill" /></span><div><strong>欢迎来到金工实习学习空间</strong><p>数控车课程已开放，可在学习中心查看四个学习阶段。</p></div></div></>}
        {dialog === 'trades' && <><span className="eyebrow">WORKSHOPS</span><h2 id="modal-title">选择你的实习工种</h2><p className="muted">本学期 11 个工种的完整名单由教师最终确认。</p><div className="trade-modal-grid">{trades.map(t => <button key={t.id} onClick={() => { setTrade(t); navigate('home'); setDialog(null); }}><img src={`/assets/trade-${t.id}.png`} width={44} height={44} alt="" /><strong>{t.name}</strong><span className={`pill ${t.open ? 'available' : ''}`}>{t.open ? '可体验' : '待开放'}</span></button>)}</div><p className="muted">其余工种将在教学内容配置完成后展示。</p></>}
        {dialog === 'about' && <><h2 id="modal-title">使用说明</h2><p>完成课前问卷后，系统按答题结果和学习需求安排第二步的起点。</p><p>{cloud ? '课前测评、问卷和课程反馈保存在账号下，同班教师可查看。视频进度、笔记、题库练习、实操记录和新提交的附件保存在当前浏览器。' : '本地学习数据按超星账号保存在当前浏览器。教师端用于查看与评价本机记录。'}</p><p>伴学使用示例资料，坐标视图用于理解走刀方向。现场上机和最终实操评价均由教师决定。</p></>}
      </section></div>}
      {showAssessment && <PreAssessmentDialog
        key={`${profile.id}-${trade.id}`}
        profile={profile}
        trade={trade}
        record={cloud ? { ...localRecord, ...evidence.data } : localRecord}
        evidence={cloud ? evidence : null}
        update={change => saveRecord(profile, trade, change(loadRecord(profile, trade)))}
        onDismiss={dismissAssessment}
        onSubmitted={() => navigate('pre')}
        onNavigate={navigate}
      />}
    </div>
  );
}
