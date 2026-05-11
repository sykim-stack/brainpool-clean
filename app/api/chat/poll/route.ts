import { NextRequest, NextResponse } from 'next/server';
import { run as pollEngine } from '@/brain-engine/chat-poll.js';

export async function GET(req: NextRequest) {
  const traceId = crypto.randomUUID();
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  if (!roomId) {
    return NextResponse.json(
      { _error: { code: 'MISSING_ROOM', message: 'roomId required' }, traceId, payload: { messages: [] } },
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
  const ctx = await pollEngine({
    type: 'GET_MESSAGES',
    payload: { roomId, limit },
    traceId,
    _error: null,
  });
  if (ctx._error) {
    return NextResponse.json(
      { _error: ctx._error, traceId, payload: { messages: [] } },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
  return NextResponse.json(
    { payload: { messages: ctx.payload.messages }, _error: null, traceId },
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}