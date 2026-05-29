'use client';
import { useState, useRef } from 'react';
import styles from './ChatInput.module.css';

interface ChatInputProps {
  onSend: (text: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
  onVoiceSend?: (text: string, audioUrl: string) => void;
  userId?: string;
}

export default function ChatInput({ onSend, onTypingChange, onVoiceSend, userId }: ChatInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
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
      transcriptRef.current = '';
      audioChunks.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = recorder;

      // onstop 먼저 등록
      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        setIsUploading(true);
        try {
          const mType = mediaRecorder.current?.mimeType || 'audio/webm';
          const blob = new Blob(audioChunks.current, { type: mType });
          console.log('[Voice] blob size:', blob.size, 'chunks:', audioChunks.current.length);

          const fileName = `voice/${userId || 'anon'}/${Date.now()}.webm`;
          const formData = new FormData();
          formData.append('file', blob, fileName);
          formData.append('fileName', fileName);

          const uploadRes = await fetch('/api/voice/upload', {
            method: 'POST',
            body: formData,
          }).catch(() => null);

          const uploadJson = uploadRes ? await uploadRes.json().catch(() => null) : null;
          const audioUrl = uploadJson?.url || null;
          const transcript = transcriptRef.current;

          console.log('[Voice] STT:', transcript, 'URL:', audioUrl);

          if (transcript) {
            if (audioUrl && onVoiceSend) {
              onVoiceSend(transcript, audioUrl);
            } else {
              onSend(transcript);
            }
          } else if (audioUrl) {
            console.warn('[Voice] STT 없음, 음성만 저장됨:', audioUrl);
          }
        } catch (e) {
          console.warn('[Voice] 처리 실패:', e);
        } finally {
          setIsUploading(false);
        }
      };

      // ondataavailable 등록
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
          console.log('[Voice] chunk:', e.data.size);
        }
      };

      // 100ms마다 데이터 수집
      recorder.start(100);

      // STT 동시 시작
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
      console.warn('마이크 접근 실패:', e);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    try { recognitionRef.current?.stop(); } catch (e) {}
    mediaRecorder.current?.stop();
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
        aria-label="음성 녹음"
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
