const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatInput.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  `          if (blob.size > 1000) {
            setIsUploading(true);
            try {
              const audioUrl = await uploadAudio(blob, mType);
              console.log('[Voice] URL:', audioUrl);
              if (audioUrl && onVoiceSend) onVoiceSend(audioUrl);
            } finally {
              setIsUploading(false);
            }
          }`,
  `          if (blob.size > 1000) {
            setIsUploading(true);
            try {
              // 1. Whisper STT
              const sttForm = new FormData();
              sttForm.append('file', blob, 'audio.webm');
              sttForm.append('lang', 'vi');
              const sttRes = await fetch('/api/voice/stt', {
                method: 'POST',
                body: sttForm,
              }).catch(() => null);
              const sttJson = sttRes ? await sttRes.json().catch(() => null) : null;
              const transcript = sttJson?.text || '';
              console.log('[STT] 결과:', transcript);

              // 2. 백그라운드 음성 저장
              const audioUrl = await uploadAudio(blob, mType);
              console.log('[Voice] URL:', audioUrl);

              // 3. 텍스트로 채팅 전송
              if (transcript) {
                onSend(transcript);
              }

              // 4. audioUrl 콜백
              if (audioUrl && onVoiceSend) onVoiceSend(audioUrl);
            } finally {
              setIsUploading(false);
            }
          }`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('Whisper STT') ? '성공' : '실패');
