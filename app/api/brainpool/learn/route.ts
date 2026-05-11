import { NextRequest, NextResponse } from 'next/server';
import { route } from '@/brain-engine/hajun/router';

export async function POST(req: NextRequest) {
  const traceId = crypto.randomUUID();
  try {
    const raw = await req.text();
    const { text, targetLang = 'ko' } = JSON.parse(raw);

    if (!text) {
      return NextResponse.json(
        { _error: 'text 필드가 필요합니다', traceId },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // ✅ Engine은 sourceText를 요구하므로 변환
    const ctx = await route('translate', {
      payload: { sourceText: text, targetLang },
      traceId,
    });

    if (ctx._error) {
      return NextResponse.json(
        { _error: ctx._error, traceId },
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    return NextResponse.json(
      { payload: { translated: ctx.payload.translated }, traceId, _error: null },
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { _error: err.message || 'Internal server error', traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}