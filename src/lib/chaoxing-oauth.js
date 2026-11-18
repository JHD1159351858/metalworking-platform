import { getSupabase } from './supabase.js';

// 平台注入的项目标识（Vite envPrefix 已包含 CODER_），用于超星授权端点。
const PROJECT_ID = import.meta.env.CODER_PROJECTS_ID;
// 本地开发走隧道地址，生产为空字符串（相对路径由网关转发）。禁止硬编码绝对地址。
const AUTH_BASE = import.meta.env.CODER_AUTH_PROXY_URL || '';
const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

const CODE_KEY = 'cx_oauth_code';
const RELAY_KEY = 'cx_checklogin_relay';
// 从发起 checklogin 导航到超星回跳的最长等待窗口。
const RELAY_WINDOW_MS = 5000;

export const chaoxingLoginEnabled = Boolean(PROJECT_ID);

export const homeUrl = () => `${window.location.origin}/`;

async function requestJson(path, init) {
  const response = await fetch(`${AUTH_BASE}${path}`, {
    ...init,
    headers: AUTH_HEADERS,
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || '超星登录服务暂时不可用，请稍后重试。');
  return body;
}

function cleanOAuthParams() {
  const url = new URL(window.location.href);
  ['code', 'state', 'userinfo'].forEach(name => url.searchParams.delete(name));
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

/**
 * 一键登录：服务端返回超星授权地址后顶层导航（fetch 跟随跨域 302 会被 CORS 拦截）。
 */
export async function startChaoxingLogin() {
  if (!chaoxingLoginEnabled) throw new Error('超星登录尚未开通，请使用邮箱登录。');
  const { authorizeUrl } = await requestJson(
    `/v1/api/coder/proxy/auth/chaoxing-oauth/authorize-url?redirect_uri=${encodeURIComponent(homeUrl())}&project_id=${encodeURIComponent(PROJECT_ID)}`,
  );
  if (typeof authorizeUrl !== 'string' || !authorizeUrl) throw new Error('未获取到超星授权地址，请稍后重试。');
  window.location.assign(authorizeUrl);
}

let inflight = null;

/**
 * 回跳闭环编排（唯一公开入口）：首次拿到 code → 暂存并中转 checklogin；
 * 中转回跳带 userinfo → 单次 exchange 换 session。并发调用共享同一次编排。
 */
export function handleOAuthLoginFlow() {
  if (inflight) return inflight;
  inflight = runOAuthFlow().finally(() => { inflight = null; });
  return inflight;
}

async function runOAuthFlow() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const userinfo = params.get('userinfo');
  const relayTs = Number(sessionStorage.getItem(RELAY_KEY) || '0');
  const inRelayWindow = relayTs > 0 && Date.now() - relayTs < RELAY_WINDOW_MS;

  if (code && !inRelayWindow) {
    sessionStorage.setItem(CODE_KEY, code);
    sessionStorage.setItem(RELAY_KEY, String(Date.now()));
    cleanOAuthParams();
    try {
      const { checkloginUrl } = await requestJson(
        `/v1/api/coder/proxy/auth/chaoxing-checklogin/url?backurl=${encodeURIComponent(homeUrl())}`,
      );
      if (typeof checkloginUrl === 'string' && checkloginUrl) {
        // 导航在途期间必须保留暂存的 code 与中转标记，等超星回跳后再兑换。
        window.location.assign(checkloginUrl);
        return { success: false };
      }
      sessionStorage.removeItem(RELAY_KEY);
    } catch {
      sessionStorage.removeItem(RELAY_KEY);
    }
  }

  // 中转窗口内既无 code 也无 userinfo：checklogin 尚未回跳，绝不兑换一次性 code。
  if (inRelayWindow && !code && !userinfo) return { success: false };

  const pendingCode = sessionStorage.getItem(CODE_KEY) || code;
  if (!pendingCode) {
    sessionStorage.removeItem(RELAY_KEY);
    cleanOAuthParams();
    return { success: false };
  }

  try {
    const session = await requestJson('/v1/api/coder/proxy/auth/chaoxing-oauth/exchange', {
      method: 'POST',
      body: JSON.stringify({
        code: pendingCode,
        projectId: PROJECT_ID,
        ...(userinfo ? { userinfo: userinfo.replace(/ /g, '+') } : {}),
      }),
    });
    if (!session?.access_token || !session?.refresh_token) {
      throw new Error('登录验证未返回有效会话，请重新发起超星登录。');
    }
    const { error } = await getSupabase().auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (error) throw new Error('无法建立课程登录会话，请重新发起超星登录。');
    return { success: true };
  } catch (error) {
    return { success: false, error: error?.message || '超星登录未完成，请重新发起登录。' };
  } finally {
    sessionStorage.removeItem(RELAY_KEY);
    sessionStorage.removeItem(CODE_KEY);
    cleanOAuthParams();
  }
}
