const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '  userId?: string;\n}',
  '  userId?: string;\n  audioUrl?: string;\n}'
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('audioUrl?: string') ? '성공' : '실패');
