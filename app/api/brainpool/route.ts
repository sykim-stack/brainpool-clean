// app/api/brainpool/route.ts
import type { NextRequest } from 'next/server';
import { route } from '@/brain-engine/hajun/router.js';
import { createCtx } from '@/brain-engine/contracts/ctx.js';

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();
  let body: {
    action?: string;
    text?: string;
    sourceText?: string;
    author?: string;
    device_id?: string;
    targetLang?: string;
    context_category?: string;
    payload?: { text?: string };
  };

  try {
    const raw = await request.text();
    body = JSON.parse(raw);
  } catch {
    return new Response(
      JSON.stringify({ payload: null, _error: 'PARSE_FAIL', traceId }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const action = body.action || 'translate';

  // ── action: learn ──────────────────────────────────────────
  if (action === 'learn') {
    const device_id =
      body.device_id ||
      request.headers.get('x-device-id') ||
      `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const text = body.text || body.sourceText || '';
    if (!text) {
      return new Response(
        JSON.stringify({ payload: null, _error: 'text required', traceId }),
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const ctx = {
      device_id,
      payload: {
        sourceText: text,
        targetLang: body.targetLang || 'vi',
        context_category: body.context_category || 'daily',
      },
      traceId,
      _error: null,
    };

    const resultCtx = await route('translate', ctx);

    if (resultCtx._error) {
      return new Response(
        JSON.stringify({ payload: null, _error: resultCtx._error, traceId }),
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    return new Response(
      JSON.stringify({
        payload: {
          translated: resultCtx.payload.translated || resultCtx.payload.translatedText,
          asset_id: resultCtx.payload.asset_id || null,
          fromCache: resultCtx.payload.fromCache || false,
          device_id,
        },
        _error: null,
        traceId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  // ── action: translate (기본) ───────────────────────────────
  const text = body.text || body.payload?.text || '';
  if (!text) {
    return new Response(
      JSON.stringify({ payload: null, _error: 'text required', traceId }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  try {
    let ctx = createCtx({ text, author: body.author || 'anonymous' }, traceId);
    ctx = await route('translate', ctx);
    if (!ctx._error) ctx = await route('emotion', ctx);
    if (!ctx._error) ctx = await route('dialect', ctx);

    const p = ctx.payload;
    const sourceLang = p.sourceLang || null;
    const targetLang = sourceLang === 'ko' ? 'vi' : 'ko';

    return new Response(
      JSON.stringify({
        payload: {
          id: crypto.randomUUID(),
          type: 'post',
          author: p.author || 'anonymous',
          createdAt: Date.now(),
          original: p.text,
          translated: p.translatedText || p.text,
          sourceLang,
          targetLang,
          translationSource: p.translationSource || 'unknown',
          emotionScore: p.emotionScore ?? null,
          emotion: p.emotion || null,
          riskScore: p.riskScore ?? 0,
          intent: p.intent || null,
          meaningScore: p.meaningScore ?? null,
          detectedDialect: p.detectedDialect || 'unknown',
          isSouthern: p.isSouthern ?? false,
          culturalNote: p.culturalNote || null,
        },
        _error: null,
        traceId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ payload: null, _error: e.message, traceId }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}