import { createClient } from '@supabase/supabase-js';

let cached = null;

function readConfig() {
  const url = import.meta.env.CODER_SUPABASE_URL;
  const anonKey = import.meta.env.CODER_SUPABASE_ANON_KEY;
  const tenantId = import.meta.env.CODER_SUPABASE_TENANT_ID;
  if (!url || !anonKey || !tenantId) return null;
  return { url, anonKey, tenantId };
}

export const cloudConfig = readConfig();
export const hasCloud = Boolean(cloudConfig);

// 懒初始化：浏览器端只创建一个客户端实例，并始终携带租户路由头。
export function getSupabase() {
  if (cached) return cached;
  if (!cloudConfig) throw new Error('云端存档尚未配置。');
  cached = createClient(cloudConfig.url, cloudConfig.anonKey, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    global: { headers: { 'X-Instance-ID': cloudConfig.tenantId } },
  });
  return cached;
}
