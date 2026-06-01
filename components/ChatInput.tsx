'use client';
import { useState, useRef } from 'react';
import styles from './ChatInput.module.css';

interface ChatInputProps {
  onSend: (text: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
  userId?: string;
}

export default function ChatInput({ onSend, onTypingChange, userId }: ChatInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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

  const startRecording = async () => {
    try {
      audioChunks.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        }
      });

      // 오디오 증폭
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 5.0; // 2.5배 증폭
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(gainNode);
      gainNode.connect(dest);
      const amplifiedStream = dest.stream;
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(amplifiedStream, { mimeType });
      mediaRecorder.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
          console.log('[Voice] chunk:', e.data.size, 'total chunks:', audioChunks.current.length);
        }
      };

      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        setIsUploading(true);
        try {
          const mType = recorder.mimeType || mimeType;
          const blob = new Blob(audioChunks.current, { type: mType });
          console.log('[Voice] final blob size:', blob.size, 'type:', mType, 'chunks:', audioChunks.current.length);

          if (blob.size < 1000) {
            console.warn('[Voice] blob too small, skip upload');
            setIsUploading(false);
            return;
          }

          const ext = mType.includes('mp4') ? 'mp4' : mType.includes('ogg') ? 'ogg' : 'webm';
          const fileName = `voice/${userId || 'anon'}/${Date.now()}.${ext}`;

          const formData = new FormData();
          formData.append('file', blob, fileName);
          formData.append('fileName', fileName);
          formData.append('mimeType', mType);

          const res = await fetch('/api/voice/upload', {
            method: 'POST',
            body: formData,
          }).catch(() => null);

          const json = res ? await res.json().catch(() => null) : null;
          console.log('[Voice] upload result:', json);

          if (json?.url) {
            console.log('[Voice] 저장 완료:', json.url);
          }
        } catch (e) {
          console.warn('[Voice] 실패:', e);
        } finally {
          setIsUploading(false);
          mediaRecorder.current = null;
          audioChunks.current = [];
        }
      };

      // 시작하자마자 헤더 chunk 받기
      recorder.start();
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.requestData();
        }
      }, 100);

      setIsRecording(true);
      console.log('[Voice] 시작 mimeType:', mimeType);
    } catch (e) {
      console.warn('마이크 실패:', e);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.requestData();
      setTimeout(() => {
        mediaRecorder.current?.stop();
      }, 100);
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
        className={`${styles.voiceBtn} ${isRecording ? styles.recording : ''}`}
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
