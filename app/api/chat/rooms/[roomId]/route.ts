import type { NextRequest } from 'next/server';
import { getPrincipal } from '@/lib/security/principal';
import { assertRoomMember } from '@/lib/security/room-access';

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const traceId = crypto.randomUUID();
  const { roomId } = await params;
  const principalResult = getPrincipal(request);
  if (!principalResult.principal) {
    return Response.json({ payload: null, _error: principalResult.error, traceId }, { status: 401 });
  }
  const access = await assertRoomMember(roomId, principalResult.principal, 'owner');
  if (!access.allowed) {
    const status = access.code === 'ROOM_NOT_FOUND' ? 404 : 403;
    return Response.json({ payload: null, _error: access.code, traceId }, { status });
  }

  try {
    const { ChatRoomEngine } = await import('@/brain-engine/engines/chat/room.js');
    const result = await ChatRoomEngine({
      type: 'CLEAR_MESSAGES',
      payload: { roomId, deviceId: principalResult.principal.deviceId },
      traceId,
      _error: null,
    });
    if (result._error) {
      const status = String(result._error).startsWith('FORBIDDEN') ? 403 : 500;
      return Response.json({ payload: null, _error: result._error, traceId }, { status });
    }
    return Response.json({ payload: { cleared: true }, _error: null, traceId });
  } catch (err: any) {
    return Response.json({ payload: null, _error: err.message, traceId }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const traceId = crypto.randomUUID();
  const { roomId } = await params;
  const principalResult = getPrincipal(request);
  if (!principalResult.principal) {
    return Response.json({ payload: null, _error: principalResult.error, traceId }, { status: 401 });
  }
  const access = await assertRoomMember(roomId, principalResult.principal, 'owner');
  if (!access.allowed) {
    const status = access.code === 'ROOM_NOT_FOUND' ? 404 : 403;
    return Response.json(
      { payload: null, _error: access.code, traceId },
      { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  }

  try {
    const { ChatRoomEngine } = await import('@/brain-engine/engines/chat/room.js');
    const result: any = await ChatRoomEngine({
      type:    'DELETE_ROOM',
      payload: { roomId, deviceId: principalResult.principal.deviceId },
      traceId,
      _error:  null,
    });

    if (result._error) {
      const status = String(result._error).startsWith('FORBIDDEN') ? 403 : 500;
      return Response.json(
        { payload: null, _error: result._error, traceId },
        { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
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
