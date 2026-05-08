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

  const message = body.message || body.original;
  const { roomId, userId, targetLang = 'vi' } = body;

  if (!roomId || !userId || !message) {
    return NextResponse.json(
      { _error: `Missing fields. Required: roomId, userId, and message/original. Received: ${Object.keys(body)}` },
      { status: 400 }
    );
  }

  // CoreRing 호출 (Vercel 배포 시 VERCEL_URL 사용)
  // VERCEL_URL은 프로토콜을 포함하지 않으므로 https:// 추가
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  
  const coreRingUrl = `${baseUrl}/api/brainpool`;

  let translated = '';
  let translationError: string | null = null;

  try {
    const translateRes = await fetch(coreRingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ text: message, from: 'ko', to: targetLang })
    });
    
    const translateData = await translateRes.json();
    // CoreRing 응답 구조: { success: true, translated: "...", result: { ... }, traceId: "..." }
    translated = translateData.translated || translateData.result?.translated || translateData.message || '';
    
    if (!translated) {
      translationError = 'Translation result empty';
      translated = message;
    }
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

  // 실제 chat_messages 테이블 컬럼 (chat-message-layer.js 참조):
  // room_id, sender_id, sender_role, message, translated_ko, translated_vi, nickname, device_id
  const { data: messageData, error: insertError } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      sender_id: userId,
      sender_role: 'user',
      message: message,
      translated_ko: targetLang === 'ko' ? translated : message,
      translated_vi: targetLang === 'vi' ? translated : message,
      device_id: userId,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ _error: `DB insert failed: ${insertError.message}`, debug: { roomId, userId, message } }, { status: 500 });
  }

  // 번역 결과는 응답으로만 전달 (DB 저장은 나중에)
  return NextResponse.json({
    success: true,
    message: messageData,
    translated,
    warning: translationError ? `Translation fallback: ${translationError}` : null,
    note: '번역 결과는 DB에 저장되지 않았습니다. chat_messages 테이블에 translated, target_lang, translation_error 컬럼을 추가해주세요.'
  });
}