import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';

const require = process.env.METALWORK_SQL_TEST_RUNTIME
  ? createRequire(resolve(process.env.METALWORK_SQL_TEST_RUNTIME, 'package.json'))
  : createRequire(import.meta.url);
const { PGlite } = require('@electric-sql/pglite');

test('Chaoxing account bindings are private and browser proofs are consumed once', async () => {
  const db = new PGlite();
  const id = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
  const challenge = 'a'.repeat(64);
  const origin = 'https://class.example.test';
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable
      as 'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
      grant usage on schema auth to anon, authenticated;
    `);
    await db.exec(await readFile(new URL('../migrations/20261109000100_course_evidence.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../migrations/20261117000100_chaoxing_login.sql', import.meta.url), 'utf8'));
    await db.query('insert into auth.users (id) values ($1), ($2)', [id(1), id(2)]);
    await db.query(`
      insert into public.metalwork_profiles (user_id, display_name, class_name, role)
      values ($1, '测试学生一', '2026机械一班', 'student'), ($2, '测试学生二', '2026机械二班', 'student')
    `, [id(1), id(2)]);
    const bind = (fid, uid, userId) => db.query(`
      insert into public.metalwork_chaoxing_accounts (fid, uid, user_id) values ($1, $2, $3)
    `, [fid, uid, userId]);
    const createFlow = flowId => db.query(`
      insert into public.metalwork_chaoxing_login_flows (id, challenge, origin) values ($1, $2, $3)
      returning id, created_at, expires_at
    `, [flowId, challenge, origin]);
    const consume = (flowId, proof = challenge, requestOrigin = origin) => db.query(`
      delete from public.metalwork_chaoxing_login_flows
      where id = $1 and challenge = $2 and origin = $3 and expires_at > now()
      returning id
    `, [flowId, proof, requestOrigin]);

    await bind('school-1', 'student-1', id(1));
    await assert.rejects(() => bind('school-1', 'student-1', id(2)), { code: '23505' });
    await assert.rejects(() => bind('school-1', 'student-other', id(1)), { code: '23505' });
    await assert.rejects(() => bind('school-1', 'unknown-account', id(99)), { code: '23503' });
    await assert.rejects(() => bind('school\n1', 'student-2', id(2)), { code: '23514' });
    await assert.rejects(() => bind('school-1', '', id(2)), { code: '23514' });
    await assert.rejects(() => bind('school-1', 'x'.repeat(257), id(2)), { code: '23514' });

    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      for (const table of ['metalwork_chaoxing_accounts', 'metalwork_chaoxing_login_flows']) {
        await assert.rejects(() => db.query(`select * from public.${table}`), { code: '42501' });
        await assert.rejects(() => db.query(`delete from public.${table}`), { code: '42501' });
      }
      await assert.rejects(() => bind('school-1', 'student-2', id(2)), { code: '42501' });
      await assert.rejects(() => createFlow(id(10)), { code: '42501' });
      await db.exec('reset role');
    }

    await db.exec('set role service_role');
    assert.equal((await db.query('select user_id from public.metalwork_chaoxing_accounts')).rows[0].user_id, id(1));
    await assert.rejects(() => bind('school-1', 'student-2', id(2)), { code: '42501' });
    const flow = (await createFlow(id(10))).rows[0];
    assert.equal(new Date(flow.expires_at) - new Date(flow.created_at), 300_000);
    await assert.rejects(() => db.query(`
      insert into public.metalwork_chaoxing_login_flows (id, challenge, origin, expires_at)
      values ($1, $2, $3, '2099-01-01')
    `, [id(11), challenge, origin]), { code: '42501' });
    await assert.rejects(() => db.query('update public.metalwork_chaoxing_login_flows set expires_at = now()'), { code: '42501' });
    assert.deepEqual((await consume(id(10), 'b'.repeat(64))).rows, []);
    assert.deepEqual((await consume(id(10), challenge, 'https://other.example.test')).rows, []);
    assert.equal((await db.query('select count(*)::int as count from public.metalwork_chaoxing_login_flows')).rows[0].count, 1);
    const consumed = await Promise.all([consume(id(10)), consume(id(10))]);
    assert.equal(consumed.reduce((count, result) => count + result.rows.length, 0), 1);
    assert.deepEqual((await consume(id(10))).rows, []);

    await db.exec('reset role');
    await db.query(`
      insert into public.metalwork_chaoxing_login_flows (id, challenge, origin, expires_at)
      values ($1, $2, $3, now() - interval '1 second')
    `, [id(12), challenge, origin]);
    await db.exec('set role service_role');
    assert.deepEqual((await consume(id(12))).rows, []);
    await db.exec('reset role');
    await db.query('delete from public.metalwork_profiles where user_id = $1', [id(1)]);
    assert.deepEqual((await db.query('select * from public.metalwork_chaoxing_accounts')).rows, []);
  } finally {
    await db.close();
  }
});
