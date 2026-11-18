export const chaoxingLoginEnabled = import.meta.env.VITE_CHAOXING_LOGIN === 'true';
const pendingKey = 'metalwork:chaoxing:pending:v1';
const flowPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const loginErrors = {
  configuration_missing: '超星登录尚未配置完整，请联系管理员。',
  login_expired: '本次登录已过期，请重新发起超星登录。',
  verification_failed: '超星登录票据已失效，请重新登录。',
  institution_not_allowed: '当前学校尚未开通这门课程，请联系管理员。',
  account_not_linked: '超星身份已确认，请联系管理员绑定课程账号和班级。',
};

async function callBridge(body) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error(loginErrors.configuration_missing);
  let response;
  try {
    response = await fetch(new URL('/functions/v1/chaoxing-auth', url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key },
      body: JSON.stringify(body),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(35000),
    });
  } catch {
    throw new Error('暂时无法连接超星登录服务，请稍后重试。');
  }
  let result;
  try { result = await response.json(); }
  catch { throw new Error('登录服务返回异常，请重新发起登录。'); }
  if (!response.ok) throw new Error(loginErrors[result?.error] || '超星登录未完成，请重新发起登录或联系管理员。');
  return result;
}

export async function prepareChaoxingLogin() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const result = await callBridge({ action: 'start', challenge });
  if (!flowPattern.test(result?.flowId)) throw new Error('登录服务返回异常，请重新发起登录。');
  let redirect;
  let callback;
  try {
    redirect = new URL(result.url);
    callback = new URL(redirect.searchParams.get('return_to'));
  } catch {
    throw new Error('登录地址无效，请联系管理员。');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(redirect.hostname);
  if (redirect.username || redirect.password || redirect.hash
    || (redirect.protocol !== 'https:' && !(local && redirect.protocol === 'http:'))
    || redirect.pathname !== '/api/auth/chaoxing') throw new Error('登录地址无效，请联系管理员。');
  if (callback.origin !== location.origin || callback.pathname !== '/' || callback.searchParams.get('chaoxing_flow') !== result.flowId) {
    throw new Error('登录回跳地址不匹配，请联系管理员。');
  }
  sessionStorage.setItem(pendingKey, JSON.stringify({ flowId: result.flowId, verifier, at: Date.now() }));
  return redirect.toString();
}

export function takeChaoxingCallback() {
  const url = new URL(location.href);
  if (!url.searchParams.has('chaoxing_flow') && !url.searchParams.has('ticket')) return null;
  const flowId = url.searchParams.get('chaoxing_flow');
  const ticket = url.searchParams.get('ticket');
  url.searchParams.delete('chaoxing_flow');
  url.searchParams.delete('ticket');
  history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  let pending;
  try {
    pending = JSON.parse(sessionStorage.getItem(pendingKey));
    sessionStorage.removeItem(pendingKey);
  } catch {
    return { error: loginErrors.login_expired };
  }
  if (!flowPattern.test(flowId) || !tokenPattern.test(ticket) || pending?.flowId !== flowId
    || !tokenPattern.test(pending?.verifier) || !Number.isFinite(pending?.at)
    || Date.now() - pending.at > 300000 || pending.at > Date.now()) {
    return { error: loginErrors.login_expired };
  }
  return { flowId, ticket, verifier: pending.verifier };
}

export async function finishChaoxingLogin(callback, client) {
  if (callback.error) throw new Error(callback.error);
  const result = await callBridge({ action: 'exchange', ...callback });
  if (typeof result?.access_token !== 'string' || !result.access_token
    || typeof result.refresh_token !== 'string' || !result.refresh_token) {
    throw new Error('登录服务没有返回有效会话，请重新登录。');
  }
  const { error } = await client.auth.setSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
  });
  if (error) throw new Error('无法建立课程登录会话，请重新发起超星登录。');
}

export async function prepareChaoxingLogout() {
  const result = await callBridge({ action: 'logout' });
  let url;
  try { url = new URL(result.url); }
  catch { throw new Error('认证中心退出地址无效。'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.hash || url.pathname !== '/api/auth/logout'
    || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
    || url.searchParams.get('return_to') !== new URL('/', location.origin).href) {
    throw new Error('认证中心退出地址不匹配。');
  }
  return url.href;
}
