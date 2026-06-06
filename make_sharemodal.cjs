const fs = require('fs');

const tsx = `'use client';
import { useState } from 'react';
import styles from './ShareRoomModal.module.css';

interface ShareRoomModalProps {
  roomCode: string;
  onClose: () => void;
}

export default function ShareRoomModal({ roomCode, onClose }: ShareRoomModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKakao = () => {
    const msg = encodeURIComponent(\`CoreRing 채팅방에 초대합니다! 방 코드: \${roomCode}\\nhttps://corering.vercel.app\`);
    window.open(\`https://open.kakao.com/o/share?text=\${msg}\`, '_blank');
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'CoreRing 채팅방 초대',
        text: \`방 코드: \${roomCode}\`,
        url: 'https://corering.vercel.app',
      }).catch(() => null);
    } else {
      handleCopy();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.emoji}>🎉</p>
        <h2 className={styles.title}>방이 만들어졌어요!</h2>
        <p className={styles.subtitle}>친구에게 코드를 공유해보세요</p>

        <div className={styles.codeBox}>
          <span className={styles.code}>{roomCode}</span>
        </div>

        <div className={styles.btnGroup}>
          <button className={styles.copyBtn} onClick={handleCopy}>
            {copied ? '✅ 복사됨' : '📋 코드 복사'}
          </button>
          <button className={styles.shareBtn} onClick={handleShare}>
            📤 공유하기
          </button>
        </div>

        <button className={styles.closeBtn} onClick={onClose}>
          나중에 할게요
        </button>
      </div>
    </div>
  );
}
`;

const css = \`.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  width: 90%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.emoji {
  font-size: 48px;
  margin: 0;
}

.title {
  font-size: var(--font-lg);
  font-weight: var(--weight-bold);
  color: var(--color-text);
  margin: 0;
}

.subtitle {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  margin: 0;
}

.codeBox {
  background: var(--color-surface);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-5);
  width: 100%;
  text-align: center;
}

.code {
  font-size: 32px;
  font-weight: var(--weight-bold);
  color: var(--color-accent);
  letter-spacing: 6px;
}

.btnGroup {
  display: flex;
  gap: var(--space-2);
  width: 100%;
}

.copyBtn,
.shareBtn {
  flex: 1;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  font-size: var(--font-sm);
  min-height: var(--touch-min-height);
}

.copyBtn {
  background: var(--color-accent);
  color: var(--color-bg);
}

.shareBtn {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.closeBtn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: var(--font-xs);
  cursor: pointer;
  padding: var(--space-2);
}
\`;

fs.writeFileSync('C:/brainpool-clean/brainpool-clean/components/ShareRoomModal.tsx', tsx, 'utf8');
fs.writeFileSync('C:/brainpool-clean/brainpool-clean/components/ShareRoomModal.module.css', css, 'utf8');
console.log('완료');
