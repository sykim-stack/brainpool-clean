'use client';

import { useState } from 'react';
import styles from './WordModal.module.css';

interface WordDetail {
  word: string;
  meaning_kr?: string;
  usage?: string;
  emotion?: string;
  riskScore?: number;
  culturalNote?: string;
  relatedWords?: string[];
  sessionId?: string;
}

interface WordModalProps {
  data: {
    sentence: string;
    translated?: string;
    sourceLang?: string;
    emotion?: string;
    riskScore?: number;
    culturalNote?: string;
    sessionId?: string;
    wordDetail?: any;
  } | null;
  onClose: () => void;
  userId?: string;
}

const saveWord = async (payload: { user_id?: string; word: string; meaning_kr?: string; source_session_id?: string }) => {
  const res = await fetch('/api/phrase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ action: 'save-word', ...payload }),
  }).catch(() => null);
  if (!res || !res.ok) return false;
  const json = await res.json().catch(() => null);
  return json?.success === true;
};

export default function WordModal({ data, onClose, userId }: WordModalProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!data) return null;

  const word = data.sentence;
  const meaning = data.translated;
  const emotion = data.emotion;
  const riskScore = data.riskScore;
  const culturalNote = data.culturalNote;
  const usage = data.sourceLang === 'ko'
    ? '한국어에서 베트남어로 번역된 표현입니다.'
    : '베트남어에서 한국어로 번역된 표현입니다.';

  const handleSave = async () => {
    if (isSaved || isSaving) return;
    setIsSaving(true);
    const ok = await saveWord({
      user_id: userId,
      word,
      meaning_kr: meaning,
      source_session_id: data.sessionId,
    });
    setIsSaving(false);
    if (ok) setIsSaved(true);
  };

  const riskClass = (score?: number) => {
    if (!score) return styles.riskNone;
    if (score >= 0.7) return styles.riskHigh;
    if (score >= 0.4) return styles.riskMid;
    return styles.riskLow;
  };

  return (
    <div className={`modal-overlay open ${styles.overlay}`} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>

        <h2 className={styles.title}>📖 {word}</h2>
        <p className={styles.subtitle}>단어 학습 카드</p>

        <Section title="💡 뜻과 쓰임새">
          <Row label="뜻"     value={meaning || '아직 데이터가 없습니다'} />
          <Row label="쓰임새" value={usage} />
        </Section>

        {riskScore !== undefined && riskScore > 0 && (
          <Section title="⚠ 위험 분석">
            <div className={styles.riskRow}>
              <div className={styles.riskTrack}>
                <div
                  className={`${styles.riskBar} ${riskClass(riskScore)}`}
                  style={{ width: `${Math.round(riskScore * 100)}%` }}
                />
              </div>
              <span className={`${styles.riskValue} ${riskClass(riskScore)}`}>
                {Math.round(riskScore * 100)}%
              </span>
            </div>
          </Section>
        )}

        {culturalNote && (
          <Section title="🔍 문화 메모">
            <p className={styles.culturalNote}>{culturalNote}</p>
          </Section>
        )}

        {emotion && (
          <Section title="🎭 감정">
            <span className={styles.emotionTag}>{emotion}</span>
          </Section>
        )}

        {meaning && (
          <Section title="🔗 관련 표현">
            <div className={styles.relatedList}>
              <span className={styles.relatedTag}>{meaning}</span>
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

