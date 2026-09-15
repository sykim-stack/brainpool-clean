const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/page.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const room = rooms.find(r => r.roomId === id);')) {
    lines[i] = "          const room = rooms.find(r => r.roomId === id) || myRooms.find(r => r.roomId === id);";
    console.log('수정 완료 at line:', i+1);
    break;
  }
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('완료');
