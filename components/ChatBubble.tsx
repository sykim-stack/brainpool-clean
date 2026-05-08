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
}: ChatBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(translated);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // 편집 모드 진입 시 포커스
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // 수정 저장
  const handleSaveEdit = async () => {
    const finalText = editedText.trim();
    if (!finalText || finalText === translated) {
      setIsEditing(false);
      return;
    }

    await fetch('/api/brainpool/learn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        device_id: deviceId,
        original,
        translated: finalText,
      }),
    }).catch((e) => console.error('번역 수정 저장 실패:', e));

    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setEditedText(translated);
      setIsEditing(false);
    }
    if (e.key === 'Enter') handleSaveEdit();
  };

  const langLabel = sourceLang && targetLang
    ? `${sourceLang.toUpperCase()} → ${targetLang.toUpperCase()}`
    : '';

  // 정렬 클래스 — isFirstLang 기반 확정
  const alignClass = isFirstLang ? styles.wrapperMine : styles.wrapperOther;
  const langLabelClass = sourceLang === 'ko' ? styles.langKo : styles.langVi;

  return (
    <div
      className={`${styles.bubble} ${alignClass}`}
      onClick={onClick}
    >
      {/* 언어 방향 + 복사 알림 */}
      <div className={styles.meta}>
        <span className={`${styles.langLabel} ${langLabelClass}`}>
          {langLabel}
        </span>
        {copied && (
          <span className={styles.copied}>📋 복사됨</span>
        )}
      </div>

      {/* 번역 결과 (편집 가능) */}
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
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
            setEditedText(translated);
          }}
          title="터치해서 번역 수정"
        >
          {translated}
        </div>
      )}

      {/* 원문 */}
      <div className={`bubble-original ${styles.original}`}>
        {original}
      </div>

      {/* 메타 정보 */}
      <div className={`bubble-meta ${styles.metaRow}`}>
        {emotion && (
          <span className={`bubble-emotion emotion-${emotion}`}>
            {emotion}
          </span>
        )}
        {riskScore !== undefined && riskScore > 0.3 && (
          <span className={`bubble-risk ${riskScore >= 0.7 ? 'risk-high' : 'risk-mid'}`}>
            ⚠{Math.round(riskScore * 100)}
          </span>
        )}
        <span>
          {new Date(timestamp).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}