const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// showRoomBanner state 추가
content = content.replace(
  "const [showDaily, setShowDaily] = useState(true);",
  "const [showDaily, setShowDaily] = useState(true);\n  const [showRoomBanner, setShowRoomBanner] = useState(false);"
);

// handleSend에서 자동 방생성 제거하고 번역만 하도록
const oldCode = content.substring(
  content.indexOf("if (!currentRoomId) {"),
  content.indexOf("} else {", content.indexOf("if (!currentRoomId) {")) + 8
);

console.log('찾은 코드:', oldCode.substring(0, 100));

const newCode = `if (!currentRoomId) {
      // 방 없으면 번역만 하고 배너 표시
      try {
        const res = await fetch('/api/brainpool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ text }),
        }).catch(() => null);
        const data = res ? await res.json().catch(() => null) : null;
        if (data?.message) {
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
        }
      } catch (e) {}
      setShowRoomBanner(true);
      setIsLoading(false);
      return;
    } else {`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('setShowRoomBanner') ? '성공' : '실패');
