import { NextRequest, NextResponse } from 'next/server';

// GET /api/chat/rooms — 공개 방 목록 조회
export async function GET(request: NextRequest) {
  const traceId = crypto.randomUUID();
  try {
    const { ChatRoomEngine } = await import('@/brain-engine/engines/chat/room.js');
    const result: any = await ChatRoomEngine({
      type: 'LIST_ROOMS',
      payload: {},
      traceId,
      _error: null,
    });
    if (result._error) {
      return NextResponse.json({ payload: null, _error: result._error, traceId }, { status: 500 });
    }
    return NextResponse.json({ payload: { rooms: result.rooms ?? [] }, _error: null, traceId });
  } catch (err: any) {
    return NextResponse.json({ payload: null, _error: err.message, traceId }, { status: 500 });
  }
}
