// app/api/chat/send/route.ts
// ─────────────────────────────────────────────────────────────
// Chat Send API — 얇은 어댑터
//
// 전: CoreChatLayer → fetch('/api/brainpool') 내부 HTTP 호출
// 후: Hajun → TranslationEngine 직접 (HTTP 없음)
//
// req.text() + JSON.parse() 필수
// ─────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();

  let body: any;
  try {
    const raw = await request.text();
    body = JSON.parse(raw);
  } catch {
    return Response.json(
      { _error: 'PARSE_FAIL', traceId },
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const { roomId, userId, original, analyze = true } = body;
  if (!roomId || !userId || !original) {
    return Response.json(
      { _error: 'roomId, userId, original 필수', traceId },
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const { route } = await import('@/brain-engine/hajun/router');
  const ChatMessageLayer = (await import('@/brain-engine/engines/chat/message')).default;
  const ChatRoomLayer    = (await import('@/brain-engine/layers/sub/chat-room-layer')).default;

  let ctx: any = { payload: { text: original, roomId, userId }, traceId };

  // 1. 번역 + 감정 (analyze 옵션)
  if (analyze) {
    ctx = await route('translate', ctx);
    if (!ctx._error) ctx = await route('emotion', ctx);
  }

  // 2. 메시지 저장
  ctx = await ChatMessageLayer({
    ...ctx,
    type: 'SEND_MESSAGE',
    payload: {
      ...ctx.payload,
      original,
      meta: {
        translations: {
          [ctx.payload.sourceLang === 'ko' ? 'vi' : 'ko']: ctx.payload.translatedText,
        },
        detectedLanguage: ctx.payload.sourceLang,
        emotion: { primary: ctx.payload.emotion || 'neutral', intensity: ctx.payload.emotionScore || 0.5 },
      }
    }
  });

  if (ctx._error) {
    return Response.json(
      { _error: ctx._error, traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  return Response.json(
    { payload: { message: ctx.message }, _error: null, traceId },
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}