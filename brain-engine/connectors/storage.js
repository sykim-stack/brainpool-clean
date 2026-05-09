// brain-engine/connectors/storage.js
// ─────────────────────────────────────────────────────────────
// Supabase 단일 접근점
// 모든 엔진은 직접 createClient 하지 않고 여기서만 가져간다
// throw 금지 → _error 반환
// ─────────────────────────────────────────────────────────────

let _client = null;

export async function getStorage() {
  if (_client) return _client;

  const { createClient } = await import('@supabase/supabase-js');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('[Storage] 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }

  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('[Storage] Supabase 연결 완료');
  return _client;
}