const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatBubble.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '  isFirstLang,\r\n  onClick,\r\n  onWordClick,\r\n}',
  '  isFirstLang,\r\n  onClick,\r\n  onWordClick,\r\n  audioUrl,\r\n}'
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('audioUrl,') ? '성공' : '실패');
