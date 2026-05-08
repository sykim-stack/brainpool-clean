'use client';

import BrainLogo from './BrainLogo';
import styles from './BrainHeader.module.css';

interface BrainHeaderProps {
  project?: 'ring' | 'null' | 'chat';
  isRoomMode: boolean;
  onRoomToggle: () => void;
  isTyping: boolean;
  onClear: () => void;
  onShare: () => void;
}

export default function BrainHeader({
  project = 'ring',
  isRoomMode,
  onRoomToggle,
  isTyping,
  onClear,
  onShare,
}: BrainHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.row}>

        {/* 좌측: 로고 */}
        <BrainLogo project={project} isTyping={isTyping} />

        {/* 우측: 액션 버튼 묶음 */}
        <div className={styles.actions}>

          {/* ROOM 토글 */}
          <div className={styles.roomToggle}>
            <span className={styles.roomLabel}>ROOM</span>
            <label className={`toggle-switch ${isRoomMode ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={isRoomMode}
                onChange={onRoomToggle}
              />
              <div className="toggle-track" />
              <div className="toggle-thumb" />
            </label>
          </div>

          {/* 구분선 */}
          <span className={styles.divider} />

          {/* 삭제 */}
          <button
            className="icon-btn"
            onClick={onClear}
            aria-label="대화 삭제"
          >
            <svg
              viewBox="0 0 24 24"
              width="17"
              height="17"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>

          {/* 공유 */}
          <button
            className="icon-btn"
            onClick={onShare}
            aria-label="공유"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>

        </div>
      </div>
    </header>
  );
}