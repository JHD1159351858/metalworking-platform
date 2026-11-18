import assert from 'node:assert/strict';
import test from 'node:test';
import { createChaoxingHandler, readChaoxingConfig } from '../supabase/functions/chaoxing-auth/handler.js';

const origin = 'https://training.example.test';
const verifier = 'v'.repeat(43);
const ticket = 't'.repeat(43);
const userId = '00000000-0000-4000-8000-000000000001';
const config = readChaoxingConfig({
  CHAOXING_SSO_BASE_URL: 'https://auth.example.test',
  CHAOXING_SSO_SHARED_SECRET: 'server-test-secret',
  CHAOXING_ALLOWED_ORIGINS: origin,
  CHAOXING_ALLOWED_FIDS: '12345',
});

async function proof(value = verifier) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), item => item.toString(16).padStart(2, '0')).join('');
}

function fixture(options = {}) {
  const flows = new Map();
  const calls = { broker: 0, generateLink: 0, verifyOtp: 0 };
  const store = {
    async cleanupFlows() {},
    async createFlow(flow) { flows.set(flow.id, { ...flow, expires_at: Date.now() + 300_000 }); },
    async consumeFlow({ flowId, challenge, origin: requestOrigin }) {
      const flow = flows.get(flowId);
      if (!flow || flow.expires_at <= Date.now() || flow.challenge !== challenge || flow.origin !== requestOrigin) return false;
      flows.delete(flowId);
      return true;
    },
    async findAccount(fid, uid) {
      assert.equal(fid, '12345');
      assert.equal(uid, 'user-42');
      return options.unlinked ? null : { user_id: userId };
    },
  };
  const adminAuth = {
    async getUserById(id) { assert.equal(id, userId); return { data: { user: { id, email: 'student@example.test' } }, error: null }; },
    async generateLink(params) {
      calls.generateLink++;
      assert.deepEqual(params, { type: 'magiclink', email: 'student@example.test' });
      return { data: { user: { id: options.wrongGeneratedUser ? crypto.randomUUID() : userId }, properties: { hashed_token: 'server-generated-hash' } }, error: null };
    },
  };
  const publicAuth = {
    async verifyOtp(params) {
      calls.verifyOtp++;
      assert.deepEqual(params, { type: 'email', token_hash: 'server-generated-hash' });
      const id = options.wrongSessionUser ? crypto.randomUUID() : userId;
      return { data: { user: { id }, session: { user: { id }, token_type: 'bearer', access_token: 'session-access', refresh_token: 'session-refresh' } }, error: null };
    },
  };
  const fetch = async (url, request) => {
    calls.broker++;
    assert.equal(String(url), 'https://auth.example.test/api/sso/verify');
    assert.equal(request.method, 'POST');
    assert.equal(request.redirect, 'error');
    assert.equal(request.cache, 'no-store');
    assert.deepEqual(JSON.parse(request.body), { ticket, secret: config.sharedSecret });
    if (options.networkError) throw new Error('private upstream URL or secret');
    if (options.invalidTicket) return Response.json({ error: 'ticket_used' }, { status: 410 });
    return Response.json(options.identity || { uid: 'user-42', fid: '12345', roles: [], name: 'student42', displayName: '测试学生' });
  };
  const handler = createChaoxingHandler({ config: options.noConfig ? null : config, store, adminAuth, publicAuth, fetch });
  const request = (body, extra = {}) => handler(new Request('https://project.example.test/functions/v1/chaoxing-auth', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...extra.headers }, body: JSON.stringify(body),
  }));
  const start = async () => {
    const response = await request({ action: 'start', challenge: await proof() });
    assert.equal(response.status, 200);
    return response.json();
  };
  const exchange = (flowId, changes = {}, extra) => request({ action: 'exchange', flowId, verifier, ticket, ...changes }, extra);
  return { handler, request, flows, calls, start, exchange };
}

test('valid login proves the browser flow, verifies the ticket, and establishes the mapped session', async () => {
  const f = fixture();
  const started = await f.start();
  const login = new URL(started.url);
  assert.equal(login.origin, 'https://auth.example.test');
  assert.equal(login.pathname, '/api/auth/chaoxing');
  const callback = new URL(login.searchParams.get('return_to'));
  assert.equal(callback.origin, origin);
  assert.equal(callback.searchParams.get('chaoxing_flow'), started.flowId);
  const response = await f.exchange(started.flowId);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  assert.deepEqual(await response.json(), { access_token: 'session-access', refresh_token: 'session-refresh' });
  assert.deepEqual(f.calls, { broker: 1, generateLink: 1, verifyOtp: 1 });
  const replay = await f.exchange(started.flowId);
  assert.equal(replay.status, 400);
  assert.deepEqual(await replay.json(), { error: 'login_expired' });
  assert.equal(f.calls.broker, 1);
});

test('logout returns the implemented center endpoint with the exact allowed public origin', async () => {
  const f = fixture();
  const response = await f.request({ action: 'logout' });
  assert.equal(response.status, 200);
  const { url } = await response.json();
  const destination = new URL(url);
  assert.equal(destination.origin, 'https://auth.example.test');
  assert.equal(destination.pathname, '/api/auth/logout');
  assert.equal(destination.searchParams.get('return_to'), origin + '/');
  assert.deepEqual(f.calls, { broker: 0, generateLink: 0, verifyOtp: 0 });
  const denied = await f.request({ action: 'logout' }, { headers: { Origin: 'https://attacker.example.test' } });
  assert.equal(denied.status, 403);
});

test('wrong browser proof, unknown origin, and expired flow never reach the broker', async () => {
  const f = fixture();
  const { flowId } = await f.start();
  const wrongProof = await f.exchange(flowId, { verifier: 'x'.repeat(43) });
  assert.equal(wrongProof.status, 400);
  const wrongOrigin = await f.exchange(flowId, {}, { headers: { Origin: 'https://attacker.example.test' } });
  assert.equal(wrongOrigin.status, 403);
  assert.equal(wrongOrigin.headers.get('Access-Control-Allow-Origin'), null);
  f.flows.get(flowId).expires_at = 0;
  const expired = await f.exchange(flowId);
  assert.equal(expired.status, 400);
  assert.deepEqual(f.calls, { broker: 0, generateLink: 0, verifyOtp: 0 });
});

test('concurrent exchanges consume the flow only once', async () => {
  const f = fixture();
  const { flowId } = await f.start();
  const responses = await Promise.all([f.exchange(flowId), f.exchange(flowId)]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 400]);
  assert.equal(f.calls.broker, 1);
  assert.equal(f.calls.generateLink, 1);
});

test('invalid ticket and malformed identity cannot create a session', async () => {
  for (const options of [{ invalidTicket: true }, { identity: { fid: '12345', uid: 'bad\nidentity', roles: [] } }, { identity: { fid: '12345', uid: 'user-42' } }]) {
    const f = fixture(options);
    const { flowId } = await f.start();
    const response = await f.exchange(flowId);
    assert.equal(response.status, 400);
    assert.equal(f.calls.generateLink, 0);
    assert.equal(f.flows.has(flowId), false);
  }
});

test('disallowed institution and unlinked identities cannot use a course account', async () => {
  for (const options of [{ identity: { uid: 'user-42', fid: 'other-school', roles: [{ roleName: '教师' }] } }, { unlinked: true }]) {
    const f = fixture(options);
    const { flowId } = await f.start();
    const response = await f.exchange(flowId);
    assert.equal(response.status, 403);
    assert.equal(f.calls.generateLink, 0);
  }
});

test('session identity must match the administrator-bound account at both auth steps', async () => {
  for (const options of [{ wrongGeneratedUser: true }, { wrongSessionUser: true }]) {
    const f = fixture(options);
    const { flowId } = await f.start();
    const response = await f.exchange(flowId);
    assert.equal(response.status, 503);
    const result = await response.text();
    assert.ok(!result.includes('session-access'));
    assert.ok(!result.includes('server-generated-hash'));
  }
});

test('configuration, malformed input, and upstream failures fail with fixed public errors', async () => {
  const absent = fixture({ noConfig: true });
  assert.equal((await absent.request({ action: 'start', challenge: await proof() })).status, 503);
  const f = fixture({ networkError: true });
  const { flowId } = await f.start();
  for (const changes of [{ verifier: [verifier] }, { ticket: [ticket] }, { flowId: 'invalid' }]) {
    assert.equal((await f.exchange(flowId, changes)).status, 400);
  }
  assert.equal((await f.request({ action: 'start', challenge: await proof(), excessive: 'x'.repeat(4096) })).status, 400);
  const response = await f.exchange(flowId);
  assert.deepEqual(await response.json(), { error: 'service_unavailable' });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('CORS preflight permits only the configured origin and POST', async () => {
  const f = fixture();
  const preflight = await f.handler(new Request('https://project.example.test/functions/v1/chaoxing-auth', { method: 'OPTIONS', headers: { Origin: origin } }));
  assert.equal(preflight.status, 204);
  const unsupported = await f.handler(new Request('https://project.example.test/functions/v1/chaoxing-auth', { headers: { Origin: origin } }));
  assert.equal(unsupported.status, 405);
});

test('private configuration requires exact HTTPS origins and institution allowlists', () => {
  const base = { CHAOXING_SSO_BASE_URL: 'https://auth.example.test', CHAOXING_SSO_SHARED_SECRET: 'server-test-secret', CHAOXING_ALLOWED_ORIGINS: origin, CHAOXING_ALLOWED_FIDS: '12345' };
  assert.equal(readChaoxingConfig({ ...base, CHAOXING_ALLOWED_ORIGINS: '*' }), null);
  assert.equal(readChaoxingConfig({ ...base, CHAOXING_ALLOWED_ORIGINS: `${origin}/path` }), null);
  assert.equal(readChaoxingConfig({ ...base, CHAOXING_SSO_BASE_URL: 'http://auth.example.test' }), null);
  assert.equal(readChaoxingConfig({ ...base, CHAOXING_ALLOWED_FIDS: '' }), null);
  assert.ok(readChaoxingConfig({ ...base, CHAOXING_ALLOWED_ORIGINS: 'http://127.0.0.1:4173' }));
});
