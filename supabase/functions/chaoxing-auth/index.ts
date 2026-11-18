import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { createChaoxingHandler, readChaoxingConfig } from './handler.js';

function createHandler() {
  const config = readChaoxingConfig(Deno.env.toObject());
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!config || !url || !serviceKey || !publicKey) return createChaoxingHandler({ config: null });

  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, serviceKey, options);
  const check = ({ error }: { error: unknown }) => { if (error) throw new Error('database_failed'); };
  const store = {
    async cleanupFlows(now: string) {
      check(await admin.from('metalwork_chaoxing_login_flows').delete().lt('expires_at', now));
    },
    async createFlow(row: { id: string; challenge: string; origin: string }) {
      check(await admin.from('metalwork_chaoxing_login_flows').insert(row));
    },
    async consumeFlow({ flowId, challenge, origin, now }: { flowId: string; challenge: string; origin: string; now: string }) {
      const result = await admin.from('metalwork_chaoxing_login_flows').delete()
        .eq('id', flowId).eq('challenge', challenge).eq('origin', origin).gt('expires_at', now).select('id').maybeSingle();
      check(result);
      return Boolean(result.data);
    },
    async findAccount(fid: string, uid: string) {
      const result = await admin.from('metalwork_chaoxing_accounts').select('user_id').eq('fid', fid).eq('uid', uid).maybeSingle();
      check(result);
      return result.data;
    },
  };
  const publicAuth = {
    verifyOtp: (params: { type: 'email'; token_hash: string }) => createClient(url, publicKey, options).auth.verifyOtp(params),
  };
  return createChaoxingHandler({ config, store, adminAuth: admin.auth.admin, publicAuth });
}

let handler;
try { handler = createHandler(); }
catch { handler = createChaoxingHandler({ config: null }); }
Deno.serve(handler);
