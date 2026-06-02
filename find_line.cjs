const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatBubble.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// "        <span>" 라인 찾기
const idx = lines.findIndex(l => l.trim() === '<span>' && lines[lines.indexOf(l) + 1]?.includes('toLocaleTimeString'));
console.log('찾은 인덱스:', idx);

// 실제 위치 찾기
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('toLocaleTimeString')) {
    console.log('toLocaleTimeString 위치:', i);
    console.log('주변 라인:', lines.slice(i-2, i+4).join('\n'));
    break;
  }
}
