'use client';

import styles from './RoomBar.module.css';

interface RoomBarProps {
  nickname: string;
  roomCode: string;
  onChangeNickname: () => void;
  onCopyCode: () => void;
  onExit: () => void;
  visible: boolean;
}

export default function RoomBar({
  nickname,
  roomCode,
  onChangeNickname,
  onCopyCode,
  onExit,
  visible,
}: RoomBarProps) {
  if (!visible) return null;

  return (
    <div className="room-bar">
      <div className={styles.left}>
        <button onClick={onChangeNickname} className={styles.nicknameBtn}>
          ✎ {nickname}
        </button>
        <button className="room-code" onClick={onCopyCode}>
          ● {roomCode}
        </button>
      </div>
      <button className="icon-btn" onClick={onExit} title="나가기">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  );
}