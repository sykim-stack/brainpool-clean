import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const traceId = crypto.randomUUID();
  const responseHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

  const rawBody = await req.text();
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(
      JSON.stringify({ _error: 'INVALID_JSON', traceId }),
      { status: 400, headers: responseHeaders }
    );
  }

  const { message_id } = payload;
  if (!message_id) {
    return new Response(
      JSON.stringify({ _error: 'MISSING_MESSAGE_ID', traceId }),
      { status: 400, headers: responseHeaders }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const deeplKey   = process.env.DEEPL_API_KEY!;

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value; },
      set: () => {},
      remove: () => {},
    },
  });

  // 1. messages 조회
  const { data: msg, error: fetchError } = await supabase
    .from('messages')
    .select('id, content, language, translation_status')
    .eq('id', message_id)
    .maybeSingle();

  if (fetchError || !msg) {
    return new Response(
      JSON.stringify({ _error: 'MESSAGE_NOT_FOUND', traceId }),
      { status: 404, headers: responseHeaders }
    );
  }

  // 2. 중복 방지 — pending 아니면 early return
  if (msg.translation_status !== 'pending') {
    return new Response(
      JSON.stringify({ success: true, skipped: true, traceId }),
      { status: 200, headers: responseHeaders }
    );
  }

  // 3. 한국어면 번역 불필요
  if (msg.language === 'ko') {
    await supabase
      .from('messages')
      .update({ translated_ko: msg.content, translation_status: 'completed' })
      .eq('id', message_id);
    return new Response(
      JSON.stringify({ success: true, skipped: true, traceId }),
      { status: 200, headers: responseHeaders }
    );
  }

  // 4. DeepL 번역
  try {
    const deeplRes = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${deeplKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: msg.content,
        source_lang: (msg.language || 'VI').toUpperCase(),
        target_lang: 'KO',
      }),
    });

    if (!deeplRes.ok) throw new Error(`DeepL ${deeplRes.status}`);

    const deeplData = await deeplRes.json();
    const translated_ko = deeplData.translations?.[0]?.text || '';

    // 5. 성공 업데이트
    const { error: updateError } = await supabase
      .from('messages')
      .update({ translated_ko, translation_status: 'completed' })
      .eq('id', message_id);

    if (updateError) throw new Error(updateError.message);

    return new Response(
      JSON.stringify({ success: true, traceId }),
      { status: 200, headers: responseHeaders }
    );

  } catch (err: any) {
    // 6. 실패 업데이트
    await supabase
      .from('messages')
      .update({ translation_status: 'failed' })
      .eq('id', message_id);

    return new Response(
      JSON.stringify({ _error: err.message || 'TRANSLATE_FAILED', traceId }),
      { status: 500, headers: responseHeaders }
    );
  }
}
