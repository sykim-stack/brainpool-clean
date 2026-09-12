import type { NextRequest } from 'next/server';

// body 또는 x-device-id 헤더에서 deviceId 추출 (소유권 검증용)
async function readDeviceId(request: Request): Promise<string | undefined> {
  const headerId = request.headers.get('x-device-id') || undefined;
  try {
    const body = await request.clone().json();
    return (body?.deviceId as string | undefined) || headerId;
  } catch {
    return headerId;
  }
}

function statusForError(err: unknown): number {
  const msg = typeof err === 'string' ? err : '';
  if (msg.startsWith('FORBIDDEN')) return 403;
  if (msg.startsWith('Room not found')) return 404;
  return 500;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const traceId = crypto.randomUUID();
  const { roomId } = await params;
  try {
    // [AUTH] clearMessages 소유권 검증을 위해 deviceId 전달
    const deviceId = await readDeviceId(request);
    const { ChatRoomEngine } = await import('@/brain-engine/engines/chat/room.js');
    const result: any = await ChatRoomEngine({
      type: 'CLEAR_MESSAGES',
      payload: { roomId, deviceId },
      traceId,
      _error: null,
    });
    if (result._error) {
      return Response.json(
        { payload: null, _error: result._error, traceId },
        { status: statusForError(result._error) }
      );
    }
    return Response.json({ payload: { cleared: true }, _error: null, traceId });
  } catch (err: any) {
    return Response.json({ payload: null, _error: err.message, traceId }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const traceId = crypto.randomUUID();
  const { roomId } = await params;

  try {
    const { ChatRoomEngine } = await import('@/brain-engine/engines/chat/room.js');
    const result: any = await ChatRoomEngine({
      type:    'GET_ROOM',
      payload: { roomId },
      traceId,
      _error:  null,
    });

    if (result._error) {
      return Response.json(
        { payload: null, _error: result._error, traceId },
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    return Response.json(
      { payload: { room: result.room }, _error: null, traceId },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err: any) {
    return Response.json(
      { payload: null, _error: err.message, traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const traceId = crypto.randomUUID();
  const { roomId } = await params;

  try {
    // [AUTH] deleteRoom 소유권 검증을 위해 deviceId 전달
    const deviceId = await readDeviceId(request);
    const { ChatRoomEngine } = await import('@/brain-engine/engines/chat/room.js');
    const result: any = await ChatRoomEngine({
      type:    'DELETE_ROOM',
      payload: { roomId, deviceId },
      traceId,
      _error:  null,
    });

    if (result._error) {
      return Response.json(
        { payload: null, _error: result._error, traceId },
        {
          status: statusForError(result._error),
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
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
