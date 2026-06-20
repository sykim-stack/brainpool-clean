const fs = require('fs');
const path = 'G:\\brainpool-clean\\app\\layout.tsx';

let src = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const oldSW = `if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js');
              });
            }`;

const newSW = `if ('serviceWorker' in navigator && !/KAKAOTALK/i.test(navigator.userAgent)) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js');
              });
            }`;

if (!src.includes(oldSW)) {
  console.error('❌ SW 블록 못 찾음');
  process.exit(1);
}

src = src.replace(oldSW, newSW);
fs.writeFileSync(path, src, 'utf8');
console.log('✅ 카카오 SW 등록 스킵 완료');