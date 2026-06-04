const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatBubble.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "new Audio(audioUrl).play().catch(() => null);",
  `const audio = new Audio(audioUrl);
              audio.play().catch(() => { window.open(audioUrl, '_blank'); });`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
