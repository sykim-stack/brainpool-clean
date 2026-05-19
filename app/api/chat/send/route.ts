// app/api/chat/send/route.ts
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();

  let body: { roomId?: string; userId?: string; original?: string; analyze?: boolean };
  try {
    const rawBody = await request.text();
    body = JSON.parse(rawBody);
  } catch {
    return new Response(
      JSON.stringify({ payload: null, _error: 'PARSE_FAIL', traceId }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const { roomId, userId, original, analyze = true } = body;
  if (!roomId || !userId || !original) {
    return new Response(
      JSON.stringify({ payload: null, _error: 'roomId, userId, original are required', traceId }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  let translationMeta: {
    translations: { ko?: string; vi?: string };
    detectedLanguage: string | null;
    emotion: { primary: string; intensity: number } | null;
    cultureHints: string[];
    translatedText: string | null;
    targetLang: string | null;
  } = {
    translations: {},
    detectedLanguage: null,
    emotion: null,
    cultureHints: [],
    translatedText: null,
    targetLang: null,
  };

  if (analyze) {
    try {
      const { route }     = await import('@/brain-engine/core/hajun/router.js');
      const { createCtx } = await import('@/brain-engine/core/contracts/ctx.js');

      let ctx = createCtx({ text: original, author: userId }, traceId);
      ctx = await route('translate', ctx);
      if (!ctx._error) ctx = await route('emotion', ctx);

      const p = ctx.payload;
      const sourceLang = p.sourceLang || null;
      const targetLang = sourceLang === 'ko' ? 'vi' : 'ko';
      const translated  = p.translatedText || null;

      translationMeta = {
        translations:    translated ? { [targetLang]: translated } : {},
        detectedLanguage: sourceLang,
        emotion:         p.emotion ? { primary: p.emotion, intensity: p.emotionScore ?? 0.5 } : null,
        cultureHints:    p.culturalNote && p.culturalNote !== '중립' ? [p.culturalNote] : [],
        translatedText:  translated,
        targetLang,
      };

      console.log(`✅ [chat/send] ${sourceLang}→${targetLang}: "${translated}"`);
    } catch (e: any) {
      console.warn(`⚠️ [chat/send] 번역 실패, 계속: ${e.message}`);
    }
  }

  try {
    // ✅ core 엔진으로 교체
    const { ChatMessageEngine } = await import('@/brain-engine/core/engines/chat/message.js');
    const result: any = await ChatMessageEngine({
      type:    'SEND_MESSAGE',
      payload: { roomId, userId, original, meta: translationMeta },
      traceId,
      _error:  null,
    });

    if (result._error) {
      return new Response(
        JSON.stringify({ payload: null, _error: result._error, traceId }),
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    return new Response(
      JSON.stringify({ payload: { message: result.message }, _error: null, traceId }),
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ payload: null, _error: e.message, traceId }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}