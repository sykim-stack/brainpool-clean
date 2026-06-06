const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/page.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('saveMyRoom(data.payload.room)') && lines[i+1]?.includes('setIsRoomMode(false)')) {
    lines.splice(i+1, 0, "            setShareRoomCode(data.payload.room.inviteCode || null);");
    console.log('삽입 완료 at line:', i+1);
    break;
  }
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('완료');
