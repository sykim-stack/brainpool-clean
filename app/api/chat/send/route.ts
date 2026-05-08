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

  // CoreRing 호출
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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
    if (!translated) throw new Error('No translation field');
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

  // 실제 chat_messages 테이블 컬럼: id, room_id, user_id, message, created_at, updated_at
  // translated, target_lang, translation_error 컬럼이 없음 -> 저장 불가
  // ✅ 해결책: 필요한 컬럼이 없다면 DB에 먼저 추가해야 함
  const { data: messageData, error: insertError } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      user_id: userId,
      message: message,   // 원본 저장
      // translated, target_lang, translation_error 는 현재 테이블에 없음
      // → 저장 안 됨 (에러 발생)
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) {
    // 컬럼이 없으면 에러 메시지와 함께 필요한 SQL을 응답으로 알려줌
    if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
      return NextResponse.json({
        _error: 'DB schema mismatch',
        required_sql: `ALTER TABLE chat_messages ADD COLUMN translated TEXT, ADD COLUMN target_lang TEXT DEFAULT 'vi', ADD COLUMN translation_error TEXT;`,
        original_error: insertError.message
      }, { status: 500 });
    }
    return NextResponse.json({ _error: `DB insert failed: ${insertError.message}` }, { status: 500 });
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