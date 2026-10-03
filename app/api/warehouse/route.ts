import { NextResponse } from 'next/server';
import { WarehouseContextLayer } from '@/brain-engine/layers/WarehouseContextLayer.js';

const warehouse = new WarehouseContextLayer();

/**
 * GET /api/warehouse/context?owner_key=...
 *
 * HajunAI가 CoreHub 결과 (opportunities, meanings, connections)를
 * 컨텍스트로 조회하는 REST API. fire-and-forget Fact POST 이후
 * 비동기로 생성된 CoreHub results를 실시간 조회한다.
 *
 * owner_key는 brainpool-clean의 device_id 또는 userId와 동일.
 *
 * @see lib/corehub.ts — outbound: brainpool-clean → CoreHub (Fact POST)
 * @see brain-engine/connectors/corehub.js — inbound: CoreHub → HajunAI (context fetch)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ownerKey = searchParams.get('owner_key');

  if (!ownerKey) {
    return NextResponse.json(
      { error: 'owner_key query parameter required' },
      { status: 400 }
    );
  }

  const ctx = { payload: { action: 'getContext', owner_key: ownerKey } };
  const result = await warehouse.handle(ctx);

  if (result._error) {
    console.warn('[warehouse] error:', result._error);
    return NextResponse.json(
      { opportunities: [], meanings: [], connections: [] },
      { status: 200 }
    );
  }

  return NextResponse.json({
    opportunities: result.payload.warehouse.opportunities,
    meanings: result.payload.warehouse.meanings,
    connections: result.payload.warehouse.connections,
  });
}

/**
 * POST /api/warehouse/context
 * { owner_key: string }
 * Same as GET but accepts POST for flexibility.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const ownerKey = body.owner_key;

  if (!ownerKey) {
    return NextResponse.json(
      { error: 'owner_key required' },
      { status: 400 }
    );
  }

  const ctx = { payload: { action: 'getContext', owner_key: ownerKey } };
  const result = await warehouse.handle(ctx);

  if (result._error) {
    return NextResponse.json(
      { opportunities: [], meanings: [], connections: [] },
      { status: 200 }
    );
  }

  return NextResponse.json({
    opportunities: result.payload.warehouse.opportunities,
    meanings: result.payload.warehouse.meanings,
    connections: result.payload.warehouse.connections,
  });
}
