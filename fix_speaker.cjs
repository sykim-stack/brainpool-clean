const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatBubble.tsx';
let content = fs.readFileSync(path, 'utf8');

// props destructuring에 audioUrl 추가
content = content.replace(
  "  isFirstLang,\n  onClick,\n  onWordClick,",
  "  isFirstLang,\n  onClick,\n  onWordClick,\n  audioUrl,"
);

// 🔊 버튼 추가 (timestamp 앞에)
content = content.replace(
  "        <span>\n          {new Date(timestamp).toLocaleTimeString",
  `        {audioUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                new Audio(audioUrl).play().catch(() => null);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}
            >🔊</button>
          )}
          <span>
          {new Date(timestamp).toLocaleTimeString`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('🔊') ? '성공' : '실패');
