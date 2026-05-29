const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatInput.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "const recorder = new MediaRecorder(stream);",
  "const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';\n      const recorder = new MediaRecorder(stream, { mimeType });"
);

content = content.replace(
  "const blob = new Blob(audioChunks.current, { type: 'audio/webm' });",
  "const mType = mediaRecorder.current?.mimeType || 'audio/webm';\n          const blob = new Blob(audioChunks.current, { type: mType });"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
