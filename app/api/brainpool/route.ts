// app/api/brainpool/route.ts
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();

  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);
    const text = body.text || body.payload?.text || '';

    if (!text) {
      return Response.json(
        { error: 'text required' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    console.log(`📝 원문: "${text}" (${text.length}자), author: ${body.author || 'anonymous'}`);

    // CoreRing 엔진 동적 호출
    const { runPipeline } = await import('@/brain-engine/engines/pipeline');
    const { detectLanguage } = await import('@/brain-engine/modules/detectLanguage');
    const { translate } = await import('@/brain-engine/modules/translate');  // ← default 제거
    const { emotionFilter } = await import('@/brain-engine/modules/emotionFilter');  // ← default 제거
    const { contextFilter } = await import('@/brain-engine/modules/contextFilter');  // ← default 제거

    const ctx = await runPipeline(
      { payload: { text, author: body.author || 'anonymous' }, traceId, _error: null },
      [detectLanguage, translate, emotionFilter, contextFilter]
    );

    const message = ctx.payload?.message || ctx.payload;

    console.log(`✅ [CoreRing] 처리 완료:`, JSON.stringify(message).substring(0, 200));

    return Response.json(
      { message },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        error: { code: 'PARSE_FAIL', message: `Invalid JSON`, details: e.message }
      }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}