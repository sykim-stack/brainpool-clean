const fs = require('fs');
const path = 'G:\\brainpool-clean\\app\\api\\phrase\\route.ts';

const src = fs.readFileSync(path, 'utf8');
const lines = src.split('\n');

const target = "if (action === 'save-audio') return 'saveAudio';";
const addition = "  if (action === 'get-audio') return 'getAudio';";

const idx = lines.findIndex(l => l.includes(target));
if (idx === -1) {
  console.error('❌ save-audio 라인 못 찾음');
  process.exit(1);
}

lines.splice(idx + 1, 0, addition);
fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('✅ normalizeAction get-audio 추가 완료');