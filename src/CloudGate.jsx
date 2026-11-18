import { useEffect, useRef, useState } from 'react';
import { cloudClient, profileFields } from './cloud-evidence.js';
import { chaoxingLoginEnabled, prepareChaoxingLogin, takeChaoxingCallback, finishChaoxingLogin, prepareChaoxingLogout } from './chaoxing-login.js';

const chaoxingCallback = chaoxingLoginEnabled ? takeChaoxingCallback() : null;

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

export function CloudGate({ children }) {
  if (!cloudClient) return <GateCard title="云端存档配置不完整">
    <p role="alert">请管理员在部署配置中填写 Supabase 项目地址和可公开的客户端密钥，然后重新构建站点。</p>
  </GateCard>;
  return <CloudSession>{children}</CloudSession>;
}

function CloudSession({ children }) {
  const [userId, setUserId] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [revision, setRevision] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [centerLogoutFailed, setCenterLogoutFailed] = useState(false);
  const [callbackPending, setCallbackPending] = useState(Boolean(chaoxingCallback));
  const callbackRequest = useRef(null);

  useEffect(() => {
    const { data: { subscription } } = cloudClient.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!chaoxingCallback) return;
    let active = true;
    callbackRequest.current ||= finishChaoxingLogin(chaoxingCallback, cloudClient);
    callbackRequest.current.then(
      () => { if (active) setCallbackPending(false); },
      error => {
        if (active) {
          setAuthError(error.message);
          setCallbackPending(false);
        }
      },
    );
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    async function verifyProfile() {
      const { data: { user }, error: authError } = await cloudClient.auth.getUser();
      if (authError || user?.id !== userId) throw new Error('无法验证登录状态。请检查网络后重试。');
      const { data, error } = await cloudClient.from('metalwork_profiles')
        .select(profileFields).eq('user_id', userId).maybeSingle();
      if (error) throw new Error('无法读取课程身份。请联系管理员检查班级名单和数据库配置。');
      if (!data || !['student', 'teacher'].includes(data.role)) return null;
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

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setAuthError('');
    try {
      const { error } = await cloudClient.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        if (error.code === 'invalid_credentials') setAuthError('邮箱或密码不正确，请核对后重试。');
        else if (error.code === 'email_not_confirmed') setAuthError('此邮箱尚未确认，请联系管理员。');
        else setAuthError('登录失败。请检查网络，或联系管理员确认账号状态。');
      } else {
        setPassword('');
      }
    } catch {
      setAuthError('登录失败。请检查网络后重试。');
    } finally {
      setBusy(false);
    }
  }

  async function signInWithChaoxing() {
    if (busy) return;
    setBusy(true);
    setAuthError('');
    try {
      const url = await prepareChaoxingLogin();
      window.location.assign(url);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function signOutCenter() {
    setBusy(true);
    setAuthError('');
    try {
      const url = await prepareChaoxingLogout();
      setCenterLogoutFailed(false);
      window.location.assign(url);
    } catch {
      setCenterLogoutFailed(true);
      setAuthError('课程账号已退出，但认证中心退出未完成。请检查网络后重试。');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setAuthError('');
    try {
      const { error } = await cloudClient.auth.signOut({ scope: 'local' });
      if (error) throw error;
      setPassword('');
      setProfile(null);
      if (chaoxingLoginEnabled) await signOutCenter();
    } catch {
      setAuthError('退出失败。请检查网络后重试。');
    } finally {
      setBusy(false);
    }
  }

  if (callbackPending) return <GateCard title="正在确认超星身份"><p role="status">正在建立课程登录会话，请稍候。</p></GateCard>;
  if (userId === undefined) return <GateCard title="正在检查登录状态"><p role="status">请稍候。</p></GateCard>;
  if (!userId) return <GateCard title="登录课程账号">
    <p>{chaoxingLoginEnabled ? '使用超星账号登录，登录后读取你的课程和班级资料。' : '请使用管理员开通的邮箱账号。课前问卷和课程反馈会保存到云端。'}</p>
    {chaoxingLoginEnabled && <button className="button full-width" onClick={signInWithChaoxing} disabled={busy}>{busy ? '正在前往超星登录…' : '超星账号登录'}</button>}
    {authError && <p className="result-banner warning" role="alert">{authError}</p>}
    {centerLogoutFailed && <button className="button secondary" onClick={signOutCenter} disabled={busy}>重试退出认证中心</button>}
    <details open={!chaoxingLoginEnabled}>
      <summary>课程邮箱登录</summary>
    <form onSubmit={signIn}>
      <label className="field">邮箱
        <input className="input" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} />
      </label>
      <label className="field">密码
        <input className="input" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
      </label>
      <button className="button" type="submit" disabled={busy}>{busy ? '正在登录…' : '登录'}</button>
    </form>
    </details>
  </GateCard>;
  if (profile?.userId !== userId || profile.revision !== revision) {
    return <GateCard title="正在确认课程身份"><p role="status">正在从班级名单中确认账号权限。</p></GateCard>;
  }
  if (profile.error || !profile.account) return <GateCard title={profile.error ? '暂时无法进入课程' : '账号尚未加入班级'}>
    <p role="alert">{profile.error || '此账号已登录。请联系管理员分配班级和角色。'}</p>
    {authError && <p role="alert">{authError}</p>}
    <div className="row">
      <button className="button" onClick={() => setRevision(value => value + 1)} disabled={busy}>重新检查</button>
      <button className="button secondary" onClick={signOut} disabled={busy}>退出登录</button>
    </div>
  </GateCard>;
  return <>
    {authError && <div className="result-banner warning" role="alert">{authError}</div>}
    {children(profile.account, signOut)}
  </>;
}
