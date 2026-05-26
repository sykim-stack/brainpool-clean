// app/api/brainpool/route.ts
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();
  let body: { text?: string; author?: string; payload?: { text?: string } };
  try {
    const rawBody = await request.text();
    body = JSON.parse(rawBody);
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: { code: 'PARSE_FAIL', message: 'Invalid JSON' }, traceId }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
  const text = body.text || body.payload?.text || '';
  if (!text) {
    return new Response(
      JSON.stringify({ error: { code: 'MISSING_TEXT', message: 'text required' }, traceId }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
  console.log(`📝 [brainpool] 원문: "${text}" (${text.length}자)`);
  try {
    const { route }     = await import('@/brain-engine/hajun/router.js');
    const { createCtx } = await import('@/brain-engine/contracts/ctx.js');
    let ctx = createCtx({ text, author: body.author || 'anonymous' }, traceId);
    ctx = await route('translate', ctx);
    if (!ctx._error) ctx = await route('emotion', ctx);
    const p = ctx.payload;
    const sourceLang = p.sourceLang || null;
    const targetLang = sourceLang === 'ko' ? 'vi' : 'ko';
    const message = {
      id: crypto.randomUUID(),
      type: 'post',
      author: p.author || 'anonymous',
      createdAt: Date.now(),
      payload: {
        original: p.text,
        translated: p.translatedText || p.text,
      },
      traceId,
      meta: {
        sourceLang,
        targetLang,
        translationSource: p.translationSource || 'unknown',
        emotionScore: p.emotionScore ?? null,
        emotion: p.emotion || null,
        culturalNote: p.culturalNote || '중립',
        conflicts: [],
      },
    };
    console.log(`✅ [brainpool] ${sourceLang}→${targetLang}, source=${p.translationSource}`);
    return new Response(
      JSON.stringify({ message }),
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (e: any) {
    console.error(`❌ [brainpool] 엔진 오류:`, e.message);
    return new Response(
      JSON.stringify({ error: { code: 'ENGINE_FAIL', message: e.message }, traceId }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
