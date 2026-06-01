const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatInput.tsx';
let content = fs.readFileSync(path, 'utf8');

// onVoiceSend props 추가
content = content.replace(
  "  onTypingChange?: (isTyping: boolean) => void;\n  userId?: string;",
  "  onTypingChange?: (isTyping: boolean) => void;\n  userId?: string;\n  onVoiceSend?: (audioUrl: string) => void;"
);

content = content.replace(
  "export default function ChatInput({ onSend, onTypingChange, userId }: ChatInputProps)",
  "export default function ChatInput({ onSend, onTypingChange, userId, onVoiceSend }: ChatInputProps)"
);

// URL 받으면 onVoiceSend 호출
content = content.replace(
  "          if (json?.url) {\n            console.log('[Voice] 저장 완료:', json.url);\n          }",
  "          if (json?.url) {\n            console.log('[Voice] 저장 완료:', json.url);\n            if (onVoiceSend) onVoiceSend(json.url);\n          }"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
