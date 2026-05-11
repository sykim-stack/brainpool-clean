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
  const text = body.text || body.payload?.text || '';
  if (!text) {
    return Response.json(
      { _error: { code: 'MISSING_TEXT', message: 'text field required' }, traceId },
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const { route } = await import('@/brain-engine/hajun/router');
  const targetLang = /[가-힣]/.test(text) ? 'vi' : 'ko';
  const sourceLang = targetLang === 'vi' ? 'ko' : 'vi';

  let ctx: any = { payload: { sourceText: text, targetLang }, traceId, _error: null };
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
          translated:        ctx.payload.translated,
          sourceLang,
          targetLang,
          translationSource: ctx.payload.fromCache ? 'cache' : 'deepl',
          emotion:           ctx.payload.emotion,
          emotionScore:      ctx.payload.emotionScore,
        },
        traceId,
      }
    },
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}