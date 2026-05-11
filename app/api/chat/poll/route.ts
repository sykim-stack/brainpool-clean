// app/api/chat/poll/route.ts
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const traceId = crypto.randomUUID();
  const url = new URL(request.url);
  const roomId = url.searchParams.get('roomId') || '';
  const limit = parseInt(url.searchParams.get('limit') || '50');

  if (!roomId) {
    return Response.json(
      { success: false, traceId, error: 'roomId required' },
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  try {
    const ChatMessageLayer = (await import('@/brain-engine/layers/sub/chat-message-layer')).default;

    const result: any = await ChatMessageLayer({
      type: 'GET_HISTORY',
      payload: { roomId, limit },
      traceId,
      _error: null,
    });

    if (result._error) {
      return Response.json(
        { success: false, traceId, error: result._error },
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // page.tsx expects: data.success && data.data?.messages
    return Response.json(
      {
        success: true,
        traceId,
        data: { messages: result.messages ?? [] },
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err: any) {
    return Response.json(
      { success: false, traceId, error: err.message },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}