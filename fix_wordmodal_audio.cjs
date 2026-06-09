const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/WordModal.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "          if (url) {\n            setAudioUrl(url);\n            console.log('[발음저장] URL:', url);\n          }",
  `          if (url) {
            setAudioUrl(url);
            console.log('[발음저장] URL:', url);
            // audio_contributions DB 저장
            await fetch('/api/phrase', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
              body: JSON.stringify({
                action: 'save-audio',
                user_id: userId,
                word: word,
                dialect: sourceLang === 'ko' ? 'korean' : 'vietnamese',
                audio_url: url,
                session_id: data.sessionId || null,
              }),
            }).catch(() => null);
            console.log('[발음저장] DB 저장 완료');
          }`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('save-audio') ? '성공' : '실패');
