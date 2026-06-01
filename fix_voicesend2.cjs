const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Message에 audioUrl 추가
content = content.replace(
  "  userId?: string;\n}",
  "  userId?: string;\n  audioUrl?: string;\n}"
);

// handleVoiceSend 함수 추가
const voiceFunc = `
  const handleVoiceSend = useCallback((audioUrl: string) => {
    setMessages(prev => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, audioUrl }];
    });
  }, []);
`;

content = content.replace(
  "  const handleBubbleClick = useCallback",
  voiceFunc + "\n  const handleBubbleClick = useCallback"
);

// ChatInput에 onVoiceSend 연결
content = content.replace(
  "<ChatInput onSend={handleSend} onTypingChange={setIsTyping} userId={deviceId} />",
  "<ChatInput onSend={handleSend} onTypingChange={setIsTyping} userId={deviceId} onVoiceSend={handleVoiceSend} />"
);

// poll enriched에 audioUrl 추가
content = content.replace(
  "          userId:     m.userId || '',",
  "          userId:     m.userId || '',\n          audioUrl:   m.audioUrl || undefined,"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('handleVoiceSend') ? '성공' : '실패');
