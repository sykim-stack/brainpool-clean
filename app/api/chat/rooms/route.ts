// app/api/chat/rooms/route.ts 수정
import { NextRequest, NextResponse } from 'next/server';
import { ChatEngine } from '@/brain-engine/engines/chat/index.js';

export async function POST(request: NextRequest) {
  const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);
    const { title, createdBy, tags, maxParticipants } = body;
    
    if (!title) {
      return NextResponse.json({
        success: false,
        traceId,
        error: 'Room title is required',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    const ctx = {
      type: 'CREATE_ROOM',
      payload: { title, createdBy: createdBy || 'anonymous', tags: tags || [], maxParticipants: maxParticipants || 100 },
      traceId,
    };
    
    const response = await ChatEngine.room(ctx);
    return NextResponse.json(response, {
      status: response.success ? 201 : 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (err: any) {
    console.error('❌ [API:chat/rooms POST] 오류:', err.message);
    return NextResponse.json({
      success: false,
      traceId,
      error: err.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    
    const ctx = {
      type: 'LIST_ROOMS',
      payload: { status },
      traceId,
    };
    
    const response = await ChatEngine.room(ctx);
    return NextResponse.json(response, {
      status: response.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (err: any) {
    console.error('❌ [API:chat/rooms GET] 오류:', err.message);
    return NextResponse.json({
      success: false,
      traceId,
      error: err.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}