import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CoreNullLayer } from '@/brain-engine/layers/CoreNullLayer';

const layer = new CoreNullLayer();

// 하이픈 액션을 카멜로 매핑
function normalizeAction(action: string): string {
  if (action === 'get-word-data') return 'getWordData';
  if (action === 'save-word') return 'saveWord';
  if (action === 'report-conflict') return 'reportConflict';
  if (action === 'resolve-conflict') return 'resolveConflict';
  return action;
}

export async function POST(req: Request) {
  const traceId = crypto.randomUUID();
  const responseHeaders = { 'Content-Type': 'application/json' };

  try {
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

    // 액션 정규화 (하이픈 → 카멜)
    const rawAction = payload.action || payload.type;
    if (!rawAction) {
      return new Response(
        JSON.stringify({ error: { code: 'MISSING_ACTION', message: 'Request must have "action" field', received: payload }, traceId }),
        { status: 400, headers: responseHeaders }
      );
    }
    const action = normalizeAction(rawAction);
    payload.action = action; // 원본 payload 수정

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: { code: 'MISSING_ENV', message: 'Missing Supabase env vars' }, traceId }),
        { status: 500, headers: responseHeaders }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set: () => {},
        remove: () => {},
      },
    });

    const ctx = { traceId, payload, supabase, _error: null, result: null };
    const result = await layer.handle(ctx);

    if (result._error) {
      return new Response(
        JSON.stringify({ error: result._error, traceId, debug: { action, word: payload.word } }),
        { status: result._error.code === 404 ? 404 : 500, headers: responseHeaders }
      );
    }

    // WordModal.tsx는 { success: true, payload: ... } 구조를 기대함
    return new Response(
      JSON.stringify({ success: true, payload: result.result, traceId }),
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