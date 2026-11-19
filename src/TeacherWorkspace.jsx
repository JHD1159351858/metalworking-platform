import { useEffect, useRef, useState } from 'react';
import { TeacherDashboard } from './TeacherDashboard.jsx';
import { TeacherCourseEvidence } from './CourseEvidence.jsx';
import { LearningView, TeacherCourseSettings } from './LearningViews.jsx';
import { TeacherLogin, wrongTeacherPassword } from './TeacherLogin.jsx';
import { readClassEvidence } from './cloud-evidence.js';
import { getSupabase, platformCloud } from './lib/supabase.js';
import { readLocalStudents } from './learning-data.js';

export function LocalTeacherWorkspace({ trade, onExit }) {
  const [, refresh] = useState(0);
  const refreshRecords = () => refresh(value => value + 1);

  useEffect(() => {
    const update = () => refresh(value => value + 1);
    window.addEventListener('learning-updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('learning-updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return <TeacherDashboard students={readLocalStudents(trade)} trade={trade}
    scopeLabel="数据范围 · 本机学生" onRefresh={refreshRecords} onExit={onExit}
    renderStudent={student => <LearningView key={student.profile.id} view="teacher"
      profile={student.profile} trade={trade} />}>
    <details className="teacher-settings">
      <summary>考核设置</summary>
      <TeacherCourseSettings trade={trade} />
    </details>
  </TeacherDashboard>;
}

async function verify(password) {
  const { data, error } = await getSupabase().rpc('metalwork_unlock_teacher', { password });
  if (error) throw error;
  return data === true;
}

export function CloudTeacherWorkspace({ profile, trade, onSignOut, initialPassword, onPasswordUsed }) {
  const [unlocked, setUnlocked] = useState(false);
  const [students, setStudents] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [loginError, setLoginError] = useState('');
  const request = useRef(null);

  useEffect(() => {
    if (!initialPassword || platformCloud) return;
    let active = true;
    request.current ||= verify(initialPassword);
    request.current.then(
      granted => {
        if (!active) return;
        if (granted) setUnlocked(true);
        else setLoginError(wrongTeacherPassword);
        onPasswordUsed();
      },
      () => {
        if (!active) return;
        setLoginError('暂时无法验证教师密码，请检查连接或联系管理员。');
        onPasswordUsed();
      },
    );
    return () => { active = false; };
  }, [initialPassword, onPasswordUsed]);

  useEffect(() => {
    if (!unlocked) return;
    let active = true;
    async function load() {
      try {
        const { data, error: accessError } = await getSupabase().rpc('metalwork_teacher_access_active');
        if (accessError) throw accessError;
        if (!active) return;
        if (!data) {
          setStudents(null);
          setUnlocked(false);
          return;
        }
        const rows = await readClassEvidence(trade.id);
        if (active) setStudents(rows);
      } catch {
        if (active) setError('暂时无法读取班级记录，请重试。');
      }
    }
    load();
    return () => { active = false; };
  }, [trade.id, unlocked, revision]);

  function refresh() {
    setStudents(null);
    setError('');
    setRevision(value => value + 1);
  }

  if (platformCloud) return <main className="app">
    <div className="modal-backdrop">
      <section className="modal" aria-labelledby="teacher-unavailable-title">
        <h2 id="teacher-unavailable-title">教师工作台待配置</h2>
        <p>当前平台数据库尚未配置教师密码和班级权限。请联系管理员接入独立 Supabase 项目。</p>
        <button className="button secondary" type="button" onClick={onSignOut}>退出账号</button>
      </section>
    </div>
  </main>;

  if (initialPassword) return <main className="app">
    <div className="modal-backdrop"><div className="modal" role="status">正在验证教师密码…</div></div>
  </main>;
  if (!unlocked) return <TeacherLogin cloud verify={verify} initialError={loginError}
    onUnlock={() => { setLoginError(''); setUnlocked(true); }} onBack={onSignOut} />;

  return <TeacherDashboard students={students || []} trade={trade} profile={profile}
    scopeLabel={profile.className} cloud loading={!students && !error} error={error}
    onRefresh={refresh} onExit={onSignOut}
    renderStudent={student => <TeacherCourseEvidence record={student.record} />} />;
}
