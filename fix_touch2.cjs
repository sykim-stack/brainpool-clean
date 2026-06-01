const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatInput.tsx';
let content = fs.readFileSync(path, 'utf8');

const old = `        onPointerDown={startRecording}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
        onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
        onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
        onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}`;

const newCode = `        onPointerDown={startRecording}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
        onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}`;

content = content.replace(old, newCode);
fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('onTouchStart') ? '성공' : '실패');
