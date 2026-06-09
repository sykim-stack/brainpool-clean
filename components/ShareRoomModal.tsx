'use client';
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

  const isKakao = () => {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('kakaotalk');
  };

  const handleShare = async () => {
    // 카카오 인앱이면 외부 브라우저로 강제 열기
    const shareUrl = 'https://corering.vercel.app?code=' + roomCode;
    const intentUrl = 'intent://' + shareUrl.replace('https://', '') + '#Intent;scheme=https;package=com.android.chrome;end';
    
    if (navigator.share) {
      await navigator.share({
        title: 'CoreRing 채팅방 초대',
        text: `CoreRing에서 대화해요! 방 코드: ${roomCode}`,
        url: intentUrl,
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
