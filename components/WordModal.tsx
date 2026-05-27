'use client';

import { useState, useEffect } from 'react';
import styles from './WordModal.module.css';

interface WordEntry {
  standard_word: string;
  meaning_ko: string;
  southern_word?: string;
  notes?: string;
}

interface TranslationCardProps {
  sentence: string;
  translated?: string;
  sourceLang?: string;
  emotion?: string;
  riskScore?: number;
  sessionId?: string;
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

export default function WordModal({ data, onClose, userId }: WordModalProps) {
  const [words, setWords] = useState<WordEntry[]>([]);
  const [wordLoading, setWordLoading] = useState(false);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!data?.sentence) return;
    setWords([]);
    setWordLoading(true);
    fetch('/api/corenull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ action: 'getWordsFromSentence', sentence: data.sentence }),
    })
      .then(r => r.json())
      .then(json => { if (json?.success) setWords(json.payload?.words || []); })
      .catch(() => {})
      .finally(() => setWordLoading(false));
  }, [data?.sentence]);

  if (!data) return null;

  const emotionLabel = data.emotion ? (EMOTION_LABEL[data.emotion] || data.emotion) : null;
  const riskLevel = !data.riskScore ? null : data.riskScore >= 0.7 ? '높음' : data.riskScore >= 0.4 ? '보통' : null;

  const handleSave = async (entry: WordEntry) => {
    if (saved[entry.standard_word]) return;
    const res = await fetch('/api/corenull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ action: 'save-word', user_id: userId, word: entry.standard_word, meaning_kr: entry.meaning_ko }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    if (json?.success) setSaved(prev => ({ ...prev, [entry.standard_word]: true }));
  };

  const overlayClass = 'modal-overlay open ' + styles.overlay;

  return (
    <div className={overlayClass} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>

        <div className={styles.mainCard}>
          <p className={styles.original}>{data.sentence}</p>
          {data.translated && data.translated !== data.sentence && (
            <p className={styles.translated}>{data.translated}</p>
          )}
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

        {!wordLoading && words.length > 0 && (
          <div className={styles.wordSection}>
            <p className={styles.wordSectionTitle}>관련 단어</p>
            {words.map((entry) => (
              <div key={entry.standard_word} className={styles.wordRow}>
                <span className={styles.wordVn}>{entry.standard_word}</span>
                <span className={styles.wordKo}>{entry.meaning_ko}</span>
                <button
                  onClick={() => handleSave(entry)}
                  disabled={!!saved[entry.standard_word]}
                  className={saved[entry.standard_word] ? styles.savedBtn : styles.wordSaveBtn}
                >
                  {saved[entry.standard_word] ? '저장됨' : '저장'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.btnRow}>
          <button onClick={onClose} className={styles.closeBtn}>확인</button>
        </div>

      </div>
    </div>
  );
}
