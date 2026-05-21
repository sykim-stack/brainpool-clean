import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();
  try {
    const body = JSON.parse(await request.text());
    const { title, createdBy, tags, maxParticipants } = body;

    if (!title) {
      return NextResponse.json(
        { payload: null, _error: 'title required', traceId },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const { ChatRoomEngine } = await import('@/brain-engine/engines/chat/room.js');
    const result: any = await ChatRoomEngine({
      type:    'CREATE_ROOM',
      payload: { title, createdBy: createdBy || 'anonymous', tags: tags || [], maxParticipants: maxParticipants || 100 },
      traceId,
      _error:  null,
    });

    if (result._error) {
      return NextResponse.json(
        { payload: null, _error: result._error, traceId },
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    return NextResponse.json(
      { payload: { room: result.room }, _error: null, traceId },
      { status: 201, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { payload: null, _error: err.message, traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}

export async function GET(request: NextRequest) {
  const traceId = crypto.randomUUID();
  try {
    const { ChatRoomEngine } = await import('@/brain-engine/engines/chat/room.js');
    const result: any = await ChatRoomEngine({
      type:    'LIST_ROOMS',
      payload: {},
      traceId,
      _error:  null,
    });

    if (result._error) {
      return NextResponse.json(
        { payload: null, _error: result._error, traceId },
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    return NextResponse.json(
      { payload: { rooms: result.rooms ?? [] }, _error: null, traceId },
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { payload: null, _error: err.message, traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
