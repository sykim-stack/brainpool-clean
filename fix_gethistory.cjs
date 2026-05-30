const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/brain-engine/engines/chat/message.js';
let content = fs.readFileSync(path, 'utf8');

const oldHistory = `  const { data, error } = await db.from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100));
  if (error) return { ...ctx, _error: error.message };
  return { ...ctx, messages: (data || []).map(m => ({
    messageId:    m.id,
    roomId:       m.room_id,
    userId:       m.device_id || m.sender_id || 'unknown',
    original:     m.message,
    translated:   m.translated_ko || m.translated_vi || null,
    translations: { ko: m.translated_ko, vi: m.translated_vi },
    emotion:      null,
    timestamp:    m.created_at,
  }))};`;

const newHistory = `  const { data, error } = await db.from('messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100));
  if (error) return { ...ctx, _error: error.message };
  return { ...ctx, messages: (data || []).map(m => ({
    messageId:    m.id,
    roomId:       m.room_id,
    userId:       m.device_id || m.nickname || 'unknown',
    original:     m.original || m.message,
    translated:   m.translated_ko || m.translated_vi || null,
    translations: { ko: m.translated_ko, vi: m.translated_vi },
    emotion:      m.meta?.emotion || null,
    timestamp:    m.created_at,
  }))};`;

content = content.replace(oldHistory, newHistory);
fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes("from('messages')") ? 'messages로 변경됨' : '실패');
