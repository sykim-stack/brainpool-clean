'use client';

import { useEffect, useState } from 'react';
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
}

interface WordModalProps {
  word: WordDetail | null;
  onClose: () => void;
}

// ?? API 議고쉶 寃곌낵 ?????
interface WordData {
  standard?: string;
  southern?: string;
  mekong?: string;
  hue?: string;
  examples?: string[];
  culturalNote?: string;
  riskScore?: number;
}

// ?? API 議고쉶 ?⑥닔 (throw 湲덉? ??_error ?꾨뱶) ??
const fetchWordData = async (word: string): Promise<WordData & { _error?: string }> => {
  const res = await fetch('/api/corenull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ action: 'get-word-data', word, lang: 'vi' }),
  }).catch(() => null);

  if (!res || !res.ok) return { _error: 'fetch_failed' };

  const text = await res.text().catch(() => null);
  if (!text) return { _error: 'empty_response' };

  const json = JSON.parse(text) as { success?: boolean; payload?: WordData; _error?: string };
  if (!json.success || !json.payload) return { _error: json._error || 'no_payload' };

  return json.payload;
};

export default function WordModal({ word, onClose }: WordModalProps) {
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ?? 紐⑤떖 ?대┫ ???곗씠??議고쉶 ??
  useEffect(() => {
    if (!word) {
      setWordData(null);
      return;
    }

    setIsLoading(true);
    setWordData(null);

    fetchWordData(word.word).then((result) => {
      if (!result._error) {
        setWordData(result);
      }
      setIsLoading(false);
    });
  }, [word?.word]);

  if (!word) return null;

  // ?? props? API 寃곌낵 蹂묓빀 (API ?곗꽑) ??
  const merged: WordDetail = {
    ...word,
    standard:     wordData?.standard     ?? word.standard,
    southern:     wordData?.southern     ?? word.southern,
    mekong:       wordData?.mekong       ?? word.mekong,
    hue:          wordData?.hue          ?? word.hue,
    culturalNote: wordData?.culturalNote ?? word.culturalNote,
    riskScore:    wordData?.riskScore    ?? word.riskScore,
    relatedWords: wordData?.examples     ?? word.relatedWords,
  };

  const riskClass = (score?: number): string => {
    if (!score) return styles.riskNone;
    if (score >= 0.7) return styles.riskHigh;
    if (score >= 0.4) return styles.riskMid;
    return styles.riskLow;
  };

  const LOADING_TEXT = '?뺣낫瑜?媛?몄삤??以?..';
  const EMPTY_TEXT   = '?꾩쭅 ?곗씠?곌? ?놁뒿?덈떎';

  const val = (v?: string) => {
    if (isLoading) return LOADING_TEXT;
    return v || EMPTY_TEXT;
  };

  return (
    <div className={`modal-overlay open ${styles.overlay}`} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>

        <h2 className={styles.title}>?뱰 {word.word}</h2>
        <p className={styles.subtitle}>?⑥뼱 ?숈뒿 移대뱶</p>

        {/* 諛⑹뼵 蹂??*/}
        <Section title="?뿣截?諛⑹뼵 蹂??>
          <Row label="?쒖??? value={val(merged.standard)} />
          <Row label="?⑤?"   value={val(merged.southern)} />
          <Row label="硫붿쉘"   value={val(merged.mekong)}   />
          <Row label="?꾩뿉"   value={val(merged.hue)}      />
        </Section>

        {/* ?산낵 ?곗엫??*/}
        <Section title="?뮕 ?산낵 ?곗엫??>
          <Row label="??     value={val(merged.meaning)} />
          <Row label="?곗엫?? value={val(merged.usage)}   />
        </Section>

        {/* ?꾪뿕 ?먯닔 */}
        {merged.riskScore !== undefined && merged.riskScore > 0 && (
          <Section title="?좑툘 ?꾪뿕 遺꾩꽍">
            <div className={styles.riskRow}>
              <div className={styles.riskTrack}>
                <div
                  className={`${styles.riskBar} ${riskClass(merged.riskScore)}`}
                  style={{ width: `${Math.round(merged.riskScore * 100)}%` }}
                />
              </div>
              <span className={`${styles.riskValue} ${riskClass(merged.riskScore)}`}>
                {Math.round(merged.riskScore * 100)}%
              </span>
            </div>
          </Section>
        )}

        {/* 臾명솕 硫붾え */}
        <Section title="?뵇 臾명솕 硫붾え">
          <p className={styles.culturalNote}>
            {isLoading ? LOADING_TEXT : (merged.culturalNote || EMPTY_TEXT)}
          </p>
        </Section>

        {/* 媛먯젙 */}
        {merged.emotion && (
          <Section title="?렚 媛먯젙">
            <span className={styles.emotionTag}>{merged.emotion}</span>
          </Section>
        )}

        {/* 愿???쒗쁽 / ?덈Ц */}
        <Section title="?뱴 愿???쒗쁽">
          {isLoading ? (
            <p className={styles.culturalNote}>{LOADING_TEXT}</p>
          ) : merged.relatedWords && merged.relatedWords.length > 0 ? (
            <div className={styles.relatedList}>
              {merged.relatedWords.map((w, i) => (
                <span key={i} className={styles.relatedTag}>{w}</span>
              ))}
            </div>
          ) : (
            <p className={styles.culturalNote}>{EMPTY_TEXT}</p>
          )}
        </Section>

        {/* ?リ린 */}
        <button onClick={onClose} className={styles.closeBtn}>?뺤씤</button>
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