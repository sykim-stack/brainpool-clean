'use client';

import styles from './BrainLogo.module.css';

interface BrainLogoProps {
  project?: 'ring' | 'null' | 'chat';
  isTyping: boolean;
  onClick?: () => void;
}

export default function BrainLogo({ project = 'ring', isTyping, onClick }: BrainLogoProps) {
  const getProjectName = () => {
    switch (project) {
      case 'chat': return 'CHAT';
      case 'null': return 'NULL';
      default: return 'RING';
    }
  };

  const getMorsePattern = () => {
    switch (project) {
      case 'chat': return ['dash', 'dot', 'dash', 'dot'];
      case 'null': return ['dash', 'dot'];
      default: return ['dot', 'dash', 'dot'];
    }
  };

  const pattern = getMorsePattern();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    // 기본: 앱 홈으로 새로고침 (상태·탭 초기화)
    if (typeof window !== 'undefined') {
      window.location.assign('/');
    }
  };

  return (
    <button
      type="button"
      className={`brain-logo ${styles.wrapper}`}
      onClick={handleClick}
      aria-label="홈으로 새로고침"
      title="홈으로 새로고침"
    >
      <div className={styles.title}>
        <span className={styles.core}>CORE</span>
        <span className={styles.project}>{getProjectName()}</span>
      </div>

      <div className={styles.morseRow}>
        {pattern.map((type, i) => (
          <div
            key={i}
            className={`${styles.morseDot} ${type === 'dash' ? styles.morseDash : styles.morseShort} ${isTyping ? styles.typing : ''}`}
          />
        ))}
      </div>
    </button>
  );
}
