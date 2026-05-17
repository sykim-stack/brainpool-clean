import { getSupabase } from '../../connectors/storage.js';

export async function run(ctx) {
  if (!ctx || ctx._error) return ctx;
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