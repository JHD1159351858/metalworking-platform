import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';

const require = process.env.METALWORK_SQL_TEST_RUNTIME
  ? createRequire(resolve(process.env.METALWORK_SQL_TEST_RUNTIME, 'package.json'))
  : createRequire(import.meta.url);
const { PGlite } = require('@electric-sql/pglite');
const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');

test('class data requires a current teacher session and the additional password', async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create table auth.sessions (id uuid primary key, user_id uuid not null references auth.users(id));
      create function auth.jwt() returns jsonb language sql stable
      as 'select coalesce(nullif(current_setting(''request.jwt.claims'', true), ''''), ''{}'')::jsonb';
      create function auth.uid() returns uuid language sql stable
      as 'select (auth.jwt() ->> ''sub'')::uuid';
      grant usage on schema auth to anon, authenticated;
    `);
    for (const migration of ['20261109000100_course_evidence.sql', '20261118000100_teacher_access.sql']) {
      await db.exec(await readFile(new URL(`../migrations/${migration}`, import.meta.url), 'utf8'));
    }

    const id = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
    const [student, otherStudent, teacher, otherTeacher, studentSession, teacherSession, secondSession, otherTeacherSession] =
      [1, 2, 3, 4, 5, 6, 7, 8].map(id);
    await db.query('insert into auth.users (id) values ($1), ($2), ($3), ($4)', [student, otherStudent, teacher, otherTeacher]);
    await db.query(`
      insert into auth.sessions (id, user_id) values ($1, $2), ($3, $4), ($5, $4), ($6, $7)
    `, [studentSession, student, teacherSession, teacher, secondSession, otherTeacherSession, otherTeacher]);
    await db.query(`
      insert into public.metalwork_profiles (user_id, display_name, class_name, role)
      values ($1, '甲同学', '甲班', 'student'), ($2, '乙同学', '乙班', 'student'),
             ($3, '甲老师', '甲班', 'teacher'), ($4, '乙老师', '乙班', 'teacher')
    `, [student, otherStudent, teacher, otherTeacher]);
    await db.query(`
      insert into public.metalwork_pre_assessments
        (user_id, trade_id, experience, confidence, focus, answers)
      values
        ($1, 'lathe', '第一次学习', '需要从基础开始', '实训安全', '{"safety":"0","drawing":"1","program":"2"}'),
        ($2, 'lathe', '第一次学习', '需要从基础开始', '实训安全', '{"safety":"0","drawing":"1","program":"2"}')
    `, [student, otherStudent]);
    await db.query(`
      insert into public.metalwork_course_feedback (id, user_id, trade_id, type, text)
      values ($1, $2, 'lathe', '课程建议', '甲班反馈'), ($3, $4, 'lathe', '课程建议', '乙班反馈')
    `, [id(9), student, id(10), otherStudent]);

    async function signIn(userId, sessionId) {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: userId, session_id: sessionId })]);
      await db.exec(userId ? 'set role authenticated' : 'set role anon');
    }
    const active = async () => (await db.query('select public.metalwork_teacher_access_active() as active')).rows[0].active;
    const unlock = async password => (await db.query('select public.metalwork_unlock_teacher($1) as unlocked', [password])).rows[0].unlocked;
    const ids = async table => (await db.query(`select user_id from public.${table} order by user_id`)).rows.map(row => row.user_id);

    await signIn();
    await assert.rejects(() => unlock('123456'), { code: '42501' });
    await assert.rejects(active, { code: '42501' });
    await signIn(student, studentSession);
    assert.equal(await unlock('123456'), false);
    assert.equal(await active(), false);
    assert.deepEqual(await ids('metalwork_pre_assessments'), [student]);
    await signIn(teacher, otherTeacherSession);
    assert.equal(await unlock('123456'), false);
    await signIn(teacher, 'invalid session id');
    assert.equal(await unlock('123456'), false);

    await signIn(teacher, teacherSession);
    assert.equal(await active(), false);
    assert.deepEqual(await ids('metalwork_profiles'), [teacher]);
    assert.deepEqual(await ids('metalwork_pre_assessments'), []);
    assert.deepEqual(await ids('metalwork_course_feedback'), []);
    await assert.rejects(() => db.query('select * from metalwork_private.teacher_password'), { code: '42501' });
    await assert.rejects(() => db.query('select * from metalwork_private.teacher_access'), { code: '42501' });
    assert.equal(await unlock('wrong'), false);
    assert.equal(await unlock('123456'), true);
    assert.equal(await active(), true);
    assert.deepEqual(await ids('metalwork_profiles'), [student, teacher]);
    assert.deepEqual(await ids('metalwork_pre_assessments'), [student]);
    assert.deepEqual(await ids('metalwork_course_feedback'), [student]);

    await signIn(teacher, secondSession);
    assert.equal(await active(), false);
    assert.deepEqual(await ids('metalwork_pre_assessments'), []);
    for (let attempt = 0; attempt < 5; attempt++) assert.equal(await unlock('wrong'), false);
    assert.equal(await unlock('123456'), false);

    await signIn(teacher, teacherSession);
    assert.equal(await active(), true);
    await db.exec('reset role');
    await db.query("update metalwork_private.teacher_access set expires_at = now() - interval '1 second' where session_id = $1", [teacherSession]);
    await db.query("update metalwork_private.teacher_password_attempts set expires_at = now() - interval '1 second' where user_id = $1", [teacher]);
    await signIn(teacher, teacherSession);
    assert.equal(await active(), false);
    assert.equal(await unlock('123456'), true);
    await db.exec('reset role');
    await db.query('delete from auth.sessions where id = $1', [teacherSession]);
    await signIn(teacher, teacherSession);
    assert.equal(await active(), false);
    assert.deepEqual(await ids('metalwork_pre_assessments'), []);
    assert.equal(await unlock('123456'), false);

    await signIn(otherTeacher, otherTeacherSession);
    assert.equal(await unlock('123456'), true);
    assert.deepEqual(await ids('metalwork_pre_assessments'), [otherStudent]);
  } finally {
    await db.close();
  }
});
