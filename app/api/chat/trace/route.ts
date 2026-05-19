import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const traceId = crypto.randomUUID();
  const url = new URL(request.url);
  const targetTraceId = url.searchParams.get('traceId') || '';

  try {
    const { ChatMessageEngine } = await import('@/brain-engine/core/engines/chat/message.js');
    const result: any = await ChatMessageEngine({
      type: 'GET_TRACE',
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
  } catch (err: any) {
    return Response.json(
      { payload: null, _error: err.message, traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}