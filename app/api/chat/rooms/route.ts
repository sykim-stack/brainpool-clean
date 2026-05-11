// app/api/chat/rooms/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();

  try {
    const raw = await request.text();
    const body = JSON.parse(raw);
    const { title, createdBy, tags, maxParticipants } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, traceId, error: 'title required' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const ChatRoomLayer = (await import('@/brain-engine/layers/sub/chat-room-layer')).default;

    const ctx: any = await ChatRoomLayer({
      type: 'CREATE_ROOM',
      payload: {
        title,
        createdBy: createdBy || 'anonymous',
        tags: tags || [],
        maxParticipants: maxParticipants || 100,
      },
      traceId,
      _error: null,
    });

    if (ctx._error) {
      return NextResponse.json(
        { success: false, traceId, error: ctx._error },
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    return NextResponse.json(
      { success: true, traceId, data: { room: ctx.room ?? null } },
      { status: 201, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, traceId, error: err.message },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}

export async function GET(request: NextRequest) {
  const traceId = crypto.randomUUID();

  try {
    const ChatRoomLayer = (await import('@/brain-engine/layers/sub/chat-room-layer')).default;

    const ctx: any = await ChatRoomLayer({
      type: 'LIST_ROOMS',
      payload: {},
      traceId,
      _error: null,
    });

    if (ctx._error) {
      return NextResponse.json(
        { success: false, traceId, error: ctx._error },
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    return NextResponse.json(
      { success: true, traceId, data: { rooms: ctx.rooms ?? [] } },
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, traceId, error: err.message },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
