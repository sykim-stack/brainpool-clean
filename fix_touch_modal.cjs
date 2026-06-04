const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/WordModal.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  `      onPointerDown={startRecording}
              onPointerUp={stopRecording}
              onPointerLeave={stopRecording}
              onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}`,
  `      onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
              onClick={startRecording}`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
