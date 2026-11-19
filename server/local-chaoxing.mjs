import { randomBytes } from 'node:crypto';

const FLOW_COOKIE = 'metalwork_cx_flow';
const SESSION_COOKIE = 'metalwork_cx_session';
const FLOW_SECONDS = 10 * 60;
const SESSION_SECONDS = 8 * 60 * 60;
const OPAQUE = /^[A-Za-z0-9_-]{43}$/;
const ROUTES = {
  '/api/auth/chaoxing/start': 'GET',
  '/api/auth/chaoxing/callback': 'GET',
  '/api/auth/me': 'GET',
  '/api/auth/logout': 'POST',
};

const randomToken = () => randomBytes(32).toString('base64url');
const isLoopbackHost = hostname => ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
const isLoopbackPeer = address => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);

function cookieValue(header, name) {
  const prefix = name + '=';
  const value = (header || '').split(';').map(part => part.trim()).find(part => part.startsWith(prefix))?.slice(prefix.length);
  return OPAQUE.test(value || '') ? value : null;
}

function cookie(name, value, maxAge) {
  return `${name}=${value}; Max-Age=${maxAge}; Path=/api/auth; HttpOnly; SameSite=Lax`;
}

function getActive(entries, token) {
  const entry = entries.get(token);
  if (entry && entry.expiresAt > Date.now()) return entry;
  entries.delete(token);
  return null;
}

function sendJson(response, status, body) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.writeHead(status).end(JSON.stringify(body));
}

function redirect(response, url) {
  response.writeHead(302, { Location: String(url) }).end();
}

function verifiedAccount(identity) {
  const uid = typeof identity?.uid === 'number' && Number.isSafeInteger(identity.uid) ? String(identity.uid) : identity?.uid;
  const fid = typeof identity?.fid === 'number' && Number.isSafeInteger(identity.fid) ? String(identity.fid) : identity?.fid;
  const validId = value => typeof value === 'string' && /^[A-Za-z0-9_.-]{1,128}$/.test(value);
  const displayName = typeof identity?.displayName === 'string' ? identity.displayName.trim().slice(0, 120) : '';
  if (!validId(uid) || !validId(fid)) return null;
  return {
    id: `chaoxing:${fid}:${uid}`,
    name: displayName || '超星学生',
    studentNumber: null,
    className: '未分班',
    major: '金工实习',
    role: 'student',
  };
}

export function createLocalChaoxingMiddleware({ publicUrl, centerUrl, sharedSecret, fetchImpl = fetch }) {
  const local = new URL(publicUrl);
  const center = new URL(centerUrl);
  if (local.protocol !== 'http:' || !isLoopbackHost(local.hostname) || local.href !== local.origin + '/') {
    throw new Error('Local Chaoxing requires an HTTP loopback origin.');
  }
  if ((center.protocol !== 'https:' && !(center.protocol === 'http:' && isLoopbackHost(center.hostname)))
    || center.href !== center.origin + '/' || typeof sharedSecret !== 'string' || sharedSecret.length < 16) {
    throw new Error('Invalid Chaoxing verification service configuration.');
  }
  const flows = new Map();
  const sessions = new Map();
  const callbackPath = '/api/auth/chaoxing/callback';

  async function redeem(ticket) {
    let verification;
    try {
      verification = await fetchImpl(new URL('/api/sso/verify', center), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ticket, secret: sharedSecret }),
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      return { error: 'service_unavailable' };
    }
    if (verification.status >= 500 || verification.status === 401) return { error: 'service_unavailable' };
    if (verification.ok) {
      try {
        const account = verifiedAccount(await verification.json());
        if (account) return { account };
      } catch { /* A non-JSON result cannot establish a session. */ }
    }
    return { error: 'verification_failed' };
  }

  return async function localChaoxing(request, response, next) {
    const path = request.url?.split('?')[0];
    if (!Object.hasOwn(ROUTES, path)) return next();

    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.headers.host !== local.host || !isLoopbackPeer(request.socket.remoteAddress)) {
      return sendJson(response, 403, { error: 'origin_not_allowed' });
    }
    if (request.method !== ROUTES[path]) {
      response.setHeader('Allow', ROUTES[path]);
      return sendJson(response, 405, { error: 'method_not_allowed' });
    }
    const origin = request.headers.origin;
    if ((path === '/api/auth/logout' || (origin && path !== callbackPath)) && origin !== local.origin) {
      return sendJson(response, 403, { error: 'origin_not_allowed' });
    }

    const sessionToken = cookieValue(request.headers.cookie, SESSION_COOKIE);
    const proof = cookieValue(request.headers.cookie, FLOW_COOKIE);
    if (path === '/api/auth/me') {
      return sendJson(response, 200, { account: getActive(sessions, sessionToken)?.account ?? null });
    }
    if (path === '/api/auth/logout') {
      sessions.delete(sessionToken);
      flows.delete(proof);
      response.setHeader('Set-Cookie', [cookie(SESSION_COOKIE, '', 0), cookie(FLOW_COOKIE, '', 0)]);
      return sendJson(response, 200, { ok: true });
    }
    if (path === '/api/auth/chaoxing/start') {
      for (const entries of [flows, sessions]) {
        for (const token of entries.keys()) getActive(entries, token);
      }
      flows.delete(proof);
      const state = randomToken();
      const token = randomToken();
      flows.set(token, { state, claimed: false, expiresAt: Date.now() + FLOW_SECONDS * 1000 });
      const callback = new URL(callbackPath, local);
      callback.searchParams.set('state', state);
      const authorization = new URL('/api/auth/chaoxing', center);
      authorization.searchParams.set('return_to', callback.href);
      response.setHeader('Set-Cookie', cookie(FLOW_COOKIE, token, FLOW_SECONDS));
      return redirect(response, authorization);
    }

    const query = new URL(request.url, local).searchParams;
    const flow = getActive(flows, proof);
    const state = query.get('state');
    const ticket = query.get('ticket');
    if (!flow || flow.claimed || flow.state !== state || !OPAQUE.test(ticket || '')) {
      return redirect(response, '/?chaoxing_error=invalid_callback#home');
    }

    flow.claimed = true;
    response.setHeader('Set-Cookie', cookie(FLOW_COOKIE, '', 0));
    const result = await redeem(ticket);
    if (getActive(flows, proof) !== flow) return redirect(response, '/?chaoxing_error=invalid_callback#home');
    flows.delete(proof);
    if (!result.account) return redirect(response, `/?chaoxing_error=${result.error}#home`);

    sessions.delete(sessionToken);
    const token = randomToken();
    sessions.set(token, { account: result.account, expiresAt: Date.now() + SESSION_SECONDS * 1000 });
    response.setHeader('Set-Cookie', [cookie(FLOW_COOKIE, '', 0), cookie(SESSION_COOKIE, token, SESSION_SECONDS)]);
    return redirect(response, '/#home');
  };
}
