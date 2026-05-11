import { NextRequest } from 'next/server';
import { route } from 'C:/brainpool-os/hajun/router.js';
import { createCtx } from 'C:/brainpool-os/contracts/ctx.js';

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();

  let body: any;
  try {
    const raw = await request.text();
    body = JSON.parse(raw);
  } catch {
    return Response.json(
      { _error: { code: 'PARSE_FAIL', message: '파싱 실패' }, traceId },
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const text = body.text || body.payload?.text || '';
 
  if (!text) {
    return Response.json(
      { _error: { code: 'MISSING_TEXT', message: 'text 필드 필요' }, traceId },
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  let ctx: any = createCtx({ text, author: body.author || 'anonymous' }, traceId);
  console.log('[DEBUG] ctx:', JSON.stringify(ctx));

  ctx = await route('translate', ctx);
  if (ctx._error) {
    return Response.json(
      { _error: ctx._error, traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
  ctx = await route('emotion', ctx);

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