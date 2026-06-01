const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatBubble.tsx';
let content = fs.readFileSync(path, 'utf8');

// props에 audioUrl 추가
content = content.replace(
  "  onClick?: () => void;",
  "  onClick?: () => void;\n  audioUrl?: string;"
);

content = content.replace(
  "  isFirstLang,\n  onClick,",
  "  isFirstLang,\n  onClick,\n  audioUrl,"
);

// 🔊 버튼 추가 (timestamp 옆에)
content = content.replace(
  "        <span>\n          {new Date(timestamp)",
  `        {audioUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                new Audio(audioUrl).play().catch(() => null);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '0 4px',
              }}
            >🔊</button>
          )}
          <span>
          {new Date(timestamp)`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('audioUrl') ? '성공' : '실패');
