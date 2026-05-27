'use client';

import { useState, useEffect } from 'react';
import styles from './WordModal.module.css';

interface WordEntry {
  standard_word?: string;
  word?: string;
  meaning_ko?: string;
  meaning?: string;
  southern_word?: string;
  southern?: string;
  hue?: string;
  mekong?: string;
  notes?: string;
  culturalNote?: string;
  emotion_score?: number;
  conflict_weight?: number;
  riskScore?: number;
  emotion?: string;
}

interface TranslationCardProps {
  sentence: string;
  translated?: string;
  sourceLang?: string;
  emotion?: string;
  riskScore?: number;
  culturalNote?: string;
  sessionId?: string;
  wordDetail?: WordEntry;
}

interface WordModalProps {
  data: TranslationCardProps | null;
  onClose: () => void;
  userId?: string;
}

const EMOTION_LABEL: Record<string, string> = {
  positive: '긍정', negative: '부정', neutral: '중립',
  happy: '기쁨', sad: '슬픔', angry: '화남', fear: '불안',
};

const saveWordToDB = async (payload: { user_id?: string; word: string; meaning_kr?: string }) => {
  const res = await fetch('/api/corenull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ action: 'save-word', ...payload }),
  }).catch(() => null);
  if (!res) return false;
  const json = await res.json().catch(() => null);
  return json?.success === true;
};

export default function WordModal({ data, onClose, userId }: WordModalProps) {
  const [relatedWords, setRelatedWords] = useState<WordEntry[]>([]);
  const [wordLoading, setWordLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const isWordMode = !!data?.wordDetail;
  const wordDetail = data?.wordDetail;

  useEffect(() => {
    if (!data?.sentence || isWordMode) return;
    setRelatedWords([]);
    setWordLoading(true);
    fetch('/api/corenull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ action: 'getWordsFromSentence', sentence: data.sentence }),
    })
      .then(r => r.json())
      .then(json => { if (json?.success) setRelatedWords(json.payload?.words || []); })
      .catch(() => {})
      .finally(() => setWordLoading(false));
  }, [data?.sentence, isWordMode]);

  if (!data) return null;

  const emotionLabel = data.emotion ? (EMOTION_LABEL[data.emotion] || data.emotion) : null;
  const riskLevel = !data.riskScore ? null
    : data.riskScore >= 0.7 ? '높음'
    : data.riskScore >= 0.4 ? '보통'
    : null;

  const handleSave = async () => {
    if (saved || saving) return;
    const word = wordDetail?.standard_word || wordDetail?.word || data.sentence;
    const meaning = wordDetail?.meaning_ko || wordDetail?.meaning || data.translated;
    setSaving(true);
    const ok = await saveWordToDB({ user_id: userId, word, meaning_kr: meaning });
    setSaving(false);
    if (ok) setSaved(true);
  };

  const overlayClass = 'modal-overlay open ' + styles.overlay;

  return (
    <div className={overlayClass} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>

        {isWordMode && wordDetail ? (
          <>
            <div className={styles.mainCard}>
              <p className={styles.translated}>
                {wordDetail.standard_word || wordDetail.word}
              </p>
              <p className={styles.original}>
                {wordDetail.meaning_ko || wordDetail.meaning}
              </p>
            </div>

            {(wordDetail.southern_word || wordDetail.southern) && (
              <div className={styles.dialectRow}>
                {(wordDetail.southern_word || wordDetail.southern) && (
                  <span className={styles.dialectTag}>남부: {wordDetail.southern_word || wordDetail.southern}</span>
                )}
                {wordDetail.hue && (
                  <span className={styles.dialectTag}>후에: {wordDetail.hue}</span>
                )}
                {wordDetail.mekong && (
                  <span className={styles.dialectTag}>메콩: {wordDetail.mekong}</span>
                )}
              </div>
            )}

            {(wordDetail.notes || wordDetail.culturalNote) && (
              <p className={styles.culturalNote}>{wordDetail.notes || wordDetail.culturalNote}</p>
            )}

            {(emotionLabel || riskLevel) && (
              <div className={styles.metaRow}>
                {emotionLabel && <span className={styles.metaTag}>{emotionLabel}</span>}
                {riskLevel && <span className={styles.metaTagRisk}>{riskLevel} 위험도</span>}
              </div>
            )}
          </>
        ) : (
          <>
            <div className={styles.mainCard}>
              {data.translated && data.translated !== data.sentence && (
                <p className={styles.translated}>{data.translated}</p>
              )}
              <p className={styles.original}>{data.sentence}</p>
            </div>

            {(emotionLabel || riskLevel) && (
              <div className={styles.metaRow}>
                {emotionLabel && <span className={styles.metaTag}>{emotionLabel}</span>}
                {riskLevel && <span className={styles.metaTagRisk}>{riskLevel} 위험도</span>}
              </div>
            )}

            {wordLoading && (
              <p className={styles.wordLoadingText}>단어 분석 중...</p>
            )}

            {!wordLoading && relatedWords.length > 0 && (
              <div className={styles.wordSection}>
                <p className={styles.wordSectionTitle}>관련 단어</p>
                {relatedWords.map((entry) => (
                  <div key={entry.standard_word} className={styles.wordRow}>
                    <span className={styles.wordVn}>{entry.standard_word}</span>
                    <span className={styles.wordKo}>{entry.meaning_ko}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className={styles.btnRow}>
          <button
            onClick={handleSave}
            disabled={saved || saving}
            className={saved ? styles.savedBtn : styles.saveBtn}
          >
            {saving ? '저장 중...' : saved ? '저장됨' : '단어장에 저장'}
          </button>
          <button onClick={onClose} className={styles.closeBtn}>확인</button>
        </div>

      </div>
    </div>
  );
}
