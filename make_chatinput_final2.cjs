const fs = require('fs');

const tsx = `'use client';
import { useState, useRef } from 'react';
import styles from './ChatInput.module.css';

interface ChatInputProps {
  onSend: (text: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
  userId?: string;
  onVoiceSend?: (audioUrl: string) => void;
}

export default function ChatInput({ onSend, onTypingChange, userId, onVoiceSend }: ChatInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    if (onTypingChange) onTypingChange(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (onTypingChange) {
      onTypingChange(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => onTypingChange(false), 1500);
    }
  };

  const cleanup = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    try { recognitionRef.current?.stop(); } catch(e) {}
    recognitionRef.current = null;
    mediaRecorder.current = null;
    audioChunks.current = [];
    transcriptRef.current = '';
  };

  const uploadAudio = async (blob: Blob, mimeType: string) => {
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const fileName = \`voice/\${userId || 'anon'}/\${Date.now()}.\${ext}\`;
    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('fileName', fileName);
    formData.append('mimeType', mimeType);
    const res = await fetch('/api/voice/upload', {
      method: 'POST',
      body: formData,
    }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    return json?.url || null;
  };

  const startRecording = async () => {
    try {
      cleanup();
      transcriptRef.current = '';

      // 마이크 한 번만 열기
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      streamRef.current = stream;

      // 오디오 증폭
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 5.0;
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(gainNode);
      gainNode.connect(dest);

      // 1. MediaRecorder (증폭된 stream으로 녹음)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(dest.stream, { mimeType });
      mediaRecorder.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        const mType = recorder.mimeType || mimeType;
        const blob = new Blob(audioChunks.current, { type: mType });
        console.log('[Voice] blob:', blob.size);
        if (blob.size > 1000) {
          setIsUploading(true);
          try {
            const audioUrl = await uploadAudio(blob, mType);
            console.log('[Voice] URL:', audioUrl);
            if (audioUrl && onVoiceSend) onVoiceSend(audioUrl);
          } finally {
            setIsUploading(false);
          }
        }
        cleanup();
      };

      recorder.start(100);

      // 2. STT (원본 stream으로 - 마이크 추가 열기 없음)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.lang = 'vi-VN';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e: any) => {
          let final = '';
          for (let i = 0; i < e.results.length; i++) {
            if (e.results[i].isFinal) final += e.results[i][0].transcript;
          }
          if (final) {
            transcriptRef.current = final;
            console.log('[STT]', final);
          }
        };
        rec.onerror = (e: any) => console.warn('[STT] 오류:', e.error);
        rec.start();
        recognitionRef.current = rec;
      }

      setIsRecording(true);
    } catch (e) {
      console.warn('마이크 실패:', e);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);

    // STT 결과로 텍스트 전송
    const transcript = transcriptRef.current;
    if (transcript) {
      console.log('[Voice] STT 결과:', transcript);
      onSend(transcript);
    }

    try { recognitionRef.current?.stop(); } catch(e) {}

    // 녹음 종료 (onstop에서 업로드)
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.requestData();
      setTimeout(() => mediaRecorder.current?.stop(), 100);
    }
  };

  return (
    <div className={styles.wrapper}>
      <textarea
        ref={inputRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="메시지를 입력하세요..."
        className={styles.textarea}
        rows={1}
      />
      <button
        onPointerDown={startRecording}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
        onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
        className={\`\${styles.voiceBtn} \${isRecording ? styles.recording : ''}\`}
        disabled={isUploading}
        type="button"
      >
        {isUploading ? '⏳' : isRecording ? '🔴' : '🎤'}
      </button>
      <button
        onClick={handleSend}
        className={styles.button}
        disabled={!text.trim()}
        aria-label="전송"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      </button>
    </div>
  );
}
`;

fs.writeFileSync('C:/brainpool-clean/brainpool-clean/components/ChatInput.tsx', tsx, 'utf8');
console.log('완료');
