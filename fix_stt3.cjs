const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatInput.tsx';
let content = fs.readFileSync(path, 'utf8');

const old = `            // 1. Whisper STT
            const sttForm = new FormData();
            sttForm.append('file', blob, 'audio.webm');
            sttForm.append('lang', 'vi');
            const sttRes = await fetch('/api/voice/stt', {
              method: 'POST',
              body: sttForm,
            }).catch(() => null);
            const sttJson = sttRes ? await sttRes.json().catch(() => null) : null;
            const transcript = sttJson?.text || '';
            console.log('[STT] 결과:', transcript);`;

const newCode = `            // 1. STT 결과 (stopRecording에서 이미 받음)
            const transcript = transcriptRef.current || '';
            console.log('[STT] 결과:', transcript);`;

content = content.replace(old, newCode);
fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('transcriptRef.current') ? '성공' : '실패');
