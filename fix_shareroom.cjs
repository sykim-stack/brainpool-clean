const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// RoomList onCreateRoom 후 setShareRoomCode 추가
content = content.replace(
  "            setCurrentRoomId(data.payload.room.roomId);\n            setCurrentRoomCode(data.payload.room.inviteCode || '------');\n            saveMyRoom(data.payload.room);\n            setIsRoomMode(false);",
  "            setCurrentRoomId(data.payload.room.roomId);\n            setCurrentRoomCode(data.payload.room.inviteCode || '------');\n            saveMyRoom(data.payload.room);\n            setShareRoomCode(data.payload.room.inviteCode || null);\n            setIsRoomMode(false);"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('setShareRoomCode(data.payload.room.inviteCode') ? '성공' : '실패');
