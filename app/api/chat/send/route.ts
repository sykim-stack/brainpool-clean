// app/api/chat/send/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // 1. body 읽기 (raw text)
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (e) {
    return NextResponse.json({ _error: 'Failed to read request body' }, { status: 400 });
  }

  // 2. JSON 파싱
  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch (e) {
    return NextResponse.json({ _error: 'Invalid JSON', rawBody }, { status: 400 });
  }

  // 3. 필수 필드 검증 (자세한 메시지)
  const { roomId, userId, message, targetLang = 'vi' } = body;
  const missing: string[] = [];
  if (!roomId) missing.push('roomId');
  if (!userId) missing.push('userId');
  if (!message) missing.push('message');
  if (missing.length) {
    return NextResponse.json(
      { _error: `Missing required fields: ${missing.join(', ')}`, received: body },
      { status: 400 }
    );
  }

  // 4. CoreRing URL 동적 생성 (Vercel 환경 + fallback)
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

  // 5. CoreRing 호출
  try {
    const translateRes = await fetch(coreRingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message, from: 'ko', to: targetLang })
    });

    if (!translateRes.ok) {
      const errorText = await translateRes.text();
      throw new Error(`CoreRing responded ${translateRes.status}: ${errorText.slice(0, 100)}`);
    }

    const translateData = await translateRes.json();
    translated = translateData.translated || translateData.result || '';
    if (!translated) throw new Error('No translation field in CoreRing response');
  } catch (err: any) {
    translationError = err.message;
    translated = message; // fallback
  }

  // 6. Supabase 저장
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
    return NextResponse.json(
      { _error: `DB insert failed: ${insertError.message}` },
      { status: 500 }
    );
  }

  // 7. 실패 로그 기록 (선택)
  if (translationError) {
    await supabase.from('tb_trans_logs').insert({
      original_text: message,
      failed_translation: translated,
      error_reason: translationError,
      target_lang: targetLang,
      timestamp: new Date().toISOString()
    }).catch(console.error);
  }

  // 8. 성공 응답
  return NextResponse.json({
    success: true,
    message: messageData,
    translated,
    warning: translationError ? `Translation fallback: ${translationError}` : null
  });
}