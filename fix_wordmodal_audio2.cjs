const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/WordModal.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("console.log('[발음저장] URL:', url);")) {
    lines.splice(i+1, 0,
      "              // audio_contributions DB 저장",
      "              fetch('/api/phrase', {",
      "                method: 'POST',",
      "                headers: { 'Content-Type': 'application/json; charset=utf-8' },",
      "                body: JSON.stringify({",
      "                  action: 'save-audio',",
      "                  user_id: userId,",
      "                  word: word,",
      "                  dialect: sourceLang === 'ko' ? 'korean' : 'vietnamese',",
      "                  audio_url: url,",
      "                  session_id: data.sessionId || null,",
      "                }),",
      "              }).catch(() => null);"
    );
    console.log('삽입 완료 at line:', i+1);
    break;
  }
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('완료');
