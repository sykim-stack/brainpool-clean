'use client';

import styles from './WordPreviewSheet.module.css';

export type WordPreviewSheetProps = {
  open: boolean;
  word: string;
  meaning?: string | null;
  isUnknown?: boolean;
  contextLine?: string;
  loading?: boolean;
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
  onSpeak,
  onDetail,
  onClose,
}: WordPreviewSheetProps) {
  if (!open || !word) return null;

  const meaningLine = loading
    ? '뜻 불러오는 중…'
    : isUnknown
      ? '사전에 없는 단어예요'
      : (meaning || '뜻 정보 없음');

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`단어 미리보기: ${word}`}
      >
        <div className={styles.handle} aria-hidden />

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
            {contextLine}
          </p>
        ) : null}

        <p className={`${styles.meaning} ${isUnknown ? styles.unknown : ''}`}>
          {meaningLine}
        </p>

        <div className={styles.actions}>
          <button type="button" className={styles.detailBtn} onClick={onDetail}>
            자세히 · 학습
          </button>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
