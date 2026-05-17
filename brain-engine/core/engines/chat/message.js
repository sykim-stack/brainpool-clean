import { getSupabase } from '../../connectors/storage.js';

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
}

async function saveMessage(ctx) {
  const { roomId, userId, original, meta = {} } = ctx.payload;
  if (!roomId || !userId || !original)
    return { ...ctx, _error: { code: 'MISSING_FIELDS', message: 'roomId, userId, original required', retryable: false } };
  const db = getSupabase();
  if (!db) return { ...ctx, _error: { code: 'DB_UNAVAILABLE', message: 'DB connection failed', retryable: true } };
  const { data, error } = await db.from('chat_messages').insert({
    room_id: roomId, sender_id: isUUID(userId) ? userId : null,
    sender_role: 'user', message: original,
    translated_ko: meta.translations?.ko || null,
    translated_vi: meta.translations?.vi || null,
    nickname: userId, device_id: userId,
  }).select().single();
  if (error) return { ...ctx, _error: { code: 'DB_ERROR', message: error.message, retryable: false } };
  return { ...ctx, payload: { ...ctx.payload, message: {
    messageId: data.id, roomId: data.room_id, userId: data.device_id || userId,
    original: data.message, translations: { ko: data.translated_ko, vi: data.translated_vi },
    timestamp: data.created_at,
  }}};
}

async function getHistory(ctx) {
  const { roomId, limit = 50 } = ctx.payload;
  if (!roomId) return { ...ctx, _error: { code: 'MISSING_ROOM', message: 'roomId required', retryable: false } };
  const db = getSupabase();
  if (!db) return { ...ctx, _error: { code: 'DB_UNAVAILABLE', message: 'DB connection failed', retryable: true } };
  const { data, error } = await db.from('chat_messages').select('*')
    .eq('room_id', roomId).order('created_at', { ascending: false }).limit(Math.min(limit, 100));
  if (error) return { ...ctx, _error: { code: 'DB_ERROR', message: error.message, retryable: false } };
  return { ...ctx, payload: { ...ctx.payload, messages: (data || []).map(m => ({
    messageId: m.id, roomId: m.room_id, userId: m.device_id || m.sender_id || 'unknown',
    original: m.message, translations: { ko: m.translated_ko, vi: m.translated_vi },
    timestamp: m.created_at,
  }))}};
}

const actionMap = { SEND_MESSAGE: saveMessage, GET_HISTORY: getHistory };

export async function run(ctx) {
  if (!ctx || ctx._error) return ctx;
  const handler = actionMap[ctx.type];
  if (!handler) return { ...ctx, _error: { code: 'UNKNOWN_ACTION', message: 'unknown action: ' + ctx.type, retryable: false } };
  return await handler(ctx);
}