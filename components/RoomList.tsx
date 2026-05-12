'use client';
import { useState } from 'react';
import styles from './RoomList.module.css';

interface Room {
  roomId: string;
  title: string;
  inviteCode?: string;
  messageCount?: number;
  isPublic?: boolean;
}

interface RoomListProps {
  rooms: Room[];
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  onJoinByCode: (inviteCode: string) => void;
  visible: boolean;
}

export default function RoomList({ rooms, onSelectRoom, onCreateRoom, onJoinByCode, visible }: RoomListProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  if (!visible) return null;

  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || trimmed.length !== 6) {
      setError('6자리 코드를 입력하세요');
      return;
    }
    setError('');
    onJoinByCode(trimmed);
    setCode('');
  };

  return (
    <div className="room-overlay">
      <div className={styles.inner}>

        <div className={styles.joinSection}>
          <div className={styles.joinRow}>
            <input
              className={styles.joinInput}
              type="text"
              placeholder="초대코드 6자리"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <button className={styles.joinBtn} onClick={handleJoin}>입장</button>
          </div>
          {error && <p className={styles.joinError}>{error}</p>}
        </div>

        <div className={styles.divider}>공개 방 목록</div>

        <button onClick={onCreateRoom} className={styles.createBtn}>
          + 새 방 만들기
        </button>

        {rooms.length === 0 && (
          <p className={styles.empty}>공개 방이 없습니다</p>
        )}

        {rooms.map((room) => (
          <div
            key={room.roomId}
            className={`room-item ${styles.roomItem}`}
            onClick={() => onSelectRoom(room.roomId)}
          >
            <div>
              <div className="room-name">{room.title}</div>
              {room.inviteCode && (
                <div className={`room-meta ${styles.inviteCode}`}>
                  코드: {room.inviteCode}
                </div>
              )}
            </div>
            <div className="room-meta">{room.messageCount || 0} 메시지</div>
          </div>
        ))}
      </div>
    </div>
  );
}