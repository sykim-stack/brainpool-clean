'use client';

import { useState, useRef } from 'react';
import styles from './WordModal.module.css';

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

const uploadVoice = async (blob: Blob, mimeType: string, userId: string) => {
  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
  const fileName = `voice/${userId}/${Date.now()}.${ext}`;
  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('fileName', fileName);
  formData.append('mimeType', mimeType);
  const res = await fetch('/api/voice/upload', { method: 'POST', body: formData }).catch(() => null);
  const json = res ? await res.json().catch(() => null) : null;
  return json?.url || null;
};

export default function WordModal({ data, onClose, userId }: WordModalProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  if (!data) return null;

  const word = data.sentence;
  const meaning = data.translated;
  const emotion = data.emotion;
  const riskScore = data.riskScore;
  const culturalNote = data.culturalNote;
  const sourceLang = data.sourceLang;

  // 발음 녹음 대상: ko→vi면 베트남어 발음(아내), vi→ko면 한국어 발음(남편)
  const pronunciationTarget = sourceLang === 'ko'
    ? '🇻🇳 베트남어 발음을 알려주세요'
    : '🇰🇷 한국어 발음을 알려주세요';

  const usage = sourceLang === 'ko'
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

  const startRecording = async () => {
    try {
      audioChunks.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        setIsUploading(true);
        try {
          const mType = recorder.mimeType || mimeType;
          const blob = new Blob(audioChunks.current, { type: mType });
          if (blob.size > 1000) {
            const url = await uploadVoice(blob, mType, userId || 'anon');
            if (url) {
              setAudioUrl(url);
              console.log('[발음저장] URL:', url);
            }
          }
        } finally {
          setIsUploading(false);
          mediaRecorder.current = null;
          audioChunks.current = [];
        }
      };
      recorder.start(100);
      setIsRecording(true);
    } catch (e) {
      console.warn('마이크 실패:', e);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.requestData();
      setTimeout(() => mediaRecorder.current?.stop(), 100);
    }
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

        {/* 발음 녹음 섹션 */}
        <Section title="🎤 친구에게 발음을 알려주세요">
          <p className={styles.culturalNote} style={{ marginBottom: '8px' }}>
            {pronunciationTarget}
          </p>
          {audioUrl ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => {
                const audio = new Audio(audioUrl);
                audio.play().catch(() => {
                  // iOS fallback
                  window.open(audioUrl, '_blank');
                });
              }}
                className={styles.savedBtn}
                style={{ flex: 1 }}
              >
                🔊 발음 듣기
              </button>
              <button
                onClick={() => { setAudioUrl(null); }}
                className={styles.closeBtn}
                style={{ flex: 1, marginTop: 0 }}
              >
                다시 녹음
              </button>
            </div>
          ) : (
            <button
              onPointerDown={startRecording}
              onPointerUp={stopRecording}
              onPointerLeave={stopRecording}
              onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
              disabled={isUploading}
              className={`${styles.saveBtn} ${isRecording ? styles.recordingBtn : ''}`}
              style={{ width: '100%' }}
            >
              {isUploading ? '⏳ 저장 중...' : isRecording ? '🔴 녹음 중... (떼면 완료)' : '🎤 누르고 말하세요'}
            </button>
          )}
        </Section>

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
