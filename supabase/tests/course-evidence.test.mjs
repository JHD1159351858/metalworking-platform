import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';

// Install @electric-sql/pglite in an isolated directory and point
// METALWORK_SQL_TEST_RUNTIME there to exercise the migration without a live project.
const require = process.env.METALWORK_SQL_TEST_RUNTIME
  ? createRequire(resolve(process.env.METALWORK_SQL_TEST_RUNTIME, 'package.json'))
  : createRequire(import.meta.url);
const { PGlite } = require('@electric-sql/pglite');

test('course evidence scores on write and isolates students and teachers by membership', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      alter default privileges in schema public grant all on tables to anon, authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable
      as 'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
      grant usage on schema auth to anon, authenticated;
    `);
    await db.exec(await readFile(new URL('../migrations/20261109000100_course_evidence.sql', import.meta.url), 'utf8'));

    const id = number => `00000000-0000-4000-8000-00000000000${number}`;
    const [first, peer, other, teacher, otherTeacher, unassigned] = [1, 2, 3, 4, 5, 6].map(id);
    for (const userId of [first, peer, other, teacher, otherTeacher, unassigned]) {
      await db.query('insert into auth.users (id) values ($1)', [userId]);
    }
    await db.query(`
      insert into public.metalwork_profiles (user_id, display_name, student_number, class_name, role)
      values ($1, '甲同学', '101', '2026机械甲班', 'student'), ($2, '乙同学', '102', '2026机械甲班', 'student'),
             ($3, '丙同学', '201', '2026机械乙班', 'student'), ($4, '甲老师', null, '2026机械甲班', 'teacher'),
             ($5, '乙老师', null, '2026机械乙班', 'teacher')
    `, [first, peer, other, teacher, otherTeacher]);
    async function signIn(userId) {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId || '']);
      await db.exec(userId ? 'set role authenticated' : 'set role anon');
    }
    function savePre(userId, answers, note = '') {
      return db.query(`
        insert into public.metalwork_pre_assessments
          (user_id, trade_id, experience, confidence, focus, note, answers)
        values ($1, 'lathe', '第一次学习', '需要从基础开始', '实训安全', $2, $3)
        on conflict (user_id, trade_id) do update
        set user_id = excluded.user_id, trade_id = excluded.trade_id, experience = excluded.experience,
            confidence = excluded.confidence, focus = excluded.focus, note = excluded.note, answers = excluded.answers
        returning user_id, score, note, updated_at
      `, [userId, note, JSON.stringify(answers)]);
    }
    function saveFeedback(userId, feedbackId, body = '希望多一些图纸练习') {
      return db.query(`
        insert into public.metalwork_course_feedback (id, user_id, trade_id, type, text)
        values ($1, $2, 'lathe', '课程建议', $3)
        on conflict (id) do nothing
        returning id, created_at
      `, [feedbackId, userId, body]);
    }
    const correct = { safety: '0', drawing: '1', program: '2' };
    const ids = async table => (await db.query(`select user_id from public.${table} order by user_id`)).rows.map(row => row.user_id);

    await signIn();
    for (const table of ['metalwork_profiles', 'metalwork_pre_assessments', 'metalwork_course_feedback']) {
      await assert.rejects(() => ids(table), { code: '42501' });
    }

    await signIn(unassigned);
    assert.deepEqual(await ids('metalwork_profiles'), []);
    await assert.rejects(() => savePre(unassigned, correct), { code: '42501' });

    await signIn(first);
    assert.deepEqual(await ids('metalwork_profiles'), [first]);
    const original = (await savePre(first, { ...correct, safety: '2' })).rows[0];
    assert.equal(original.score, 67);
    assert.ok(original.updated_at);
    const revised = (await savePre(first, correct, '想练习看图')).rows[0];
    assert.equal(revised.score, 100);
    assert.equal(revised.note, '想练习看图');
    assert.ok(revised.updated_at >= original.updated_at);
    await assert.rejects(() => savePre(peer, correct), { code: '42501' });
    await assert.rejects(() => savePre(first, { ...correct, drawing: 1 }), { code: '23514' });
    await assert.rejects(() => savePre(first, { ...correct, extra: 'unexpected' }), { code: '23514' });
    await assert.rejects(() => savePre(first, { safety: '0', drawing: '1' }), { code: '23514' });
    await assert.rejects(() => db.query("update public.metalwork_pre_assessments set trade_id = 'milling'"), { code: '23514' });
    await assert.rejects(() => db.query("update public.metalwork_pre_assessments set updated_at = '2000-01-01'"), { code: '42501' });
    await assert.rejects(() => db.query("update public.metalwork_profiles set role = 'teacher'"), { code: '42501' });
    await assert.rejects(() => saveFeedback(peer, id(7)), { code: '42501' });
    await assert.rejects(() => saveFeedback(first, id(7), '\t\n '), { code: '23514' });
    const written = await saveFeedback(first, id(7));
    assert.equal(written.rows[0].id, id(7));
    assert.ok(written.rows[0].created_at);
    assert.deepEqual((await saveFeedback(first, id(7), '重复请求')).rows, []);
    assert.equal((await db.query('select text from public.metalwork_course_feedback')).rows[0].text, '希望多一些图纸练习');
    await assert.rejects(() => db.query('delete from public.metalwork_course_feedback'), { code: '42501' });

    await signIn(peer);
    assert.deepEqual(await ids('metalwork_pre_assessments'), []);
    assert.deepEqual(await ids('metalwork_course_feedback'), []);
    await savePre(peer, correct);
    await saveFeedback(peer, id(8));

    await signIn(other);
    await savePre(other, correct);
    await saveFeedback(other, id(9));
    assert.deepEqual(await ids('metalwork_pre_assessments'), [other]);

    await signIn(teacher);
    assert.deepEqual(await ids('metalwork_profiles'), [first, peer, teacher]);
    assert.deepEqual(await ids('metalwork_pre_assessments'), [first, peer]);
    assert.deepEqual(await ids('metalwork_course_feedback'), [first, peer]);
    await assert.rejects(() => savePre(teacher, correct), { code: '42501' });
    await assert.rejects(() => saveFeedback(teacher, id(4)), { code: '42501' });
    assert.deepEqual((await db.query("update public.metalwork_pre_assessments set note = '篡改' returning user_id")).rows, []);

    await signIn(otherTeacher);
    assert.deepEqual(await ids('metalwork_profiles'), [other, otherTeacher]);
    assert.deepEqual(await ids('metalwork_pre_assessments'), [other]);
    assert.deepEqual(await ids('metalwork_course_feedback'), [other]);
  } finally {
    await db.close();
  }
});
