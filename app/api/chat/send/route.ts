// app/api/chat/send/route.ts
import { createServerClient } from '@supabase/ssr';  // ✅ 변경
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const rawBody = await req.text();
  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch (e) {
    return NextResponse.json({ _error: 'Invalid JSON' }, { status: 400 });
  }

  const { roomId, userId, message, targetLang = 'vi' } = body;

  if (!roomId || !userId || !message) {
    return NextResponse.json(
      { _error: 'Missing required fields: roomId, userId, message' },
      { status: 400 }
    );
  }

  // 동적 URL for CoreRing
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  const coreRingUrl = `${baseUrl}/api/brainpool`;

  let translated = '';
  let translationError = null;

  try {
    const translateRes = await fetch(coreRingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message,
        from: 'ko',
        to: targetLang
      })
    });

    if (!translateRes.ok) {
      throw new Error(`CoreRing responded with ${translateRes.status}`);
    }

    const translateData = await translateRes.json();
    translated = translateData.translated || translateData.result || '';
    if (!translated) throw new Error('No translation in response');
  } catch (err: any) {
    translationError = err.message;
    translated = message;  // fallback
  }

  // ✅ Supabase 클라이언트 생성 방식 변경
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: messageData, error: insertError } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      user_id: userId,
      original: message,
      translated: translated,
      target_lang: targetLang,
      translation_error: translationError,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { _error: `Failed to save message: ${insertError.message}` },
      { status: 500 }
    );
  }

  if (translationError) {
    await supabase.from('tb_trans_logs').insert({
      original_text: message,
      failed_translation: translated,
      error_reason: translationError,
      target_lang: targetLang,
      timestamp: new Date().toISOString()
    });
  }

  return NextResponse.json({
    success: true,
    message: messageData,
    translated: translated,
    warning: translationError ? `Translation failed, saved original: ${translationError}` : null
  });
}