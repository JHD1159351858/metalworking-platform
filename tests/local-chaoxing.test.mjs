import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer, get } from 'node:http';
import test from 'node:test';
import { createLocalChaoxingMiddleware } from '../server/local-chaoxing.mjs';

const centerUrl = 'https://auth.example.test';
const sharedSecret = 'test-only-local-sso-secret';
const ticket = 't'.repeat(43);
const identity = { uid: 42, fid: '123', name: 's-42', displayName: '示例学生', roles: [{ roleName: '教师' }] };

async function fixture(t, verify = async () => Response.json(identity)) {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const publicUrl = `http://127.0.0.1:${server.address().port}`;
  let verificationCount = 0;
  const middleware = createLocalChaoxingMiddleware({
    publicUrl, centerUrl, sharedSecret,
    fetchImpl: async (url, options) => {
      verificationCount++;
      assert.equal(String(url), centerUrl + '/api/sso/verify');
      assert.equal(options.method, 'POST');
      assert.equal(options.redirect, 'error');
      assert.deepEqual(JSON.parse(options.body), { ticket, secret: sharedSecret });
      return verify();
    },
  });
  server.on('request', (request, response) => middleware(request, response, () => {
    response.writeHead(404).end();
  }));

  const request = (path, options = {}) => fetch(new URL(path, publicUrl), { redirect: 'manual', ...options });
  async function start() {
    const response = await request('/api/auth/chaoxing/start');
    assert.equal(response.status, 302);
    const provider = new URL(response.headers.get('location'));
    assert.equal(provider.origin, centerUrl);
    assert.equal(provider.pathname, '/api/auth/chaoxing');
    const callback = new URL(provider.searchParams.get('return_to'));
    assert.equal(callback.origin, publicUrl);
    assert.equal(callback.pathname, '/api/auth/chaoxing/callback');
    assert.ok(callback.searchParams.get('state'));
    callback.searchParams.set('ticket', ticket);
    const flowCookie = response.headers.get('set-cookie');
    assert.match(flowCookie, /HttpOnly/);
    assert.match(flowCookie, /SameSite=Lax/);
    return { callback, cookie: flowCookie.split(';')[0] };
  }

  return { publicUrl, request, start, verificationCount: () => verificationCount };
}

function responseCookie(response, name) {
  return response.headers.getSetCookie().find(cookie => cookie.startsWith(name + '='));
}

test('a verified center ticket establishes a local student session scoped to that browser', async t => {
  const f = await fixture(t);
  const { callback, cookie } = await f.start();
  assert.deepEqual(await (await f.request('/api/auth/me')).json(), { account: null });

  const completed = await f.request(callback, { headers: { Cookie: cookie } });
  assert.equal(completed.headers.get('location'), '/#home');
  assert.equal(completed.headers.get('referrer-policy'), 'no-referrer');
  const session = responseCookie(completed, 'metalwork_cx_session');
  assert.match(session, /HttpOnly/);
  assert.match(session, /SameSite=Lax/);
  assert.doesNotMatch(session, /s-42|123:42|test-only-local-sso-secret/);
  const headers = { Cookie: session.split(';')[0] };
  const signedIn = await f.request('/api/auth/me', { headers });
  assert.equal(signedIn.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await signedIn.json(), {
    account: { id: 'chaoxing:123:42', name: '示例学生', studentNumber: null, className: '未分班', major: '金工实习', role: 'student' },
  });
  assert.deepEqual(await (await f.request('/api/auth/me')).json(), { account: null });

  const crossOrigin = await f.request('/api/auth/logout', { method: 'POST', headers: { ...headers, Origin: 'https://outside.example.test' } });
  assert.equal(crossOrigin.status, 403);
  const loggedOut = await f.request('/api/auth/logout', { method: 'POST', headers: { ...headers, Origin: f.publicUrl } });
  assert.equal(loggedOut.status, 200);
  assert.deepEqual(await loggedOut.json(), { ok: true });
  assert.match(responseCookie(loggedOut, 'metalwork_cx_session'), /Max-Age=0/);
  assert.deepEqual(await (await f.request('/api/auth/me', { headers })).json(), { account: null });
});

test('only a matching pending flow can redeem a ticket and a concurrent replay never reaches the center', async t => {
  const f = await fixture(t);
  const { callback, cookie } = await f.start();
  const withoutCookie = await f.request(callback);
  assert.equal(withoutCookie.headers.get('location'), '/?chaoxing_error=invalid_callback#home');
  const wrongState = new URL(callback);
  wrongState.searchParams.set('state', 'x'.repeat(43));
  const wrong = await f.request(wrongState, { headers: { Cookie: cookie } });
  assert.equal(wrong.headers.get('location'), '/?chaoxing_error=invalid_callback#home');
  assert.equal(f.verificationCount(), 0);
  const responses = await Promise.all([f.request(callback, { headers: { Cookie: cookie } }), f.request(callback, { headers: { Cookie: cookie } })]);
  assert.deepEqual(responses.map(response => response.headers.get('location')).sort(), ['/#home', '/?chaoxing_error=invalid_callback#home']);
  assert.equal(f.verificationCount(), 1);
});

test('an invalid identity and an unavailable center return fixed errors without issuing a session', async t => {
  for (const [verify, error] of [
    [async () => Response.json({ uid: 42, name: 'missing institution' }), 'verification_failed'],
    [async () => Response.json({ error: 'invalid_ticket' }, { status: 410 }), 'verification_failed'],
    [async () => { throw new Error('private upstream error'); }, 'service_unavailable'],
  ]) {
    const f = await fixture(t, verify);
    const { callback, cookie } = await f.start();
    const response = await f.request(callback, { headers: { Cookie: cookie } });
    assert.equal(response.headers.get('location'), `/?chaoxing_error=${error}#home`);
    assert.equal(responseCookie(response, 'metalwork_cx_session'), undefined);
    assert.equal(await response.text(), '');
  }
});

test('the local middleware rejects other hosts and methods while passing through unrelated requests', async t => {
  const f = await fixture(t);
  const foreignHost = await new Promise((resolve, reject) => {
    get(f.publicUrl + '/api/auth/me', { headers: { Host: 'outside.example.test' } }, response => {
      response.resume();
      resolve(response.statusCode);
    }).on('error', reject);
  });
  assert.equal(foreignHost, 403);
  assert.equal((await f.request('/api/auth/logout')).status, 405);
  assert.equal((await f.request('/api/auth/me', { headers: { Origin: 'https://outside.example.test' } })).status, 403);
  assert.equal((await f.request('/assets/example.png')).status, 404);
  assert.throws(() => createLocalChaoxingMiddleware({ publicUrl: 'https://outside.example.test', centerUrl, sharedSecret }));
});
