import { NextRequest, NextResponse } from 'next/server';
import { run as roomEngine } from '@/brain-engine/chat-room.js';

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();
  try {
    const raw = await request.text();
    const body = JSON.parse(raw);
    const { title, createdBy, tags, maxParticipants } = body;
    if (!title) {
      return NextResponse.json(
        { _error: { code: 'MISSING_TITLE', message: 'title required' }, traceId },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }
    const ctx = await roomEngine({
      type: 'CREATE_ROOM',
      payload: { title, createdBy: createdBy || 'anonymous', tags: tags || [], maxParticipants: maxParticipants || 100 },
      traceId,
      _error: null,
    });
    if (ctx._error) {
      return NextResponse.json(
        { _error: ctx._error, traceId },
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }
    return NextResponse.json(
      { payload: { room: ctx.payload.room }, _error: null, traceId },
      { status: 201, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { _error: { code: 'UNHANDLED', message: err.message }, traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}

export async function GET(request: NextRequest) {
  const traceId = crypto.randomUUID();
  try {
    const ctx = await roomEngine({
      type: 'LIST_ROOMS',
      payload: {},
      traceId,
      _error: null,
    });
    if (ctx._error) {
      return NextResponse.json(
        { _error: ctx._error, traceId },
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }
    return NextResponse.json(
      { payload: { rooms: ctx.payload.rooms }, _error: null, traceId },
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { _error: { code: 'UNHANDLED', message: err.message }, traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}