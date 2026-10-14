import type { Principal } from './principal';
import { getStorage } from '@/brain-engine/connectors/storage.js';

export type RoomAccess = 'read' | 'write' | 'owner';

export interface RoomAccessResult {
  allowed: boolean;
  code: 'OK' | 'ROOM_NOT_FOUND' | 'FORBIDDEN' | 'DB_UNAVAILABLE' | 'DB_ERROR';
  room?: {
    id: string;
    ownerDeviceId: string | null;
    isPublic: boolean;
  };
}

function principalIdentifiers(principal: Principal): string[] {
  return [principal.id, principal.deviceId, principal.userId].filter(
    (value): value is string => Boolean(value),
  );
}

/**
 * Check room access using the existing anonymous-device ownership model.
 *
 * This is an API-layer guard. It deliberately does not change RLS or mutate the database.
 * Service principals are reserved for internal jobs and bypass the user membership check.
 *
 * Public rooms: any authenticated principal may read/write (invite links, code join).
 * Private rooms: owner or chat_participants membership required for write; read also needs membership.
 */
export async function assertRoomMember(
  roomId: string,
  principal: Principal,
  access: RoomAccess = 'read',
): Promise<RoomAccessResult> {
  if (principal.type === 'service') {
    return { allowed: true, code: 'OK' };
  }

  const db = await getStorage();
  if (!db) return { allowed: false, code: 'DB_UNAVAILABLE' };

  const { data: room, error: roomError } = await db
    .from('chat_rooms')
    .select('id, owner_device_id, is_public')
    .eq('id', roomId)
    .maybeSingle();

  if (roomError) return { allowed: false, code: 'DB_ERROR' };
  if (!room) return { allowed: false, code: 'ROOM_NOT_FOUND' };

  const identifiers = principalIdentifiers(principal);
  const isOwner = Boolean(room.owner_device_id && identifiers.includes(room.owner_device_id));
  const roomMeta = {
    id: room.id,
    ownerDeviceId: room.owner_device_id,
    isPublic: Boolean(room.is_public),
  };

  if (access === 'owner') {
    return {
      allowed: isOwner,
      code: isOwner ? 'OK' : 'FORBIDDEN',
      room: roomMeta,
    };
  }

  // Owner always allowed for read/write
  if (isOwner) {
    return { allowed: true, code: 'OK', room: roomMeta };
  }

  // Public rooms: authenticated device can read and write (invitee support)
  if (room.is_public && (access === 'read' || access === 'write')) {
    return { allowed: true, code: 'OK', room: roomMeta };
  }

  let isMember = false;
  for (const identifier of identifiers) {
    const { data: deviceParticipant, error: deviceError } = await db
      .from('chat_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('device_id', identifier)
      .limit(1)
      .maybeSingle();

    if (deviceError) return { allowed: false, code: 'DB_ERROR' };
    if (deviceParticipant) {
      isMember = true;
      break;
    }

    const { data: userParticipant, error: userError } = await db
      .from('chat_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', identifier)
      .limit(1)
      .maybeSingle();

    if (userError) return { allowed: false, code: 'DB_ERROR' };
    if (userParticipant) {
      isMember = true;
      break;
    }
  }

  return {
    allowed: isMember,
    code: isMember ? 'OK' : 'FORBIDDEN',
    room: roomMeta,
  };
}
