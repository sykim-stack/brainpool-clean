const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ChatBubble.tsx';
let content = fs.readFileSync(path, 'utf8');

const old = `        <span>
          {new Date(timestamp).toLocaleTimeString('ko-KR', {
            hour: '2-digit', minute: '2-digit',
          })}
        </span>`;

const newCode = `        {audioUrl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              new Audio(audioUrl).play().catch(() => null);
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}
          >🔊</button>
        )}
        <span>
          {new Date(timestamp).toLocaleTimeString('ko-KR', {
            hour: '2-digit', minute: '2-digit',
          })}
        </span>`;

content = content.replace(old, newCode);
fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('🔊') ? '성공' : '실패');
