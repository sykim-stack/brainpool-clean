const fs = require('fs');
const path = 'G:\\brainpool-clean\\app\\layout.tsx';

let src = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const oldSW = `if ('serviceWorker' in navigator && !/KAKAOTALK/i.test(navigator.userAgent)) {`;
const newSW = `if ('serviceWorker' in navigator) {`;

if (!src.includes(oldSW)) {
  console.error('❌ 못 찾음');
  process.exit(1);
}

src = src.replace(oldSW, newSW);
fs.writeFileSync(path, src, 'utf8');
console.log('✅ SW 카카오 스킵 제거 완료');