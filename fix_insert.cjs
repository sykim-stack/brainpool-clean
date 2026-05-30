const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/brain-engine/engines/chat/message.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  `  const { error: insertError } = await db.from('messages').insert({
    room_id:       roomId,
    sender_id:     isUUID(userId) ? userId : null,
    sender_role:   'user',
    message:       original,
    original:      original,
    translated_ko: meta.translations?.ko || null,
    translated_vi: meta.translations?.vi || null,
    nickname:      userId,
    device_id:     userId,
    target_lang:   meta.targetLang || null,
  });`,
  `  const { error: insertError } = await db.from('messages').insert({
    room_id:       roomId,
    user_id:       isUUID(userId) ? userId : null,
    message:       original,
    translated_ko: meta.translations?.ko || null,
    translated_vi: meta.translations?.vi || null,
    nickname:      userId,
    device_id:     userId,
    type:          'chat',
    content:       original,
  });`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
