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

// PATCH /api/chat/rooms/:roomId — 방 상태 변경 (메시지 초기화 등)
export async function PATCH(request: NextRequest) {
  const traceId = crypto.randomUUID();
  try {
    const url = new URL(request.url);
    const roomId = url.pathname.split('/').pop();
    if (!roomId) {
      return NextResponse.json({ payload: null, _error: 'roomId required', traceId }, { status: 400 });
    }
    const { ChatRoomEngine } = await import('@/brain-engine/engines/chat/room.js');
    const result: any = await ChatRoomEngine({
      type: 'CLEAR_MESSAGES',
      payload: { roomId },
      traceId,
      _error: null,
    });
    if (result._error) {
      return NextResponse.json({ payload: null, _error: result._error, traceId }, { status: 500 });
    }
    return NextResponse.json({ payload: { cleared: true }, _error: null, traceId });
  } catch (err: any) {
    return NextResponse.json({ payload: null, _error: err.message, traceId }, { status: 500 });
  }
}