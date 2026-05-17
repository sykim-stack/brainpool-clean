import { createClient } from '@supabase/supabase-js';

let _client = null;

export function getSupabase() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('[Storage] 환경변수 누락');
    return null;
  }
  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return _client;
}
