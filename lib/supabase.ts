// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// 클라이언트 인스턴스를 캐싱하기 위한 변수
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  // 1. 인스턴스가 이미 존재하면 캐싱된 인스턴스를 반환합니다.
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // 2. 환경 변수를 직접 읽어옵니다.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 3. 값이 없는 경우, 빌드 실패 대신 명확한 오류 메시지와 함께 예외를 발생시킵니다.
  if (!url || !key) {
    throw new Error(
      'Supabase URL 또는 Key가 설정되지 않았습니다. .env.local 파일 또는 Vercel 환경 변수를 확인하세요.'
    );
  }

  // 4. 클라이언트를 생성하고 캐싱한 후 반환합니다.
  supabaseInstance = createClient(url, key);
  return supabaseInstance;
}