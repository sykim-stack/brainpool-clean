// app/api/chat/send/route.ts
// 채팅 메시지 전송 + CoreRing 번역 연동

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // ⚠️ req.json() 사용 금지 규칙 준수 → req.text() + JSON.parse()
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

  // 1. CoreRing 번역 API 호출 (동적 URL)
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
    // fallback: 원문 그대로 저장 (나중에 재번역 트리거)
    translated = message;
  }

  // 2. Supabase 클라이언트 초기화
  const supabase = createRouteHandlerClient({ cookies });

  // 3. 메시지 저장 (번역 결과 포함)
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

  // 4. 번역 실패 시 tb_trans_logs에 기록 (AI fallback 추적)
  if (translationError) {
    await supabase.from('tb_trans_logs').insert({
      original_text: message,
      failed_translation: translated,
      error_reason: translationError,
      target_lang: targetLang,
      timestamp: new Date().toISOString()
    });
  }

  // 5. 응답 반환
  return NextResponse.json({
    success: true,
    message: messageData,
    translated: translated,
    warning: translationError ? `Translation failed, saved original: ${translationError}` : null
  });
}