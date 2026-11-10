'use client';
import { useState } from 'react';
import styles from './ShareRoomModal.module.css';

interface ShareRoomModalProps {
  roomId: string;
  roomCode: string;
  onClose: () => void;
}

export default function ShareRoomModal({ roomId, roomCode, onClose }: ShareRoomModalProps) {
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const isKakao = () =>
    typeof navigator !== 'undefined' && /KAKAOTALK/i.test(navigator.userAgent);

  const getShareUrl = () => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/rooms/${roomId}`;
    }
    return `https://brainpool-clean-seven.vercel.app/rooms/${roomId}`;
  };

  const handleShare = async () => {
    const shareUrl = getShareUrl();
    const shareText = `CoreRing 채팅방에 초대합니다!\n방 코드: ${roomCode}\n${shareUrl}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator
        .share({
          title: 'CoreRing 채팅방 초대',
          text: shareText,
          url: shareUrl,
        })
        .catch(() => null);
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText).catch(() => null);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCodeCopy = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(roomCode).catch(() => null);
    }
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.emoji}>🎉</p>
        <h2 className={styles.title}>방이 만들어졌어요!</h2>
        <p className={styles.subtitle}>친구에게 공유해보세요</p>

        <div className={styles.codeBox}>
          <span className={styles.code}>{roomCode}</span>
        </div>

        <div className={styles.btnGroup}>
          <button type="button" className={styles.shareBtn} onClick={() => void handleShare()}>
            {copied ? '✅ 복사됨' : '📤 공유하기'}
          </button>
          <button type="button" className={styles.copyBtn} onClick={() => void handleCodeCopy()}>
            {codeCopied ? '✅ 복사됨' : '📋 코드 복사'}
          </button>
        </div>

        {isKakao() && (
          <p className={styles.kakaoNotice}>
            카카오톡 인앱 브라우저에서는 채팅·음성·알림이 제한될 수 있어요.
            <br />
            우측 상단 <strong>⋮</strong> → <strong>다른 브라우저로 열기</strong> (Chrome/Safari)를
            권장합니다.
          </p>
        )}

        <button type="button" className={styles.closeBtn} onClick={onClose}>
          나중에 할게요
        </button>
      </div>
    </div>
  );
}
