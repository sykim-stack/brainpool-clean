const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldFunc = `  const handleVoiceSend = useCallback(async (audioUrl: string) => {
    // 음성 메시지 채팅 전송
    const voiceText = '🎤 음성 메시지';
    if (currentRoomId) {
      await sendMessageToRoom(currentRoomId, voiceText);
    }
    // 마지막 메시지에 audioUrl 붙이기
    setMessages(prev => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, audioUrl }];`;

const newFunc = `  const handleVoiceSend = useCallback(async (audioUrl: string) => {
    // 음성 메시지 즉시 화면에 추가
    const voiceMsg = {
      messageId: crypto.randomUUID(),
      original: '🎤 음성 메시지',
      translated: '🎤 음성 메시지',
      sourceLang: 'ko',
      targetLang: 'vi',
      emotion: 'neutral',
      riskScore: 0,
      timestamp: new Date().toISOString(),
      userId: deviceId,
      audioUrl,
    };
    setMessages(prev => [...prev, voiceMsg]);
    // 방 있으면 채팅 전송
    if (currentRoomId) {
      await sendMessageToRoom(currentRoomId, '🎤 음성 메시지');
    }
    // 마지막 메시지에 audioUrl 붙이기 (dummy)
    setMessages(prev => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, audioUrl }];`;

content = content.replace(oldFunc, newFunc);
fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('voiceMsg') ? '성공' : '실패');
