import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChalkboardTeacher, GraduationCap, X } from '@phosphor-icons/react';
import { GuestHome } from './GuestHome.jsx';
import { TeacherPasswordForm, verifyLocalTeacherPassword } from './TeacherLogin.jsx';

export function GuestAccess({
  trades, initialMode, onDismiss, onLocalTeacher, onCloudTeacher, onVisit,
  onChaoxing, oauthBusy, authError, emailContent,
}) {
  const [mode, setMode] = useState(initialMode ?? (authError ? 'login' : null));
  const [notice, setNotice] = useState('');
  const dialog = useRef(null);
  const isOpen = Boolean(mode);

  useEffect(() => { onVisit?.(); }, [onVisit]);

  useEffect(() => {
    if (isOpen && !dialog.current.open) dialog.current.showModal();
    else if (!isOpen && dialog.current.open) dialog.current.close();
  }, [isOpen]);

  function choose(next) {
    setNotice('');
    setMode(next);
  }

  function close() {
    choose(null);
    onDismiss?.();
  }

  return <>
    <GuestHome trades={trades} onLogin={() => choose('login')} />
    <dialog className="modal guest-login-dialog" ref={dialog} aria-labelledby="guest-login-title"
      onCancel={event => { event.preventDefault(); close(); }}
      onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="guest-login-body">
        <button className="modal-close icon-button" type="button" aria-label="关闭登录窗口" onClick={close}><X /></button>
        {mode === 'login' && <>
          <h2 id="guest-login-title">请先登录</h2>
          <p className="muted">登录后可进入实训课程和查看学习记录。</p>
          <div className="guest-login-options">
            <button className="button" type="button" disabled={oauthBusy} onClick={() => {
              if (onChaoxing) onChaoxing();
              else setNotice('当前环境尚未配置超星登录。');
            }}><GraduationCap size={21} />{oauthBusy ? '正在前往超星…' : '超星登录'}<ArrowRight size={18} /></button>
            <button className="button secondary" type="button" onClick={() => choose('teacher')}><ChalkboardTeacher size={21} />教师端登录<ArrowRight size={18} /></button>
          </div>
          {(notice || authError) && <p className="result-banner warning" role="alert">{notice || authError}</p>}
          {emailContent && <button className="guest-login-link" type="button" onClick={() => choose('email')}>课程邮箱登录</button>}
        </>}
        {mode === 'teacher' && <>
          <h2 id="guest-login-title">教师端登录</h2>
          <p className="muted">{onCloudTeacher ? '使用教师课程账号和教师密码进入工作台。'
            : onLocalTeacher ? '请输入教师密码。' : '当前部署尚未开通教师账号验证。'}</p>
          <TeacherPasswordForm cloud={Boolean(onCloudTeacher)} accountRequired={Boolean(onCloudTeacher)}
            unavailable={!onCloudTeacher && !onLocalTeacher}
            verify={onCloudTeacher || verifyLocalTeacherPassword} onUnlock={onLocalTeacher}
            onBack={() => choose('login')} backLabel="返回登录选项" />
        </>}
        {mode === 'email' && <>
          <h2 id="guest-login-title">课程邮箱登录</h2>
          {authError && <p className="result-banner warning" role="alert">{authError}</p>}
          {emailContent}
          <button className="guest-login-link" type="button" onClick={() => choose('login')}><ArrowLeft size={14} /> 返回登录选项</button>
        </>}
      </div>
    </dialog>
  </>;
}
