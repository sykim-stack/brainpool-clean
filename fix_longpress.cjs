const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/WordModal.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "      onTouchStart={(e) => { e.preventDefault(); startRecording(); }}\n              onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}\n              onMouseDown={startRecording}\n              onMouseUp={stopRecording}",
  `      onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); startRecording(); }}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); stopRecording(); }}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              style={{ width: '100%', userSelect: 'none', WebkitUserSelect: 'none' }}`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
