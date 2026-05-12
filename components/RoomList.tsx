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
  onCreateRoom: (title: string, isPublic: boolean) => void;
  onJoinByCode: (inviteCode: string) => void;
  visible: boolean;
}

export default function RoomList({ rooms, onSelectRoom, onCreateRoom, onJoinByCode, visible }: RoomListProps) {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  if (!visible) return null;

  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || trimmed.length !== 6) {
      setCodeError('6자리 코드를 입력해주세요.');
      return;
    }
    setCodeError('');
    onJoinByCode(trimmed);
    setCode('');
  };

  const handleCreate = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    onCreateRoom(trimmed, isPublic);
    setNewTitle('');
    setIsPublic(true);
    setShowCreateForm(false);
  };

  return (
    <div className="room-overlay">
      <div className={styles.inner}>

        {/* 초대코드 입장 */}
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
          {codeError && <p className={styles.joinError}>{codeError}</p>}
        </div>

        <div className={styles.divider}>공개 방 목록</div>

        {/* 방 생성 폼 */}
        {!showCreateForm ? (
          <button onClick={() => setShowCreateForm(true)} className={styles.createBtn}>
            + 새 채팅방 만들기
          </button>
        ) : (
          <div className={styles.createForm}>
            <input
              className={styles.createInput}
              type="text"
              placeholder="방 제목"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>공개방</span>
              <label className={`toggle-switch ${isPublic ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <div className="toggle-track" />
                <div className="toggle-thumb" />
              </label>
              <span className={styles.toggleLabel}>{isPublic ? '공개' : '비공개'}</span>
            </div>
            <div className={styles.createActions}>
              <button className={styles.cancelBtn} onClick={() => { setShowCreateForm(false); setNewTitle(''); }}>취소</button>
              <button className={styles.confirmBtn} onClick={handleCreate} disabled={!newTitle.trim()}>만들기</button>
            </div>
          </div>
        )}

        {/* 방 목록 */}
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
            <div className="room-meta">{room.messageCount || 0} 메시지</div>
          </div>
        ))}

      </div>
    </div>
  );
}
