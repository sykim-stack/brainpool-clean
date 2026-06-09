const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/api/phrase/route.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "  if (action === 'get-random-word') return 'getRandomWord';",
  "  if (action === 'get-random-word') return 'getRandomWord';\n  if (action === 'save-audio') return 'saveAudio';"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('saveAudio') ? '성공' : '실패');
