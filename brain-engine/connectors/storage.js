// brain-engine/connectors/storage.js
// Supabase 단일 접근점
// 모든 엔진은 여기서만 가져간다
// throw 금지 → null 반환

let _client = null;

export async function getStorage() {
  if (_client) return _client;

  const { createClient } = await import('@supabase/supabase-js');

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