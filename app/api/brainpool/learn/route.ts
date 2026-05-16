// app/api/brainpool/learn/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { route } from '@/brain-engine/hajun/router';

export async function POST(req: NextRequest) {
  const traceId = crypto.randomUUID();

  try {
    const raw = await req.text();
    let body = {};
    
    try {
      body = JSON.parse(raw);
    } catch {
      // JSON 파싱 실패해도 진행
    }

    // ==================== device_id 필수 처리 ====================
    const device_id = 
      body.device_id || 
      req.headers.get('x-device-id') || 
      `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // ==================== ctx 구성 ====================
    const ctx = {
      device_id,                    // ← RLS를 위해 반드시 필요
      payload: {
        sourceText: body.text || body.sourceText || body.original_text,
        targetLang: body.targetLang || 'vi',
        marriage_type: body.marriage_type || null,        // 인터메리인 경우 "vn-kr"
        partner_device_id: body.partner_device_id || null,
        context_category: body.context_category || 'daily',
      },
      traceId,
    };

    console.log(`[API] translate 요청 - device_id: ${device_id}, text: "${ctx.payload.sourceText?.slice(0, 50)}..."`);

    // ==================== Engine 실행 ====================
    const resultCtx = await route('translate', ctx);

    if (resultCtx._error) {
      console.error(`[API] Engine Error: ${resultCtx._error}`);
      return NextResponse.json(
        { 
          _error: resultCtx._error, 
          traceId 
        },
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json; charset=utf-8' } 
        }
      );
    }

    // 성공 응답
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
      { 
        _error: err.message || 'Internal server error', 
        traceId 
      },
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json; charset=utf-8' } 
      }
    );
  }
}