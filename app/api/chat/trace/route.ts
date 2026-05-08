import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const traceId = crypto.randomUUID();
  const url = new URL(request.url);
  const targetTraceId = url.searchParams.get('traceId') || '';

  try {
    const ChatMessageLayer = (await import('@/brain-engine/layers/sub/chat-message-layer')).default;

    const result: any = await ChatMessageLayer({
      type: 'FIND_TRACE',
      payload: { traceId: targetTraceId },
      traceId,
      _error: null,
    });

    if (result._error) {
      return Response.json(
        { payload: null, _error: result._error, traceId },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    return Response.json(
      { payload: { message: result.traceMessage }, _error: null, traceId },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err) {
    return Response.json(
      { payload: null, _error: (err as Error).message, traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}