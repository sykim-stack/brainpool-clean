const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const idx = content.indexOf('handleSend = useCallback(async (text: string) => {');
const endIdx = content.indexOf('}, [currentRoomId, deviceId, loadRooms]);', idx) + '}, [currentRoomId, deviceId, loadRooms]);'.length;

const newHandleSend = `handleSend = useCallback(async (text: string) => {
    setIsLoading(true);
    if (!currentRoomId) {
      try {
        const res = await fetch('/api/brainpool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ text }),
        }).catch(() => null);
        const data = res ? await res.json().catch(() => null) : null;
        if (data?.payload) {
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
          // 양방향 대화 감지
          setLangHistory(prev => {
            const updated = [...prev, srcLang || 'unknown'];
            const hasKo = updated.includes('ko');
            const hasVi = updated.includes('vi');
            if (hasKo && hasVi) setShowRoomBanner(true);
            return updated;
          });
        }
      } catch (e) {}
      setIsLoading(false);
      return;
    } else {
      await sendMessageToRoom(currentRoomId, text);
    }
    setIsLoading(false);
  }, [currentRoomId, deviceId, loadRooms]);`;

content = content.substring(0, idx) + newHandleSend + content.substring(endIdx);
fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('langHistory') ? '성공' : '실패');
