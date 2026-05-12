import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const traceId = crypto.randomUUID();
  const url = new URL(request.url);
  const roomId = url.searchParams.get('roomId') || '';
  const limit = parseInt(url.searchParams.get('limit') || '50');

  if (!roomId) {
    return Response.json(
      { payload: null, _error: 'roomId required', traceId },
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
        { payload: null, _error: result._error, traceId },
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    return Response.json(
      { payload: { messages: result.messages ?? [] }, _error: null, traceId },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err: any) {
    return Response.json(
      { payload: null, _error: err.message, traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
