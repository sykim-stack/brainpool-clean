// lib/supabase.ts 수정안
let supabaseInstance = null;
export function getSupabase() {
  if (supabaseInstance) return supabaseInstance;
  // 환경 변수가 없으면 null 반환 (빌드 중단 방지)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabaseInstance = createClient(url, key);
  return supabaseInstance;
}