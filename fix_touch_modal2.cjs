const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/WordModal.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  `      onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
              onClick={startRecording}`,
  `      onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
