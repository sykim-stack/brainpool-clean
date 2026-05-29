const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatInput.tsx';
let content = fs.readFileSync(path, 'utf8');

// onstop 안의 업로드 부분 교체
content = content.replace(
  "const blob = new Blob(audioChunks.current, { type: 'audio/webm' });\n          console.log('[Voice] blob size:', blob.size, 'chunks:', audioChunks.current.length);\n\n          const fileName = `voice/${userId || 'anon'}/${Date.now()}.webm`;\n          const formData = new FormData();\n          formData.append('file', blob, fileName);\n          formData.append('fileName', fileName);\n\n          const uploadRes = await fetch('/api/voice/upload', {\n            method: 'POST',\n            body: formData,\n          }).catch(() => null);",
  `const mType = mediaRecorder.current?.mimeType || 'audio/webm';
          const blob = new Blob(audioChunks.current, { type: mType });
          console.log('[Voice] blob size:', blob.size, 'mimeType:', mType, 'chunks:', audioChunks.current.length);

          const fileName = \`voice/\${userId || 'anon'}/\${Date.now()}.webm\`;
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

          const uploadRes = await fetch('/api/voice/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64, fileName, mimeType: mType }),
          }).catch(() => null);`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('base64') ? 'base64 있음' : '실패');
