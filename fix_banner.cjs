const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '<WordModal',
  `{showRoomBanner && !currentRoomId && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-accent)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          width: '90%',
          maxWidth: '400px',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-sm)', margin: 0 }}>
            상대방과 함께 사용하시나요?
          </p>
          <button
            onClick={() => {
              setShowRoomBanner(false);
              setIsRoomMode(true);
            }}
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px',
              cursor: 'pointer',
              fontSize: 'var(--font-sm)',
            }}
          >
            💬 채팅방 만들기
          </button>
          <button
            onClick={() => setShowRoomBanner(false)}
            style={{
              background: 'transparent',
              color: 'var(--color-text-muted)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--font-xs)',
            }}
          >
            닫기
          </button>
        </div>
      )}

      <WordModal`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
