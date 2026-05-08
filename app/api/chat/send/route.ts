import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ _error: 'Failed to read request body' }, { status: 400 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ _error: 'Invalid JSON', rawBody }, { status: 400 });
  }

  // ★★★ 중요: 프론트엔드가 'original'을 보내면 'message'로 매핑
  const message = body.message || body.original;
  const { roomId, userId, targetLang = 'vi' } = body;

  const missing: string[] = [];
  if (!roomId) missing.push('roomId');
  if (!userId) missing.push('userId');
  if (!message) missing.push('message or original');
  if (missing.length) {
    return NextResponse.json(
      { _error: `Missing required fields: ${missing.join(', ')}`, received: body },
      { status: 400 }
    );
  }

  // CoreRing URL 동적 생성
  let baseUrl: string;
  if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  } else if (process.env.NEXT_PUBLIC_APP_URL) {
    baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  } else {
    baseUrl = 'http://localhost:3000';
  }
  const coreRingUrl = `${baseUrl}/api/brainpool`;

  let translated = '';
  let translationError: string | null = null;

  try {
    const translateRes = await fetch(coreRingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message, from: 'ko', to: targetLang })
    });
    if (!translateRes.ok) {
      const errorText = await translateRes.text();
      throw new Error(`CoreRing ${translateRes.status}: ${errorText.slice(0, 100)}`);
    }
    const translateData = await translateRes.json();
    translated = translateData.translated || translateData.result || '';
    if (!translated) throw new Error('No translation field in CoreRing response');
  } catch (err: any) {
    translationError = err.message;
    translated = message;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set: () => {},
        remove: () => {},
      },
    }
  );

  const { data: messageData, error: insertError } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      user_id: userId,
      original: message,
      translated,
      target_lang: targetLang,
      translation_error: translationError,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ _error: `DB insert failed: ${insertError.message}` }, { status: 500 });
  }

  if (translationError) {
    try {
      await supabase.from('tb_trans_logs').insert({
        original_text: message,
        failed_translation: translated,
        error_reason: translationError,
        target_lang: targetLang,
        timestamp: new Date().toISOString()
      });
    } catch (logErr) {
      console.error('Failed to log translation error:', logErr);
    }
  }

  return NextResponse.json({
    success: true,
    message: messageData,
    translated,
    warning: translationError ? `Translation fallback: ${translationError}` : null
  });
}