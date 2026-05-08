import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();

  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    const CoreChatLayer = (await import('@/brain-engine/layers/CoreChatLayer')).default;

    const result: any = await CoreChatLayer({
      type: 'SEND_MESSAGE',
      payload: body,
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
      { payload: { message: result.message }, _error: null, traceId },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err) {
    return Response.json(
      { payload: null, _error: (err as Error).message, traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}