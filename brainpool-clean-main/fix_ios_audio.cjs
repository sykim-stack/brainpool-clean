const fs = require('fs');

// ChatBubble 🔊 버튼 iOS 호환
const bubblePath = 'C:/brainpool-clean/brainpool-clean/components/ChatBubble.tsx';
let bubble = fs.readFileSync(bubblePath, 'utf8');

bubble = bubble.replace(
  `const audio = new Audio(audioUrl);
              audio.play().catch(() => { window.open(audioUrl, '_blank'); });`,
  `// iOS 호환 재생
              const audio = document.createElement('audio');
              audio.src = audioUrl;
              audio.controls = false;
              audio.playsInline = true;
              document.body.appendChild(audio);
              audio.play().catch(() => { window.open(audioUrl, '_blank'); });
              audio.onended = () => document.body.removeChild(audio);`
);

fs.writeFileSync(bubblePath, bubble, 'utf8');
console.log('ChatBubble 완료');

// WordModal 🔊 버튼 iOS 호환
const modalPath = 'C:/brainpool-clean/brainpool-clean/components/WordModal.tsx';
let modal = fs.readFileSync(modalPath, 'utf8');

modal = modal.replace(
  `onClick={() => {\n                const audio = new Audio(audioUrl);\n                audio.play().catch(() => {\n                  // iOS fallback\n                  window.open(audioUrl, '_blank');\n                });\n              }}`,
  `onClick={() => {
                const audio = document.createElement('audio');
                audio.src = audioUrl!;
                audio.playsInline = true;
                document.body.appendChild(audio);
                audio.play().catch(() => { window.open(audioUrl!, '_blank'); });
                audio.onended = () => document.body.removeChild(audio);
              }}`
);

fs.writeFileSync(modalPath, modal, 'utf8');
console.log('WordModal 완료');
