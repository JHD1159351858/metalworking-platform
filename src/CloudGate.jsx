import { useEffect, useRef, useState } from 'react';
import { getSupabase, hasCloud, platformCloud } from './lib/supabase.js';
import { profileFields } from './cloud-evidence.js';
import { chaoxingLoginEnabled, handleOAuthLoginFlow, startChaoxingLogin } from './lib/chaoxing-oauth.js';
import { StandaloneCloudSession } from './StandaloneCloudGate.jsx';

// 暂不区分班级与身份：所有账号按学生入课，班级先记为占位值。
const DEFAULT_CLASS = '未分班';

function GateCard({ title, children }) {
  return <main className="app">
    <div className="modal-backdrop">
      <section className="modal" aria-labelledby="cloud-gate-title">
        <span className="eyebrow">金工实习智能体</span>
        <h2 id="cloud-gate-title">{title}</h2>
        {children}
      </section>
    </div>
  </main>;
}

export function CloudGate({ children, renderGuest }) {
  if (!hasCloud && renderGuest) return renderGuest({});
  if (!hasCloud) return <GateCard title="云端存档配置不完整">
    <p role="alert">{platformCloud
      ? '请确认部署平台已开启数据库能力并注入完整的 Supabase 连接信息。'
      : '请管理员检查 Supabase 项目地址和可公开的客户端密钥，然后重新构建站点。'}</p>
  </GateCard>;
  return platformCloud
    ? <CloudSession renderGuest={renderGuest}>{children}</CloudSession>
    : <StandaloneCloudSession Card={GateCard} renderGuest={renderGuest}>{children}</StandaloneCloudSession>;
}

function CloudSession({ children, renderGuest }) {
  const [userId, setUserId] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [revision, setRevision] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [identity, setIdentity] = useState({ name: '', studentNumber: '', className: '' });
  const [setupError, setSetupError] = useState('');
  // 超星账号自带姓名与 UID（user_metadata.realname / cxid），建档时直接带入。
  const [accountMeta, setAccountMeta] = useState({ realname: '', cxid: '' });
  const [autoSetupError, setAutoSetupError] = useState('');
  const [manualSetup, setManualSetup] = useState(false);
  const autoStarted = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 超星 OAuth 回跳闭环：与登录门禁同层级，未登录状态也会执行。
  useEffect(() => {
    let active = true;
    handleOAuthLoginFlow().then(result => {
      if (active && result?.error) setAuthError(result.error);
    }, error => {
      if (active) setAuthError(error?.message || '超星登录未完成，请重试。');
    });
    return () => { active = false; };
  }, []);

  // 超星账号已带姓名与 UID：手动兜底建档时直接带入。
  useEffect(() => {
    if (!accountMeta.realname && !accountMeta.cxid) return;
    setIdentity(prev => ({
      ...prev,
      name: prev.name || accountMeta.realname,
      studentNumber: prev.studentNumber || accountMeta.cxid,
    }));
  }, [accountMeta]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    async function verifyProfile() {
      const { data: { user }, error: authError } = await getSupabase().auth.getUser();
      if (authError || user?.id !== userId) throw new Error('无法验证登录状态。请检查网络后重试。');
      if (active) {
        const meta = user?.user_metadata || {};
        setAccountMeta({
          realname: typeof meta.realname === 'string' ? meta.realname.trim() : '',
          cxid: typeof meta.cxid === 'string' ? meta.cxid.trim() : '',
        });
      }
      const { data, error } = await getSupabase().from('metalwork_profiles')
        .select(profileFields).eq('user_id', userId).maybeSingle();
      if (error) throw new Error('无法读取课程身份。请检查网络或数据库配置后重试。');
      if (!data || !data.role) return null;
      return {
        id: data.user_id, name: data.display_name, studentNumber: data.student_number,
        className: data.class_name, role: data.role, major: '金工实习',
      };
    }
    verifyProfile().then(
      account => { if (active) setProfile({ userId, revision, account }); },
      error => { if (active) setProfile({ userId, revision, error: error.message }); },
    );
    return () => { active = false; };
  }, [userId, revision]);

  // 首次登录自动建档：超星账号直接用 realname / cxid，邮箱账号用邮箱前缀；身份固定学生。
  useEffect(() => {
    if (!userId) return;
    if (!profile || profile.userId !== userId || profile.revision !== revision) return;
    if (profile.error || profile.account || autoStarted.current) return;
    autoStarted.current = true;
    let active = true;
    const localPart = email.trim() ? email.trim().split('@')[0] : '';
    const displayName = accountMeta.realname
      || (accountMeta.cxid ? `学生${accountMeta.cxid.slice(-4)}` : localPart)
      || '学生';
    getSupabase().from('metalwork_profiles').insert({
      user_id: userId,
      display_name: displayName.slice(0, 40),
      student_number: accountMeta.cxid || null,
      class_name: DEFAULT_CLASS,
      role: 'student',
    }).then(({ error }) => {
      if (!active) return;
      if (error) {
        autoStarted.current = false;
        setAutoSetupError('课程档案未能自动建立，请填写姓名后重试。');
        setManualSetup(true);
        return;
      }
      setRevision(value => value + 1);
    });
    return () => { active = false; };
  }, [profile, userId, revision, accountMeta, email]);

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setAuthError('');
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        if (error.code === 'invalid_credentials') setAuthError('邮箱或密码不正确，请核对后重试。');
        else if (error.code === 'email_not_confirmed') setAuthError('此邮箱尚未确认，请改用其它邮箱或联系教师。');
        else setAuthError('登录失败。请检查网络后重试。');
      } else {
        setPassword('');
      }
    } catch {
      setAuthError('登录失败。请检查网络后重试。');
    } finally {
      setBusy(false);
    }
  }

  async function signUp(event) {
    event.preventDefault();
    setBusy(true);
    setAuthError('');
    try {
      const { data, error } = await getSupabase().auth.signUp({ email: email.trim(), password });
      if (error) {
        if (error.code === 'user_already_exists') setAuthError('该邮箱已注册，请直接登录。');
        else if (error.code === 'weak_password') setAuthError('密码强度不足，请至少使用 6 位字符。');
        else setAuthError('注册失败。请检查邮箱格式与密码强度后重试。');
        return;
      }
      setPassword('');
      if (!data.session) setAuthError('注册已提交，请查收邮箱完成确认后再登录。');
    } catch {
      setAuthError('注册失败。请检查网络后重试。');
    } finally {
      setBusy(false);
    }
  }

  async function signInWithChaoxing() {
    setAuthError('');
    setOauthBusy(true);
    try {
      await startChaoxingLogin();
    } catch (error) {
      setAuthError(error?.message || '超星登录跳转失败，请重试。');
    } finally {
      setOauthBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setAuthError('');
    try {
      const { error } = await getSupabase().auth.signOut({ scope: 'local' });
      if (error) throw error;
      setPassword('');
      setProfile(null);
      setIdentity({ name: '', studentNumber: '', className: '' });
      autoStarted.current = false;
      setManualSetup(false);
      setAutoSetupError('');
    } catch {
      setAuthError('退出失败。请检查网络后重试。');
    } finally {
      setBusy(false);
    }
  }

  async function createProfile(event) {
    event.preventDefault();
    setBusy(true);
    setSetupError('');
    try {
      const { error } = await getSupabase().from('metalwork_profiles').insert({
        user_id: userId,
        display_name: (identity.name.trim() || accountMeta.realname || '学生').slice(0, 40),
        student_number: identity.studentNumber.trim() || null,
        class_name: identity.className.trim() || DEFAULT_CLASS,
        role: 'student',
      });
      if (error) throw new Error('课程档案未保存，请稍后重试。');
      setManualSetup(false);
      setRevision(value => value + 1);
    } catch (error) {
      setSetupError(error.message || '课程档案未保存，请稍后重试。');
    } finally {
      setBusy(false);
    }
  }

  if (userId === undefined) return <GateCard title="正在检查登录状态"><p role="status">请稍候。</p></GateCard>;

  if (!userId) {
    const emailContent = <form onSubmit={mode === 'signin' ? signIn : signUp}>
      <label className="field">邮箱
        <input className="input" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} />
      </label>
      <label className="field">密码
        <input className="input" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={6} value={password} onChange={event => setPassword(event.target.value)} />
      </label>
      {!renderGuest && authError && <p className="result-banner warning" role="alert">{authError}</p>}
      <div className="row">
        <button className="button" type="submit" disabled={busy || oauthBusy}>
          {busy ? '处理中…' : mode === 'signin' ? '登录' : '注册并登录'}
        </button>
        <button className="button secondary" type="button" disabled={busy || oauthBusy}
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setAuthError(''); }}>
          {mode === 'signin' ? '没有账号，去注册' : '已有账号，去登录'}
        </button>
      </div>
    </form>;
    if (renderGuest) return renderGuest({
      onChaoxing: chaoxingLoginEnabled ? signInWithChaoxing : undefined,
      oauthBusy: busy || oauthBusy,
      authError,
      emailContent,
    });
    return <GateCard title={mode === 'signin' ? '登录课程账号' : '注册课程账号'}>
      <p>课前测评与课程反馈会保存到云端，换设备登录同一账号即可读回。</p>
      {chaoxingLoginEnabled && <div className="row">
        <button className="button secondary" type="button" disabled={busy || oauthBusy} onClick={signInWithChaoxing}>
          {oauthBusy ? '正在跳转…' : '超星账号一键登录'}
        </button>
      </div>}
      {emailContent}
    </GateCard>;
  }

  if (profile?.userId !== userId || profile.revision !== revision) {
    return <GateCard title="正在确认课程身份"><p role="status">正在读取课程档案。</p></GateCard>;
  }

  if (profile.error) return <GateCard title="暂时无法进入课程">
    <p role="alert">{profile.error}</p>
    <div className="row">
      <button className="button" onClick={() => setRevision(value => value + 1)} disabled={busy}>重新检查</button>
      <button className="button secondary" onClick={signOut} disabled={busy}>退出登录</button>
    </div>
  </GateCard>;

  if (!profile.account && !manualSetup) {
    return <GateCard title="正在建立课程档案">
      <p role="status">首次登录，正在为你创建课程档案，请稍候。</p>
    </GateCard>;
  }

  if (!profile.account) return <GateCard title="完善姓名">
    <p>{accountMeta.cxid
      ? `已从超星账号读取：${accountMeta.realname || '姓名未返回'}（账号 ${accountMeta.cxid}）。确认姓名后即可进入课程。`
      : '填写姓名后即可进入课程，之后可在学习记录中查看自己的进度。'}</p>
    <form onSubmit={createProfile}>
      <label className="field">姓名
        <input className="input" required maxLength={40} value={identity.name} onChange={event => setIdentity({ ...identity, name: event.target.value })} />
      </label>
      <label className="field">学号（选填）
        <input className="input" maxLength={40} value={identity.studentNumber} onChange={event => setIdentity({ ...identity, studentNumber: event.target.value })} />
      </label>
      {(setupError || autoSetupError || authError) && <p className="result-banner warning" role="alert">{setupError || autoSetupError || authError}</p>}
      <div className="row">
        <button className="button" type="submit" disabled={busy}>{busy ? '保存中…' : '保存并进入课程'}</button>
        <button className="button secondary" type="button" onClick={signOut} disabled={busy}>退出登录</button>
      </div>
    </form>
  </GateCard>;

  return <>{children(profile.account, signOut)}</>;
}
