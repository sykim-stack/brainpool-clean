const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/brain-engine/engines/chat/message.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "    original:     m.original || m.message,",
  "    original:     m.message || m.content || '',"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
