// app/api/corehub/route.ts
// [CONNECT] Clean → CoreNull 읽기 전용 연결
// GET /api/corehub?owner_key=...
// GET /api/corehub?owner_key=...&slug=...  (단건 house)
// 범위: score + score_detail + houses (또는 house)
// 제외: 점수 공식 변경, chat→post, UI, vault, 쓰기

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const traceId = crypto.randomUUID();
  const { searchParams } = new URL(request.url);
  const owner_key = searchParams.get('owner_key') || '';
  const slug = searchParams.get('slug') || '';

  if (!owner_key) {
    return NextResponse.json(
      { payload: null, _error: { code: 'MISSING_OWNER_KEY', message: 'owner_key required' }, traceId },
      { status: 400 }
    );
  }

  try {
    const { calcScore } = await import('@/brain-engine/engines/corehub/score.js');
    const { listHouses, getHouse } = await import('@/brain-engine/engines/corehub/house.js');

    let ctx: any = { payload: { owner_key }, traceId, _error: null };

    ctx = await calcScore(ctx);
    if (ctx._error) {
      return NextResponse.json({ payload: null, _error: ctx._error, traceId }, { status: 500 });
    }

    if (slug) {
      ctx = await getHouse({ ...ctx, payload: { ...ctx.payload, slug, owner_key } });
      if (ctx._error) {
        const status = ctx._error.code === 'NOT_FOUND' ? 404 : 500;
        return NextResponse.json({ payload: null, _error: ctx._error, traceId }, { status });
      }
    } else {
      ctx = await listHouses(ctx);
      if (ctx._error) {
        return NextResponse.json({ payload: null, _error: ctx._error, traceId }, { status: 500 });
      }
    }

    return NextResponse.json({
      payload: {
        owner_key,
        score: ctx.payload.score,
        score_detail: ctx.payload.score_detail,
        houses: ctx.payload.houses ?? null,
        house: ctx.payload.house ?? null,
      },
      _error: null,
      traceId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { payload: null, _error: { code: 'COREHUB_FAIL', message: err.message }, traceId },
      { status: 500 }
    );
  }
}
