const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/brain-engine/engines/chat/room.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "    metadata: { tags, maxParticipants, createdBy },",
  "    metadata: { tags, maxParticipants, createdBy, isPublic },\n    is_public: isPublic,"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
