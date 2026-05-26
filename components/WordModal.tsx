'use client';

import { useState } from 'react';
import styles from './WordModal.module.css';

interface WordDetail {
  word: string;
  standard?: string;
  southern?: string;
  mekong?: string;
  hue?: string;
  meaning?: string;
  usage?: string;
  emotion?: string;
  riskScore?: number;
  culturalNote?: string;
  relatedWords?: string[];
  transId?: string;
  sessionId?: string;
}

interface WordModalProps {
  word: WordDetail | null;
  onClose: () => void;
  userId?: string;
}

const saveWord = async (payload: {
  user_id?: string;
  trans_id?: string;
  word: string;
  meaning_kr?: string;
  source_session_id?: string;
}) => {
  const res = await fetch('/api/corenull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ action: 'save-word', ...payload }),
  }).catch(() => null);
  if (!res || !res.ok) return false;
  const json = await res.json().catch(() => null);
  return json?.success === true;
};

export default function WordModal({ word, onClose, userId }: WordModalProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!word) return null;

  const handleSave = async () => {
    if (isSaved || isSaving) return;
    setIsSaving(true);
    const ok = await saveWord({
      user_id: userId,
      trans_id: word.transId,
      word: word.word,
      meaning_kr: word.meaning,
      source_session_id: word.sessionId,
    });
    setIsSaving(false);
    if (ok) setIsSaved(true);
  };

  const riskClass = (score?: number): string => {
    if (!score) return styles.riskNone;
    if (score >= 0.7) return styles.riskHigh;
    if (score >= 0.4) return styles.riskMid;
    return styles.riskLow;
  };

  const EMPTY_TEXT = '아직 데이터가 없습니다';
  const val = (v?: string) => v || EMPTY_TEXT;

  return (
    <div className={`modal-overlay open ${styles.overlay}`} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>

        <h2 className={styles.title}>📖 {word.word}</h2>
        <p className={styles.subtitle}>단어 학습 카드</p>

        <Section title="🗣 방언 변형">
          <Row label="표준어" value={val(word.standard)} />
          <Row label="남부"   value={val(word.southern)} />
          <Row label="메콩"   value={val(word.mekong)}   />
          <Row label="후에"   value={val(word.hue)}      />
        </Section>

        <Section title="💡 뜻과 쓰임새">
          <Row label="뜻"     value={val(word.meaning)} />
          <Row label="쓰임새" value={val(word.usage)}   />
        </Section>

        {word.riskScore !== undefined && word.riskScore > 0 && (
          <Section title="⚠ 위험 분석">
            <div className={styles.riskRow}>
              <div className={styles.riskTrack}>
                <div
                  className={`${styles.riskBar} ${riskClass(word.riskScore)}`}
                  style={{ width: `${Math.round(word.riskScore * 100)}%` }}
                />
              </div>
              <span className={`${styles.riskValue} ${riskClass(word.riskScore)}`}>
                {Math.round(word.riskScore * 100)}%
              </span>
            </div>
          </Section>
        )}

        {word.culturalNote && (
          <Section title="🔍 문화 메모">
            <p className={styles.culturalNote}>{word.culturalNote}</p>
          </Section>
        )}

        {word.emotion && (
          <Section title="🎭 감정">
            <span className={styles.emotionTag}>{word.emotion}</span>
          </Section>
        )}

        {word.relatedWords && word.relatedWords.length > 0 && (
          <Section title="🔗 관련 표현">
            <div className={styles.relatedList}>
              {word.relatedWords.map((w, i) => (
                <span key={i} className={styles.relatedTag}>{w}</span>
              ))}
            </div>
          </Section>
        )}

        <div className={styles.btnRow}>
          <button
            onClick={handleSave}
            disabled={isSaved || isSaving}
            className={`${styles.saveBtn} ${isSaved ? styles.savedBtn : ''}`}
          >
            {isSaving ? '저장 중...' : isSaved ? '✅ 저장됨' : '🔖 단어장에 저장'}
          </button>
          <button onClick={onClose} className={styles.closeBtn}>확인</button>
        </div>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>{title}</h4>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  );
}
