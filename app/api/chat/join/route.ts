import { NextRequest, NextResponse } from 'next/server';
import ChatRoomEngine from "@/brain-engine/engines/chat/room.js";

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();
  try {
    const raw = await request.text();
    const body = JSON.parse(raw);
    const { inviteCode } = body;
    if (!inviteCode) {
      return NextResponse.json(
        { _error: { code: 'MISSING_CODE', message: 'inviteCode required' }, traceId },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }
    const ctx = await ChatRoomEngine({
      type: 'FIND_BY_CODE',
      payload: { inviteCode },
      traceId,
      _error: null,
    });
    if (ctx._error) {
      return NextResponse.json(
        { _error: ctx._error, traceId },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }
    return NextResponse.json(
      { payload: { room: ctx.payload.room }, _error: null, traceId },
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { _error: { code: 'UNHANDLED', message: err.message }, traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
