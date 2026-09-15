const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatBubble.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "              audio.playsInline = true;",
  "              (audio as any).playsInline = true;"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
