'use client';

import styles from './RoomList.module.css';

interface Room {
  roomId: string;
  title: string;
  inviteCode?: string;
  messageCount?: number;
}

interface RoomListProps {
  rooms: Room[];
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  visible: boolean;
}

export default function RoomList({ rooms, onSelectRoom, onCreateRoom, visible }: RoomListProps) {
  if (!visible) return null;

  return (
    <div className="room-overlay">
      <div className={styles.inner}>
        <button
          onClick={onCreateRoom}
          className={styles.createBtn}
        >
          ＋ 새 채팅방 만들기
        </button>

        {rooms.length === 0 && (
          <p className={styles.empty}>아직 방이 없습니다</p>
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
            <div className="room-meta">
              {room.messageCount || 0} 메시지
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}