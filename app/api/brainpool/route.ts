// app/api/brainpool/route.ts
// ─────────────────────────────────────────────────────────────
// CoreRing API — 얇은 어댑터
//
// 전: CoreRingLayer → sub 레이어들 직접 new → DB 직접
// 후: route(ctx) → Hajun → TranslationEngine → Storage
//
// req.text() + JSON.parse() 필수 (req.json() 금지)
// ─────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();

  let body: any;
  try {
    const raw = await request.text();
    body = JSON.parse(raw);
  } catch (e) {
    return Response.json(
      { _error: 'PARSE_FAIL', traceId },
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const text = body.text || body.payload?.text || '';
  if (!text) {
    return Response.json(
      { _error: 'text 필드가 필요합니다', traceId },
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const { route } = await import('@/brain-engine/hajun/router');

  // 1. 번역
  let ctx: any = { payload: { text, author: body.author || 'anonymous' }, traceId };
  ctx = await route('translate', ctx);
  if (ctx._error) {
    return Response.json(
      { _error: ctx._error, traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  // 2. 감정 분석
  ctx = await route('emotion', ctx);

  // 응답
  return Response.json(
    {
      message: {
        payload: {
          original:          text,
          translated:        ctx.payload.translatedText,
          sourceLang:        ctx.payload.sourceLang,
          targetLang:        ctx.payload.sourceLang === 'ko' ? 'vi' : 'ko',
          translationSource: ctx.payload.translationSource,
          emotion:           ctx.payload.emotion,
          emotionScore:      ctx.payload.emotionScore,
        },
        traceId,
      }
    },
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}