const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  `        if (data?.message) {
          const msg = data.message;
          const srcLang = msg.meta?.sourceLang || null;
          const tgtLang = srcLang === 'ko' ? 'vi' : 'ko';
          setMessages(prev => [...prev, {
            messageId: msg.id,
            original: msg.payload.original,
            translated: msg.payload.translated,
            sourceLang: srcLang,
            targetLang: tgtLang,
            emotion: msg.meta?.emotion || 'neutral',
            riskScore: 0,
            timestamp: new Date().toISOString(),
            userId: deviceId,
          }]);
        }`,
  `        if (data?.payload) {
          const p = data.payload;
          const srcLang = p.sourceLang || null;
          const tgtLang = p.targetLang || (srcLang === 'ko' ? 'vi' : 'ko');
          setMessages(prev => [...prev, {
            messageId: p.id || crypto.randomUUID(),
            original: p.original || text,
            translated: p.translated || text,
            sourceLang: srcLang,
            targetLang: tgtLang,
            emotion: p.emotion || 'neutral',
            riskScore: 0,
            timestamp: new Date().toISOString(),
            userId: deviceId,
          }]);
        }`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes("data?.payload") ? '성공' : '실패');
