const fs = require('fs');

const js = `import { getStorage } from '../../connectors/storage.js';

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
}

async function sendMessage(ctx) {
  const { roomId, userId, original, meta = {} } = ctx.payload || {};
  if (!roomId || !userId || !original) return { ...ctx, _error: 'roomId, userId, original required' };
  if (!isUUID(roomId)) return { ...ctx, _error: 'roomId is not UUID: ' + roomId };
  const db = await getStorage();
  if (!db) return { ...ctx, _error: 'DB connection failed' };
  const { error: insertError } = await db.from('messages').insert({
    room_id:       roomId,
    user_id:       isUUID(userId) ? userId : null,
    message:       original,
    translated_ko: meta.translations?.ko || null,
    translated_vi: meta.translations?.vi || null,
    nickname:      userId,
    device_id:     userId,
    type:          'chat',
    content:       original,
  });
  if (insertError) {
    console.error('[message] insert error:', insertError.message);
    return { ...ctx, _error: insertError.message };
  }
  const messageId = crypto.randomUUID();
  return { ...ctx, message: {
    messageId,
    roomId,
    userId,
    original,
    translations: {
      ko: meta.translations?.ko || null,
      vi: meta.translations?.vi || null,
    },
    timestamp: new Date().toISOString(),
  }};
}

async function getHistory(ctx) {
  const { roomId, limit = 50 } = ctx.payload || {};
  if (!roomId) return { ...ctx, _error: 'roomId required' };
  const db = await getStorage();
  if (!db) return { ...ctx, _error: 'DB connection failed' };
  const { data, error } = await db.from('messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100));
  if (error) return { ...ctx, _error: error.message };
  return { ...ctx, messages: (data || []).map(m => ({
    messageId:    m.id,
    roomId:       m.room_id,
    userId:       m.device_id || m.nickname || 'unknown',
    original:     m.message || m.content || '',
    translated:   m.translated_ko || m.translated_vi || null,
    translations: { ko: m.translated_ko, vi: m.translated_vi },
    emotion:      m.meta?.emotion || null,
    timestamp:    m.created_at,
  }))};
}

const actionMap = { SEND_MESSAGE: sendMessage, GET_HISTORY: getHistory };

export async function ChatMessageEngine(ctx) {
  if (!ctx || ctx._error) return ctx;
  const handler = actionMap[ctx.type];
  if (!handler) return ctx;
  return await handler(ctx);
}

export default ChatMessageEngine;
`;

fs.writeFileSync('C:/brainpool-clean/brainpool-clean/brain-engine/engines/chat/message.js', js, 'utf8');
console.log('완료');
