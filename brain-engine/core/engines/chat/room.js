import { getSupabase } from '../../connectors/storage.js';

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function createRoom(ctx) {
  const { title, createdBy = 'anonymous', tags = [], maxParticipants = 100 } = ctx.payload;
  if (!title) return { ...ctx, _error: { code: 'MISSING_TITLE', message: 'title is required', retryable: false } };
  const db = getSupabase();
  if (!db) return { ...ctx, _error: { code: 'DB_UNAVAILABLE', message: 'DB connection failed', retryable: true } };
  const { data, error } = await db.from('chat_rooms').insert({
    room_name: title, invite_code: generateInviteCode(), room_type: 'chat',
    created_by: null, owner_device_id: createdBy, is_permanent: false,
    metadata: { tags, maxParticipants, createdBy },
  }).select().single();
  if (error) return { ...ctx, _error: { code: 'DB_ERROR', message: error.message, retryable: false } };
  return { ...ctx, payload: { ...ctx.payload, room: {
    roomId: data.id, inviteCode: data.invite_code, title: data.room_name,
    createdBy, createdAt: data.created_at, tags, maxParticipants,
  }}};
}

async function listRooms(ctx) {
  const db = getSupabase();
  if (!db) return { ...ctx, _error: { code: 'DB_UNAVAILABLE', message: 'DB connection failed', retryable: true } };
  const { data, error } = await db.from('chat_rooms').select('*').order('created_at', { ascending: false });
  if (error) return { ...ctx, _error: { code: 'DB_ERROR', message: error.message, retryable: false } };
  return { ...ctx, payload: { ...ctx.payload, rooms: (data || []).map(r => ({
    roomId: r.id, inviteCode: r.invite_code, title: r.room_name,
    createdBy: r.metadata?.createdBy || 'anonymous', createdAt: r.created_at,
    tags: r.metadata?.tags || [], maxParticipants: r.metadata?.maxParticipants || 100,
  }))}};
}

const actionMap = { CREATE_ROOM: createRoom, LIST_ROOMS: listRooms };

export async function run(ctx) {
  if (!ctx || ctx._error) return ctx;
  const handler = actionMap[ctx.type];
  if (!handler) return { ...ctx, _error: { code: 'UNKNOWN_ACTION', message: 'unknown action: ' + ctx.type, retryable: false } };
  return await handler(ctx);
}