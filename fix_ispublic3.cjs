const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/api/chat/route.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "    const { title, createdBy, tags, maxParticipants } = body;",
  "    const { title, createdBy, tags, maxParticipants, isPublic = true } = body;"
);

content = content.replace(
  "payload: { title, createdBy: createdBy || 'anonymous', tags: tags || [], maxParticipants: maxParticipants || 100 }",
  "payload: { title, createdBy: createdBy || 'anonymous', tags: tags || [], maxParticipants: maxParticipants || 100, isPublic }"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('isPublic') ? '성공' : '실패');
