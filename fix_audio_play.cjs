const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/WordModal.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "onClick={() => new Audio(audioUrl).play()}",
  `onClick={() => {
                const audio = new Audio(audioUrl);
                audio.play().catch(() => {
                  // iOS fallback
                  window.open(audioUrl, '_blank');
                });
              }}`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
