import { getStorage } from '../../connectors/storage.js';

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
}

async function sendMessage(ctx) {
  const { roomId, userId, original, meta = {} } = ctx.payload || {};
  if (!roomId || !userId || !original) return { ...ctx, _error: 'roomId, userId, original required' };
  const db = await getStorage();
  if (!db) return { ...ctx, _error: 'DB connection failed' };
  const { data, error } = await db.from('chat_messages').insert({
    room_id: roomId, sender_id: isUUID(userId) ? userId : null,
    sender_role: 'user', message: original,
    translated_ko: meta.translations?.ko || null,
    translated_vi: meta.translations?.vi || null,
    nickname: userId, device_id: userId,
  }).select().single();
  if (error) return { ...ctx, _error: error.message };
  return { ...ctx, message: { messageId: data.id, roomId: data.room_id, userId: data.device_id || userId, original: data.message, translations: { ko: data.translated_ko, vi: data.translated_vi }, timestamp: data.created_at } };
}

async function getHistory(ctx) {
  const { roomId, limit = 50 } = ctx.payload || {};
  if (!roomId) return { ...ctx, _error: 'roomId required' };
  const db = await getStorage();
  if (!db) return { ...ctx, _error: 'DB connection failed' };
  const { data, error } = await db.from('chat_messages').select('*').eq('room_id', roomId).order('created_at', { ascending: false }).limit(Math.min(limit, 100));
  if (error) return { ...ctx, _error: error.message };
  return { ...ctx, messages: (data || []).map(m => ({ messageId: m.id, roomId: m.room_id, userId: m.device_id || m.sender_id || 'unknown', original: m.message, translations: { ko: m.translated_ko, vi: m.translated_vi }, timestamp: m.created_at })) };
}

async function getTrace(ctx) {
  const { traceId } = ctx.payload || {};
  if (!traceId) return { ...ctx, _error: 'traceId required' };
  const db = await getStorage();
  if (!db) return { ...ctx, _error: 'DB connection failed' };
  const { data, error } = await db.from('chat_messages').select('*').eq('id', traceId).single();
  if (error || !data) return { ...ctx, _error: `Trace not found: ${traceId}` };
  return { ...ctx, traceMessage: { messageId: data.id, roomId: data.room_id, userId: data.device_id || data.sender_id || 'unknown', original: data.message, translations: { ko: data.translated_ko, vi: data.translated_vi }, timestamp: data.created_at } };
}

const actionMap = { SEND_MESSAGE: sendMessage, GET_HISTORY: getHistory, GET_TRACE: getTrace };

export async function ChatMessageEngine(ctx) {
  if (!ctx || ctx._error) return ctx;
  const handler = actionMap[ctx.type];
  if (!handler) return ctx;
  return await handler(ctx);
}

export default ChatMessageEngine;
