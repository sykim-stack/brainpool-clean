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

  return (
    <div
      className={`brain-logo ${styles.wrapper}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      style={onClick ? { cursor: 'pointer' } : undefined}
      aria-label={onClick ? '홈으로 새로고침' : undefined}
    >
      {/* 첫 줄: CORE + 프로젝트명 */}
      <div className={styles.title}>
        <span className={styles.core}>CORE</span>
        <span className={styles.project}>{getProjectName()}</span>
      </div>

      {/* 둘째 줄: 모스 부호 */}
      <div className={styles.morseRow}>
        {pattern.map((type, i) => (
          <div
            key={i}
            className={`${styles.morseDot} ${type === 'dash' ? styles.morseDash : styles.morseShort} ${isTyping ? styles.typing : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
