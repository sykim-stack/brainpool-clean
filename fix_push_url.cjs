const fs = require('fs');
const path = 'app/api/chat/route.ts';
let content = fs.readFileSync(path, 'utf8');

const before = `body: JSON.stringify({ room_id: roomId, sender_id: userId, title: 'CoreRing', body: original.length > 50 ? original.slice(0, 50) + '...' : original, url: '/' }),`;
const after  = `body: JSON.stringify({ room_id: roomId, sender_id: userId, title: 'CoreRing', body: original.length > 50 ? original.slice(0, 50) + '...' : original, url: \`/?room=\${roomId}\` }),`;

if (content.includes(before)) {
  content = content.replace(before, after);
  fs.writeFileSync(path, content, 'utf8');
  console.log('✅ 푸시 url에 room_id 포함 완료');
} else if (content.includes('url: `/?room=')) {
  console.log('⏭️ 이미 적용되어 있음 (스킵)');
} else {
  console.log('❌ 대상 문자열을 찾지 못함 — route.ts 직접 확인 필요');
}
