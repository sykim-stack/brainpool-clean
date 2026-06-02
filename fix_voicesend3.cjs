const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldFunc = `  const handleVoiceSend = useCallback((audioUrl: string) => {
    setMessages(prev => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, audioUrl }];
    });
  }, []);`;

const newFunc = `  const handleVoiceSend = useCallback(async (audioUrl: string) => {
    // 음성 메시지 채팅 전송
    const voiceText = '🎤 음성 메시지';
    if (currentRoomId) {
      await sendMessageToRoom(currentRoomId, voiceText);
    }
    // 마지막 메시지에 audioUrl 붙이기
    setMessages(prev => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, audioUrl }];
    });
  }, [currentRoomId]);`;

content = content.replace(oldFunc, newFunc);
fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('음성 메시지') ? '성공' : '실패');
