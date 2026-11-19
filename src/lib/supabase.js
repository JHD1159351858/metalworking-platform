import { createClient } from '@supabase/supabase-js';
import { chaoxingLoginEnabled } from '../chaoxing-login.js';
import { isBrowserKey } from '../supabase-key.js';

const standaloneUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const standaloneKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const standaloneRequested = Boolean(standaloneUrl || standaloneKey || chaoxingLoginEnabled);
const platformUrl = import.meta.env.CODER_SUPABASE_URL?.trim();
const platformKey = import.meta.env.CODER_SUPABASE_ANON_KEY?.trim();
const tenantId = import.meta.env.CODER_SUPABASE_TENANT_ID?.trim();

export const platformCloud = !standaloneRequested && Boolean(platformUrl || platformKey || tenantId);
export const cloudRequested = standaloneRequested || platformCloud;

function validEndpoint(url) {
  try {
    const endpoint = new URL(url);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname);
    return !endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash
      && (endpoint.protocol === 'https:' || (endpoint.protocol === 'http:' && (platformCloud || local)));
  } catch {
    return false;
  }
}

const url = platformCloud ? platformUrl : standaloneUrl;
const anonKey = platformCloud ? platformKey : standaloneKey;
export const cloudConfig = url && validEndpoint(url) && isBrowserKey(anonKey) && (!platformCloud || tenantId)
  ? { url, anonKey, ...(platformCloud ? { tenantId } : {}) }
  : null;
export const hasCloud = Boolean(cloudConfig);
let cached = null;

// 平台网关请求使用租户路由头，独立 Supabase 直接连接项目。
export function getSupabase() {
  if (cached) return cached;
  if (!cloudConfig) throw new Error('云端存档尚未配置。');
  cached = createClient(cloudConfig.url, cloudConfig.anonKey, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    ...(platformCloud ? { global: { headers: { 'X-Instance-ID': cloudConfig.tenantId } } } : {}),
  });
  return cached;
}
