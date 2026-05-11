import { NextRequest } from 'next/server';

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

  const { route } = await import('@/brain-engine/hajun/router');
  const messageEngine = (await import('@/brain-engine/layers/sub/chat-message-layer')).default;

  const targetLang = /[가-힣]/.test(original) ? 'vi' : 'ko';
  const sourceLang = targetLang === 'vi' ? 'ko' : 'vi';

  let ctx: any = { payload: { sourceText: original, targetLang }, traceId, _error: null };

  if (analyze) {
    ctx = await route('translate', ctx);
    if (!ctx._error) ctx = await route('emotion', ctx);
  }

  ctx = await messageEngine({
    ...ctx,
    type: 'SEND_MESSAGE',
    payload: {
      roomId,
      userId,
      original,
      meta: {
        translations: {
          [targetLang]: ctx.payload.translated,
        },
        detectedLanguage: sourceLang,
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
    { payload: { message: ctx.message }, _error: null, traceId },
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}