import { NextRequest } from 'next/server';
import { run as messageEngine } from '@/brain-engine/chat-message.js';
import { route } from 'C:/brainpool-os/hajun/router.js';

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();
  let body: any;
  try {
    const raw = await request.text();
    body = JSON.parse(raw);
  } catch {
    return Response.json(
      { _error: { code: 'PARSE_FAIL', message: 'parse failed' }, traceId },
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const { roomId, userId, original, analyze = true } = body;
  if (!roomId || !userId || !original) {
    return Response.json(
      { _error: { code: 'MISSING_FIELDS', message: 'roomId, userId, original required' }, traceId },
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  let ctx: any = { payload: { text: original, roomId, userId }, traceId, _error: null };

  if (analyze) {
    ctx = await route('translate', ctx);
    if (!ctx._error) ctx = await route('emotion', ctx);
  }

  ctx = await messageEngine({
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
      },
    },
  });

  if (ctx._error) {
    return Response.json(
      { _error: ctx._error, traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  return Response.json(
    { payload: { message: ctx.payload.message }, _error: null, traceId },
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}