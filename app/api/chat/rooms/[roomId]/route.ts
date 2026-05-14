import { NextRequest } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const traceId = crypto.randomUUID();
  const { roomId } = await params;

  try {
    const ChatRoomLayer = (await import('@/brain-engine/layers/sub/chat-room-layer')).default;
    const result: any = await ChatRoomLayer({
      type: 'DELETE_ROOM',
      payload: { roomId },
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
      { payload: { deleted: true }, _error: null, traceId },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err: any) {
    return Response.json(
      { payload: null, _error: err.message, traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}