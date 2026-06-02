const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatBubble.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const speakerBtn = [
  '        {audioUrl && (',
  '          <button',
  '            onClick={(e) => {',
  '              e.stopPropagation();',
  '              new Audio(audioUrl).play().catch(() => null);',
  '            }}',
  '            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}',
  '          >\uD83D\uDD0A</button>',
  '        )}',
];

lines.splice(177, 0, ...speakerBtn);
fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('완료:', lines.join('\n').includes('audioUrl') ? '성공' : '실패');
