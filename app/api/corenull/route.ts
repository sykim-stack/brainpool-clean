// app/api/corenull/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CoreNullLayer } from '@/brain-engine/layers/CoreNullLayer';

const layer = new CoreNullLayer();

export async function POST(req: Request) {
  const traceId = crypto.randomUUID();
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return new Response(JSON.stringify({ error: { code: 'BODY_READ_ERROR', message: 'Cannot read body' } }), { status: 400 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: { code: 'INVALID_JSON', message: 'Invalid JSON' } }), { status: 400 });
  }

  // Supabase 클라이언트 생성
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options }); },
      },
    }
  );

  const ctx = {
    traceId,
    payload,
    supabase,
    _error: null as any,
    result: null as any
  };

  let result: any;
  try {
    result = await layer.handle(ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: { code: 'UNHANDLED', message: err.message, traceId } }), { status: 500 });
  }

  if (result._error) {
    return new Response(JSON.stringify({ error: result._error, traceId }), { status: result._error.code === 404 ? 404 : 500 });
  }

  return new Response(JSON.stringify({ result: result.result, traceId }), { status: 200 });
}