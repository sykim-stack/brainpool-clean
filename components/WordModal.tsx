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

// ── API 조회 결과 타입 ──
interface WordData {
  standard?: string;
  southern?: string;
  mekong?: string;
  hue?: string;
  examples?: string[];
  culturalNote?: string;
  riskScore?: number;
}

// ── API 조회 함수 (throw 금지 → _error 필드) ──
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

  // ── 모달 열릴 때 데이터 조회 ──
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

  // ── props와 API 결과 병합 (API 우선) ──
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

  const LOADING_TEXT = '정보를 가져오는 중...';
  const EMPTY_TEXT   = '아직 데이터가 없습니다';

  const val = (v?: string) => {
    if (isLoading) return LOADING_TEXT;
    return v || EMPTY_TEXT;
  };

  return (
    <div className={`modal-overlay open ${styles.overlay}`} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>

        <h2 className={styles.title}>📖 {word.word}</h2>
        <p className={styles.subtitle}>단어 학습 카드</p>

        {/* 방언 변형 */}
        <Section title="🗣️ 방언 변형">
          <Row label="표준어" value={val(merged.standard)} />
          <Row label="남부"   value={val(merged.southern)} />
          <Row label="메콩"   value={val(merged.mekong)}   />
          <Row label="후에"   value={val(merged.hue)}      />
        </Section>

        {/* 뜻과 쓰임새 */}
        <Section title="💡 뜻과 쓰임새">
          <Row label="뜻"     value={val(merged.meaning)} />
          <Row label="쓰임새" value={val(merged.usage)}   />
        </Section>

        {/* 위험 점수 */}
        {merged.riskScore !== undefined && (
          <Section title="⚠️ 위험 분석">
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

        {/* 문화 메모 */}
        <Section title="🔍 문화 메모">
          <p className={styles.culturalNote}>
            {isLoading ? LOADING_TEXT : (merged.culturalNote || EMPTY_TEXT)}
          </p>
        </Section>

        {/* 감정 */}
        {merged.emotion && (
          <Section title="🎭 감정">
            <span className={styles.emotionTag}>{merged.emotion}</span>
          </Section>
        )}

        {/* 관련 표현 / 예문 */}
        <Section title="📚 관련 표현">
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

        {/* 닫기 */}
        <button onClick={onClose} className={styles.closeBtn}>확인</button>
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