import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';

const require = process.env.METALWORK_SQL_TEST_RUNTIME
  ? createRequire(resolve(process.env.METALWORK_SQL_TEST_RUNTIME, 'package.json'))
  : createRequire(import.meta.url);
const { PGlite } = require('@electric-sql/pglite');

test('the first completed pre-assessment persists across retries and becomes read-only', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable
      as 'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
      grant usage on schema auth to anon, authenticated;
    `);
    await db.exec(await readFile(new URL('../migrations/20261109000100_course_evidence.sql', import.meta.url), 'utf8'));
    const first = '00000000-0000-4000-8000-000000000001';
    const second = '00000000-0000-4000-8000-000000000002';
    const teacher = '00000000-0000-4000-8000-000000000003';
    await db.query('insert into auth.users (id) values ($1), ($2), ($3)', [first, second, teacher]);
    await db.query(`
      insert into public.metalwork_profiles (user_id, display_name, class_name, role)
      values ($1, '学生甲', '2026机械甲班', 'student'),
             ($2, '学生乙', '2026机械甲班', 'student'),
             ($3, '教师甲', '2026机械甲班', 'teacher')
    `, [first, second, teacher]);

    const correct = { safety: '0', drawing: '1', program: '2' };
    function submit(userId, answers, note) {
      return db.query(`
        insert into public.metalwork_pre_assessments
          (user_id, trade_id, experience, confidence, focus, note, answers)
        values ($1, 'lathe', '第一次学习', '需要从基础开始', '实训安全', $2, $3)
        on conflict (user_id, trade_id) do nothing
        returning user_id, score, note, answers, updated_at
      `, [userId, note, JSON.stringify(answers)]);
    }
    async function signIn(userId) {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId || '']);
      await db.exec(userId ? 'set role authenticated' : 'set role anon');
    }
    async function rows() {
      return (await db.query('select user_id, score, note, answers, updated_at from public.metalwork_pre_assessments order by user_id')).rows;
    }

    await signIn(first);
    const existing = (await submit(first, { ...correct, safety: '2' }, '迁移前已提交')).rows[0];
    assert.equal(existing.score, 67);
    await db.exec('reset role');
    await db.exec(await readFile(new URL('../migrations/20261117000200_pre_assessment_once.sql', import.meta.url), 'utf8'));

    await signIn(first);
    assert.deepEqual(await rows(), [existing]);
    assert.deepEqual((await submit(first, correct, '重试时尝试替换')).rows, []);
    assert.deepEqual(await rows(), [existing]);
    await assert.rejects(() => db.query("update public.metalwork_pre_assessments set note = '修改原答案'"), { code: '42501' });
    await assert.rejects(() => db.query('delete from public.metalwork_pre_assessments'), { code: '42501' });
    await assert.rejects(() => submit(second, correct, '伪造他人提交'), { code: '42501' });

    await signIn(second);
    assert.deepEqual(await rows(), []);
    const concurrent = await Promise.all([
      submit(second, correct, '首次成功提交'),
      submit(second, { ...correct, program: '0' }, '并发重试'),
    ]);
    assert.equal(concurrent.reduce((count, result) => count + result.rows.length, 0), 1);
    const saved = (await rows())[0];
    assert.equal(saved.user_id, second);
    assert.equal(saved.score, 100);
    assert.equal(saved.note, '首次成功提交');
    assert.deepEqual(saved.answers, correct);
    assert.ok(saved.updated_at);
    assert.deepEqual((await submit(second, { ...correct, drawing: '0' }, '再次进入后提交')).rows, []);
    assert.deepEqual(await rows(), [saved]);

    await signIn(teacher);
    assert.deepEqual((await rows()).map(row => row.user_id), [first, second]);
    await assert.rejects(() => db.query("update public.metalwork_pre_assessments set note = '教师改写'"), { code: '42501' });
    await signIn();
    await assert.rejects(rows, { code: '42501' });
  } finally {
    await db.close();
  }
});
