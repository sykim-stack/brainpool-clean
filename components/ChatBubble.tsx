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
  audioUrl?: string;
  onWordClick?: (word: string) => void;
}

// ── KO search-key normalize (surface is never mutated for display) ──
const KO_CONTRACTIONS: Record<string, string> = {
  난: '나',
  넌: '너',
  전: '저',
  뭘: '무엇',
};

const KO_PARTICLES = [
  '에서', '에게', '한테', '으로', '부터', '까지', '처럼', '보다',
  '은', '는', '이', '가', '을', '를', '의', '에', '로', '와', '과',
  '도', '만', '께',
].sort((a, b) => b.length - a.length);

const KO_PARTICLE_SET = new Set(KO_PARTICLES);

/** Surface token → dictionary / vocabulary lookup key (conservative). */
function toSearchKey(surface: string): string {
  if (!surface || typeof surface !== 'string') return surface;
  const s = surface.trim();
  if (!s) return s;

  if (Object.prototype.hasOwnProperty.call(KO_CONTRACTIONS, s)) {
    return KO_CONTRACTIONS[s];
  }

  // multi-role short form: never rewrite
  if (s === '네') return s;

  // entire token is a particle → leave as-is (click filter excludes it)
  if (KO_PARTICLE_SET.has(s)) return s;

  if (!/[가-힣]/.test(s)) return s;

  // particle peel once, longest match; 1-syllable stems allowed
  for (const p of KO_PARTICLES) {
    if (s.endsWith(p) && s.length - p.length >= 1) {
      return s.slice(0, -p.length);
    }
  }

  return s;
}

/** Pure particles are not worth clicking as lookup targets. */
function isClickableSurface(surface: string): boolean {
  if (!surface || surface.length === 0) return false;
  if (KO_PARTICLE_SET.has(surface)) return false;
  return true;
}

/** Whitespace + punctuation strip only — surface preserved. */
function splitSurface(text: string): string[] {
  return text
    .split(/\s+/)
    .map(w => w.replace(/[.,!?;:'"()\-]/g, ''))
    .filter(Boolean);
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
  audioUrl,
}: ChatBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showWordBreakdown, setShowWordBreakdown] = useState(false);
  const [editedText, setEditedText] = useState(translated);
  const inputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const isKoTarget = targetLang === 'ko';

  // surface tokens for display (both KO and VI)
  const surfaceWords = isTokenizableLang(sourceLang, targetLang)
    ? splitSurface(translated)
    : [];

  const handleWordClick = (e: React.MouseEvent, surface: string) => {
    e.stopPropagation();
    if (longPressTimer.current) return;
    if (!onWordClick) return;
    if (!isClickableSurface(surface)) return;
    // KO: pass search key only; VI: surface is the key
    const key = isKoTarget ? toSearchKey(surface) : surface;
    onWordClick(key);
  };

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
  const isTokenizable = isTokenizableLang(sourceLang, targetLang);

  return (
    <div className={`${styles.bubble} ${alignClass}`} onClick={onClick}>
      <div className={styles.meta}>
        <span className={`${styles.langLabel} ${langLabelClass}`}>{langLabel}</span>
        {copied && <span className={styles.copied}>📋 복사됨</span>}
      </div>

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
            surfaceWords.map((surface, i) => (
              <span
                key={i}
                className={styles.word}
                onClick={(e) => handleWordClick(e, surface)}
              >
                {surface}{' '}
              </span>
            ))
          ) : (
            translated
          )}
        </div>
      )}

      {isTokenizable && surfaceWords.length > 1 && !isEditing && (
        <div className={styles.wordBreakdown} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={styles.wordBreakdownToggle}
            onClick={() => setShowWordBreakdown(prev => !prev)}
            aria-expanded={showWordBreakdown}
          >
            🔎 단어별 보기 {showWordBreakdown ? '▲' : '▼'}
          </button>
          {showWordBreakdown && (
            <div className={styles.wordBreakdownList}>
              {surfaceWords.map((surface, i) => (
                <button
                  key={`${surface}-${i}`}
                  type="button"
                  className={styles.wordBreakdownWord}
                  onClick={() => {
                    if (!isClickableSurface(surface)) return;
                    const key = isKoTarget ? toSearchKey(surface) : surface;
                    onWordClick?.(key);
                  }}
                >
                  {surface}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={`bubble-original ${styles.original}`}>{original}</div>

      <div className={`bubble-meta ${styles.metaRow}`}>
        {emotion && <span className={`bubble-emotion emotion-${emotion}`}>{emotion}</span>}
        {riskScore !== undefined && riskScore > 0.3 && (
          <span className={`bubble-risk ${riskScore >= 0.7 ? 'risk-high' : 'risk-mid'}`}>
            ⚠{Math.round(riskScore * 100)}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (audioUrl) {
              const audio = document.createElement('audio');
              audio.src = audioUrl;
              audio.controls = false;
              (audio as any).playsInline = true;
              document.body.appendChild(audio);
              audio.play().catch(() => { window.open(audioUrl, '_blank'); });
              audio.onended = () => document.body.removeChild(audio);
            } else if (typeof window !== 'undefined' && window.speechSynthesis) {
              const utterance = new SpeechSynthesisUtterance(translated);
              utterance.lang = targetLang === 'vi' ? 'vi-VN' : 'ko-KR';
              utterance.rate = 0.9;
              window.speechSynthesis.cancel();
              window.speechSynthesis.speak(utterance);
            }
          }}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "0 4px", opacity: audioUrl ? 1 : 0.5 }}
          title={audioUrl ? '원어민 발음' : '기계음 발음 (TTS)'}
        >🔊</button>
        <span>{new Date(timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}

function isTokenizableLang(sourceLang?: string, targetLang?: string): boolean {
  return (
    targetLang === 'vi' ||
    targetLang === 'ko' ||
    sourceLang === 'vi' ||
    sourceLang === 'ko'
  );
}
