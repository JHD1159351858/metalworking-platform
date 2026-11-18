const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROOF = /^[A-Za-z0-9_-]{43}$/;
const CHALLENGE = /^[0-9a-f]{64}$/;

function trustedUrl(value, originOnly = false) {
  try {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    if (originOnly && url.href !== `${url.origin}/`) return null;
    return url;
  } catch {
    return null;
  }
}

export function readChaoxingConfig(env) {
  const baseUrl = trustedUrl(env.CHAOXING_SSO_BASE_URL);
  const sharedSecret = env.CHAOXING_SSO_SHARED_SECRET;
  const origins = (env.CHAOXING_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  const fids = (env.CHAOXING_ALLOWED_FIDS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!baseUrl || typeof sharedSecret !== 'string' || sharedSecret.length < 16 || !origins.length || !fids.length) return null;
  const originUrls = origins.map(value => trustedUrl(value, true));
  if (originUrls.some(value => !value) || fids.some(value => !identityId(value))) return null;
  return { baseUrl: baseUrl.href, sharedSecret, allowedOrigins: originUrls.map(value => value.origin), allowedFids: fids };
}

function identityId(value) {
  if (typeof value !== 'string' && !(typeof value === 'number' && Number.isSafeInteger(value))) return null;
  const id = String(value).trim();
  return id && id.length <= 256 && !/[\u0000-\u001f\u007f]/.test(id) ? id : null;
}

async function readBody(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('invalid_request');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid_request');
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 4096) {
        await reader.cancel();
        throw new Error('invalid_request');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const body = JSON.parse(new TextDecoder().decode(bytes));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid_request');
  return body;
}

async function hashProof(verifier) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('');
}

export function createChaoxingHandler({ config, store = null, adminAuth = null, publicAuth = null, fetch: send = globalThis.fetch }) {
  return async function handle(request) {
    const origin = request.headers.get('origin');
    const allowed = Boolean(config && origin && config.allowedOrigins.includes(origin));
    const headers = {
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Origin',
    };
    if (allowed) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'content-type, apikey, authorization, x-client-info';
    }
    const result = (value, status = 200) => Response.json(value, { status, headers });
    if (!config || !store || !adminAuth || !publicAuth) return result({ error: 'configuration_missing' }, 503);
    if (!allowed) return result({ error: 'origin_not_allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return result({ error: 'method_not_allowed' }, 405);

    let body;
    try { body = await readBody(request); }
    catch { return result({ error: 'invalid_request' }, 400); }

    try {
      if (body.action === 'logout') {
        const url = new URL('/api/auth/logout', config.baseUrl);
        url.searchParams.set('return_to', new URL('/', origin).href);
        return result({ url: url.href });
      }

      if (body.action === 'start') {
        if (typeof body.challenge !== 'string' || !CHALLENGE.test(body.challenge)) return result({ error: 'invalid_request' }, 400);
        const flowId = crypto.randomUUID();
        await store.cleanupFlows(new Date().toISOString());
        await store.createFlow({ id: flowId, challenge: body.challenge, origin });
        const callback = new URL('/', origin);
        callback.searchParams.set('chaoxing_flow', flowId);
        const url = new URL('/api/auth/chaoxing', config.baseUrl);
        url.searchParams.set('return_to', callback.href);
        return result({ url: url.href, flowId });
      }

      if (body.action !== 'exchange' || typeof body.flowId !== 'string' || !ID.test(body.flowId)
        || typeof body.verifier !== 'string' || !PROOF.test(body.verifier) || typeof body.ticket !== 'string' || !PROOF.test(body.ticket)) {
        return result({ error: 'invalid_request' }, 400);
      }
      const consumed = await store.consumeFlow({
        flowId: body.flowId, challenge: await hashProof(body.verifier), origin, now: new Date().toISOString(),
      });
      if (!consumed) return result({ error: 'login_expired' }, 400);

      let verification;
      try {
        verification = await send(new URL('/api/sso/verify', config.baseUrl), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ticket: body.ticket, secret: config.sharedSecret }),
          redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000),
        });
      } catch { return result({ error: 'service_unavailable' }, 503); }
      if (!verification.ok) return result({ error: verification.status >= 500 ? 'service_unavailable' : 'verification_failed' }, verification.status >= 500 ? 503 : 400);
      let identity;
      try { identity = await verification.json(); }
      catch { return result({ error: 'verification_failed' }, 400); }
      const uid = identityId(identity?.uid);
      const fid = identityId(identity?.fid);
      if (!uid || !fid || !Array.isArray(identity?.roles)) return result({ error: 'verification_failed' }, 400);
      if (!config.allowedFids.includes(fid)) return result({ error: 'institution_not_allowed' }, 403);

      const account = await store.findAccount(fid, uid);
      if (!account || !ID.test(account.user_id)) return result({ error: 'account_not_linked' }, 403);
      const { data: accountData, error: accountError } = await adminAuth.getUserById(account.user_id);
      const user = accountData?.user;
      if (accountError || user?.id !== account.user_id || !user.email) return result({ error: 'account_not_linked' }, 403);
      const { data: linkData, error: linkError } = await adminAuth.generateLink({ type: 'magiclink', email: user.email });
      if (linkError || linkData?.user?.id !== account.user_id || !linkData.properties?.hashed_token) {
        return result({ error: 'service_unavailable' }, 503);
      }
      const { data: loginData, error: loginError } = await publicAuth.verifyOtp({ type: 'email', token_hash: linkData.properties.hashed_token });
      const session = loginData?.session;
      if (loginError || loginData?.user?.id !== account.user_id || session?.user?.id !== account.user_id
        || session.token_type?.toLowerCase() !== 'bearer' || typeof session.access_token !== 'string' || !session.access_token
        || typeof session.refresh_token !== 'string' || !session.refresh_token) {
        return result({ error: 'service_unavailable' }, 503);
      }
      return result({ access_token: session.access_token, refresh_token: session.refresh_token });
    } catch {
      return result({ error: 'service_unavailable' }, 503);
    }
  };
}
