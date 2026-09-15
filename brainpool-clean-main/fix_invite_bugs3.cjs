const fs = require('fs');
const path = 'app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const before = "        isRoomMode={isRoomMode}";
const after = "        isRoomMode={isRoomMode || !!currentRoomId}";

if (content.includes(after)) {
  console.log('SKIP 이미 적용됨');
} else if (content.includes(before)) {
  content = content.replace(before, after);
  fs.writeFileSync(path, content, 'utf8');
  console.log('OK BrainHeader isRoomMode prop 수정 완료');
} else {
  console.log('X 대상 문자열 못 찾음 - 확인 필요');
}
