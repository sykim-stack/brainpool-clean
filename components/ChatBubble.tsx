'use client';

import { useEffect, useState, useRef } from 'react';
import styles from './ChatBubble.module.css';

interface ChatBubbleProps {
  original: string;
  translated: string;
  sourceLang?: string;
  targetLang?: string;
  emotion?: string;
  riskScore?: number;
  timestamp: string;
  deviceId: string;
  messageId: string;
  isFirstLang: boolean;
  onClick?: () => void;
  onWordClick?: (word: string) => void;
}

export default function ChatBubble({
  original,
  translated,
  sourceLang,
  targetLang,
  emotion,
  riskScore,
  timestamp,
  deviceId,
  messageId,
  isFirstLang,
  onClick,
  onWordClick,
}: ChatBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(translated);
  const inputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 번역 결과 자동 클립보드 복사
  useEffect(() => {
    if (translated && translated !== original) {
      navigator.clipboard.writeText(translated)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
        .catch(() => {});
    }
  }, [translated, original]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSaveEdit = async () => {
    const finalText = editedText.trim();
    if (!finalText || finalText === translated) {
      setIsEditing(false);
      return;
    }
    await fetch('/api/brainpool/learn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ device_id: deviceId, original, translated: finalText }),
    }).catch((e) => console.error('번역 수정 저장 실패:', e));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setEditedText(translated); setIsEditing(false); }
    if (e.key === 'Enter') handleSaveEdit();
  };

  // 베트남어 단어 토큰화 (공백 기준 + 구두점 제거)
  const tokenize = (text: string): string[] => {
    return text.split(/\s+/).map(w => w.replace(/[.,!?;:'"()]/g, '')).filter(Boolean);
  };

  // 단어 클릭 → WordModal
  const handleWordClick = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    if (longPressTimer.current) return; // 길게 누르기 중이면 무시
    if (onWordClick) onWordClick(word);
  };

  // 길게 누르기 → 편집모드 (모바일 대응)
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setIsEditing(true);
      setEditedText(translated);
      longPressTimer.current = null;
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const langLabel = sourceLang && targetLang
    ? `${sourceLang.toUpperCase()} → ${targetLang.toUpperCase()}`
    : '';

  const alignClass = isFirstLang ? styles.wrapperMine : styles.wrapperOther;
  const langLabelClass = sourceLang === 'ko' ? styles.langKo : styles.langVi;

  // 번역 대상 언어가 베트남어일 때만 단어 클릭 활성화
  const isTokenizable = targetLang === 'vi' || sourceLang === 'vi';

  return (
    <div
      className={`${styles.bubble} ${alignClass}`}
      onClick={onClick}
    >
      {/* 언어 방향 + 복사 알림 */}
      <div className={styles.meta}>
        <span className={`${styles.langLabel} ${langLabelClass}`}>{langLabel}</span>
        {copied && <span className={styles.copied}>📋 복사됨</span>}
      </div>

      {/* 번역 결과 */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSaveEdit}
          onClick={(e) => e.stopPropagation()}
          className={`bubble-translated ${styles.editInput}`}
        />
      ) : (
        <div
          className={`bubble-translated ${styles.translated}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          title="단어 클릭: 사전 | 길게 누르기: 번역 수정"
        >
          {isTokenizable ? (
            // 단어 단위로 분리해서 클릭 가능하게
            tokenize(translated).map((word, i) => (
              <span
                key={i}
                className={styles.word}
                onClick={(e) => handleWordClick(e, word)}
              >
                {word}{' '}
              </span>
            ))
          ) : (
            translated
          )}
        </div>
      )}

      {/* 원문 */}
      <div className={`bubble-original ${styles.original}`}>{original}</div>

      {/* 메타 정보 */}
      <div className={`bubble-meta ${styles.metaRow}`}>
        {emotion && (
          <span className={`bubble-emotion emotion-${emotion}`}>{emotion}</span>
        )}
        {riskScore !== undefined && riskScore > 0.3 && (
          <span className={`bubble-risk ${riskScore >= 0.7 ? 'risk-high' : 'risk-mid'}`}>
            ⚠{Math.round(riskScore * 100)}
          </span>
        )}
        <span>
          {new Date(timestamp).toLocaleTimeString('ko-KR', {
            hour: '2-digit', minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}