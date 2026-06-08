const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/brain-engine/engines/chat/room.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "insert({ room_name: title, invite_code: generateInviteCode(), room_type: 'chat', created_by: null, owner_device_id: createdBy, is_permanent: false, metadata: { tags, maxParticipants, createdBy } })",
  "insert({ room_name: title, invite_code: generateInviteCode(), room_type: 'chat', created_by: null, owner_device_id: createdBy, is_permanent: false, is_public: isPublic, metadata: { tags, maxParticipants, createdBy, isPublic } })"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('is_public: isPublic') ? '성공' : '실패');
