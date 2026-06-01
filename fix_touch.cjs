const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatInput.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  `        onPointerDown={startRecording}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}`,
  `        onPointerDown={startRecording}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
        onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
