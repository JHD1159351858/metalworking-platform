import { useState } from 'react';
import { ChalkboardTeacher } from '@phosphor-icons/react';

export const wrongTeacherPassword = '教师密码不正确或尝试次数过多，请稍后重试。';
export const verifyLocalTeacherPassword = password => password === '123456';

export function TeacherPasswordForm({ verify, onUnlock, onBack, cloud, accountRequired, unavailable, initialError = '', backLabel }) {
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialError);

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      if (unavailable) {
        setError('请联系管理员配置教师端数据库。');
        return;
      }
      const result = await verify(password, { email: fields.get('email'), password: fields.get('accountPassword') });
      if (result === true) onUnlock?.();
      else setError(typeof result === 'string' ? result : cloud ? wrongTeacherPassword : '教师密码不正确，请重新输入。');
    } catch {
      setError('暂时无法验证教师密码，请检查连接或联系管理员。');
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit}>
    {accountRequired && <>
      <label className="field">教师账号邮箱
        <input className="input" name="email" type="email" autoComplete="username" required disabled={pending} />
      </label>
      <label className="field">账号密码
        <input className="input" name="accountPassword" type="password" autoComplete="current-password" required disabled={pending} />
      </label>
    </>}
    <label className="field">教师密码
      <input className="input" type="password" autoComplete="off" maxLength={72}
        required disabled={pending} value={password}
        onChange={event => { setPassword(event.target.value); setError(''); }} />
    </label>
    {error && <p className="result-banner warning" role="alert">{error}</p>}
    <div className="row">
      <button className="button" type="submit" disabled={pending}>{pending ? '正在验证…' : '进入教师工作台'}</button>
      <button className="button secondary" type="button" onClick={onBack} disabled={pending}>
        {backLabel || (cloud ? '退出账号' : '返回首页')}
      </button>
    </div>
  </form>;
}

export function TeacherLogin(props) {
  return <main className="app">
    <div className="modal-backdrop">
      <section className="modal teacher-login" aria-labelledby="teacher-login-title">
        <span className="teacher-login-mark"><ChalkboardTeacher size={26} weight="duotone" /></span>
        <h2 id="teacher-login-title">教师登录</h2>
        <p>请输入教师工作台的独立密码。</p>
        <TeacherPasswordForm {...props} />
      </section>
    </div>
  </main>;
}
