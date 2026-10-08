'use client';

import { useEffect, useRef } from 'react';
import styles from './WordPreviewSheet.module.css';

export type WordPreviewAnchor = {
  x: number;
  y: number;
};

export type WordPreviewSheetProps = {
  open: boolean;
  word: string;
  meaning?: string | null;
  isUnknown?: boolean;
  contextLine?: string;
  loading?: boolean;
  anchor?: WordPreviewAnchor;
  onSpeak: () => void;
  onDetail: () => void;
  onClose: () => void;
};

export default function WordPreviewSheet({
  open,
  word,
  meaning,
  isUnknown,
  contextLine,
  loading,
  anchor = { x: 0, y: 0 },
  onSpeak,
  onDetail,
  onClose,
}: WordPreviewSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(event.target as Node)) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open, onClose]);

  if (!open || !word) return null;

  const meaningLine = loading
    ? '뜻 불러오는 중…'
    : isUnknown
      ? '아직 뜻을 찾지 못했어요'
      : (meaning || '뜻 정보 없음');

  const cardWidth = 360;
  const horizontalMargin = 12;
  const left = typeof window === 'undefined'
    ? horizontalMargin
    : Math.min(
        Math.max(anchor.x - cardWidth / 2, horizontalMargin),
        Math.max(horizontalMargin, window.innerWidth - cardWidth - horizontalMargin),
      );
  const top = typeof window === 'undefined'
    ? horizontalMargin
    : Math.min(anchor.y + 8, Math.max(horizontalMargin, window.innerHeight - 250));

  return (
    <div
      className={styles.layer}
      aria-live="polite"
      style={{ '--preview-left': `${left}px`, '--preview-top': `${top}px` } as React.CSSProperties}
    >
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-label={`단어 미리보기: ${word}`}
      >
        <div className={styles.pointer} aria-hidden />
        <div className={styles.header}>
          <h2 className={styles.word}>{word}</h2>
          <button
            type="button"
            className={styles.speakBtn}
            onClick={onSpeak}
            title="발음 듣기"
            aria-label="발음 듣기"
          >
            🔊
          </button>
        </div>

        {contextLine ? (
          <p className={styles.context} title={contextLine}>
            이 문장에서: {contextLine}
          </p>
        ) : null}

        <p className={`${styles.meaning} ${isUnknown ? styles.unknown : ''}`}>
          {meaningLine}
        </p>

        <div className={styles.actions}>
          <button type="button" className={styles.detailBtn} onClick={onDetail}>
            상세 보기
          </button>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
