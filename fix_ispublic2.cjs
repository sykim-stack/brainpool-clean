const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/brain-engine/engines/chat/room.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "  const { title, createdBy = 'anonymous', tags = [], maxParticipants = 100 } = ctx.payload || {};",
  "  const { title, createdBy = 'anonymous', tags = [], maxParticipants = 100, isPublic = true } = ctx.payload || {};"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('isPublic = true') ? '성공' : '실패');
