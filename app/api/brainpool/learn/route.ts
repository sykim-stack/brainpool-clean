// app/api/brainpool/learn/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { route } from '@/brain-engine/hajun/router.js';

export async function POST(req: NextRequest) {
  const traceId = crypto.randomUUID();

  try {
    const raw = await req.text();
    let body: any = {};

    try {
      body = JSON.parse(raw);
    } catch (e) {
      console.warn('[API] JSON parse ?ㅽ뙣, 鍮?媛앹껜濡?吏꾪뻾');
    }

    // ==================== device_id ?꾩닔 泥섎━ ====================
    const device_id = 
      body.device_id || 
      req.headers.get('x-device-id') || 
      `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // ==================== ctx 援ъ꽦 ====================
    const ctx = {
      device_id,
      payload: {
        sourceText: body.text || body.sourceText || body.original_text || body.source_text,
        targetLang: body.targetLang || body.target_lang || 'vi',
        marriage_type: body.marriage_type || null,
        partner_device_id: body.partner_device_id || null,
        context_category: body.context_category || 'daily',
      },
      traceId,
    };

    console.log(`[API] translate ?붿껌 ??device_id: ${device_id}, text: "${ctx.payload.sourceText?.slice(0, 60)}..."`);

    // ==================== Engine ?ㅽ뻾 ====================
    const resultCtx = await route('translate', ctx);

    if (resultCtx._error) {
      console.error(`[API] Engine Error: ${resultCtx._error}`);
      return NextResponse.json(
        { _error: resultCtx._error, traceId },
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        }
      );
    }

    // ?깃났 ?묐떟
    return NextResponse.json({
      success: true,
      translated: resultCtx.payload.translated || resultCtx.payload.translatedText,
      asset_id: resultCtx.payload.asset_id,
      fromCache: resultCtx.payload.fromCache || false,
      traceId,
      device_id
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });

  } catch (err: any) {
    console.error('[API] Critical Error:', err);
    return NextResponse.json(
      { _error: err.message || 'Internal server error', traceId },
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json; charset=utf-8' } 
      }
    );
  }
}
