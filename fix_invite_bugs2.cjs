const fs = require('fs');
const path = 'app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const before = "        project={isRoomMode ? 'chat' : 'ring'}";
const after = "        project={(isRoomMode || currentRoomId) ? 'chat' : 'ring'}";

if (content.includes(after)) {
  console.log('SKIP 이미 적용됨');
} else if (content.includes(before)) {
  content = content.replace(before, after);
  fs.writeFileSync(path, content, 'utf8');
  console.log('OK 버그2 수정: header project를 currentRoomId 기준으로 판단');
} else {
  console.log('X 대상 문자열 못 찾음 - 확인 필요');
}
