import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CoreNullLayer } from '@/brain-engine/layers/CoreNullLayer';

const layer = new CoreNullLayer();

export async function POST(req: Request) {
  const traceId = crypto.randomUUID();
  const responseHeaders = { 'Content-Type': 'application/json' };

  try {
    // 1. body 읽기
    const rawBody = await req.text();
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: { code: 'INVALID_JSON', message: 'Invalid JSON', raw: rawBody.slice(0, 200) }, traceId }),
        { status: 400, headers: responseHeaders }
      );
    }

    // 2. 필수 환경 변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({
          error: { code: 'MISSING_ENV', message: 'NEXT_PUBLIC_SUPABASE_URL or ANON_KEY not set' },
          envPresent: { url: !!supabaseUrl, key: !!supabaseAnonKey },
          traceId
        }),
        { status: 500, headers: responseHeaders }
      );
    }

    // 3. Supabase 클라이언트 (세션 불필요, 단순 클라이언트로 fallback 가능)
    let supabase;
    try {
      const cookieStore = await cookies();
      supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set: () => {},
          remove: () => {},
        },
      });
    } catch (err: any) {
      // 쿠키 오류 시 service role 없이 익명 클라이언트로 재시도?
      return new Response(
        JSON.stringify({ error: { code: 'SUPABASE_CLIENT_FAILED', message: err.message }, traceId }),
        { status: 500, headers: responseHeaders }
      );
    }

    // 4. action 확인
    const action = payload.action || payload.type;
    if (!action) {
      return new Response(
        JSON.stringify({ error: { code: 'MISSING_ACTION', message: 'Request must have "action" field', received: payload }, traceId }),
        { status: 400, headers: responseHeaders }
      );
    }

    // 5. CoreNullLayer 실행
    const ctx = { traceId, payload, supabase, _error: null, result: null };
    const result = await layer.handle(ctx);

    if (result._error) {
      // DB 에러 등 상세 정보 포함
      return new Response(
        JSON.stringify({ error: result._error, traceId, debug: { action, word: payload.word } }),
        { status: result._error.code === 404 ? 404 : 500, headers: responseHeaders }
      );
    }

    return new Response(
      JSON.stringify({ result: result.result, traceId }),
      { status: 200, headers: responseHeaders }
    );
  } catch (err: any) {
    console.error('[corenull] unhandled', err);
    return new Response(
      JSON.stringify({ error: { code: 'UNHANDLED', message: err.message || 'Internal server error' }, traceId }),
      { status: 500, headers: responseHeaders }
    );
  }
}