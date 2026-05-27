'use client';

import { useState } from 'react';
import styles from './WordModal.module.css';

interface WordEntry {
  standard_word: string;
  meaning_ko: string;
  southern_word?: string;
  notes?: string;
  emotion_score?: number;
  conflict_weight?: number;
}

interface WordData {
  sentence: string;
  translated: string;
  words: WordEntry[];
  total: number;
  matched: number;
}

interface WordModalProps {
  word: WordData | null;
  onClose: () => void;
  userId?: string;
}

const saveWord = async (payload: {
  user_id?: string;
  word: string;
  meaning_kr?: string;
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
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  if (!word) return null;

  const handleSave = async (entry: WordEntry) => {
    if (saved[entry.standard_word] || saving[entry.standard_word]) return;
    setSaving(prev => ({ ...prev, [entry.standard_word]: true }));
    const ok = await saveWord({
      user_id: userId,
      word: entry.standard_word,
      meaning_kr: entry.meaning_ko,
    });
    setSaving(prev => ({ ...prev, [entry.standard_word]: false }));
    if (ok) setSaved(prev => ({ ...prev, [entry.standard_word]: true }));
  };

  const overlayClass = 'modal-overlay open ' + styles.overlay;

  return (
    <div className={overlayClass} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>

        <h2 className={styles.title}>단어장</h2>

        <div className={styles.sentenceBox}>
          <p className={styles.sentenceOriginal}>{word.sentence}</p>
          {word.translated && word.translated !== word.sentence && (
            <p className={styles.sentenceTranslated}>{word.translated}</p>
          )}
        </div>

        {word.words.length === 0 ? (
          <div className={styles.emptyWords}>
            <p>등록된 단어가 없습니다</p>
            <p className={styles.emptyWordsSub}>{word.total}개 단어 중 0개 매칭</p>
          </div>
        ) : (
          <div className={styles.wordList}>
            <p className={styles.matchInfo}>{word.total}개 단어 중 {word.matched}개 매칭</p>
            {word.words.map((entry) => (
              <div key={entry.standard_word} className={styles.wordCard}>
                <div className={styles.wordCardMain}>
                  <span className={styles.wordCardVn}>{entry.standard_word}</span>
                  <span className={styles.wordCardKo}>{entry.meaning_ko}</span>
                </div>
                {entry.southern_word && entry.southern_word !== entry.standard_word && (
                  <p className={styles.wordCardSouthern}>남부: {entry.southern_word}</p>
                )}
                {entry.notes && (
                  <p className={styles.wordCardNote}>{entry.notes}</p>
                )}
                <button
                  onClick={() => handleSave(entry)}
                  disabled={!!saved[entry.standard_word] || !!saving[entry.standard_word]}
                  className={saved[entry.standard_word] ? styles.savedBtn : styles.wordSaveBtn}
                >
                  {saving[entry.standard_word] ? '저장 중...' : saved[entry.standard_word] ? '저장됨' : '저장'}
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
