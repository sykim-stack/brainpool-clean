// brain-engine/core/engines/chat/message.js
// (ctx) => ctx 형태, throw 금지, storage.js 경유

import { getSupabase as getStorage } from '../../connectors/storage.js';

function isUUID(str) {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

async function saveMessage(ctx) {
  const { roomId, userId, original, meta = {} } = ctx.payload || {};
  if (!roomId || !userId || !original) {
    return { ...ctx, _error: 'roomId, userId, original are required' };
  }

  const supabase = await getStorage();
  if (!supabase) return { ...ctx, _error: 'DB connection failed' };

  const senderId = isUUID(userId) ? userId : null;
  const deviceId = userId;

  console.log(`💾 [message] 저장: roomId=${roomId}, deviceId=${deviceId}`);

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id:      roomId,
      sender_id:    senderId,
      sender_role:  'user',
      message:      original,
      translated_ko: meta.translations?.ko || null,
      translated_vi: meta.translations?.vi || null,
      nickname:     deviceId,
      device_id:    deviceId,
    })
    .select()
    .single();

  if (error) {
    console.error(`❌ [message] 저장 오류:`, error.message);
    return { ...ctx, _error: error.message };
  }

  const message = {
    messageId:       data.id,
    roomId:          data.room_id,
    traceId:         ctx.traceId,
    userId:          data.device_id || userId,
    type:            'chat',
    original:        data.message,
    translations:    { ko: data.translated_ko, vi: data.translated_vi },
    detectedLanguage: meta.detectedLanguage || null,
    emotion:         meta.emotion || null,
    cultureHints:    meta.cultureHints || [],
    isRead:          false,
    timestamp:       data.created_at,
  };

  console.log(`💬 [message] 완료: ${message.messageId}`);
  return { ...ctx, message };
}

async function getHistory(ctx) {
  const { roomId, limit = 50, before } = ctx.payload || {};
  if (!roomId) return { ...ctx, _error: 'roomId is required' };

  const supabase = await getStorage();
  if (!supabase) return { ...ctx, _error: 'DB connection failed' };

  let query = supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100));

  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) return { ...ctx, _error: error.message };

  const messages = (data || []).map(m => ({
    messageId:    m.id,
    roomId:       m.room_id,
    traceId:      m.id,
    userId:       m.device_id || m.sender_id || 'unknown',
    type:         'chat',
    original:     m.message,
    translations: { ko: m.translated_ko, vi: m.translated_vi },
    detectedLanguage: null,
    emotion:      null,
    cultureHints: [],
    isRead:       false,
    timestamp:    m.created_at,
  }));

  return { ...ctx, messages, messageCount: messages.length };
}

async function getByTrace(ctx) {
  const { traceId } = ctx.payload || {};
  const supabase = await getStorage();
  if (!supabase) return { ...ctx, _error: 'DB connection failed' };

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('id', traceId)
    .single();

  if (error || !data) return { ...ctx, _error: `Trace not found: ${traceId}` };

  return {
    ...ctx,
    traceMessage: {
      messageId:    data.id,
      roomId:       data.room_id,
      traceId:      data.id,
      userId:       data.device_id || data.sender_id || 'unknown',
      type:         'chat',
      original:     data.message,
      translations: { ko: data.translated_ko, vi: data.translated_vi },
      timestamp:    data.created_at,
    }
  };
}

const actionMap = {
  SEND_MESSAGE: saveMessage,
  GET_HISTORY:  getHistory,
  GET_TRACE:    getByTrace,
};

export async function ChatMessageEngine(ctx) {
  if (!ctx || ctx._error) return ctx;
  const handler = actionMap[ctx.type];
  if (!handler) return ctx;
  return await handler(ctx);
}

// poll.ts 등 default import 대응
export default ChatMessageEngine;