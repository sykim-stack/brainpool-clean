'use client';
import { useState, useRef } from 'react';
import styles from './ChatInput.module.css';

interface ChatInputProps {
  onSend: (text: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
  userId?: string;
  onVoiceSend?: (audioUrl: string) => void;
}

export default function ChatInput({ onSend, onTypingChange }: ChatInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const startRecording = async () => {
    try {
      transcriptRef.current = '';
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('이 브라우저는 음성 인식을 지원하지 않습니다.');
        return;
      }
      const rec = new SpeechRecognition();
      rec.lang = 'ko-KR';
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        let final = '';
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript;
        }
        if (final) transcriptRef.current = final;
      };
      rec.onerror = (e: any) => console.warn('[STT] 오류:', e.error);
      rec.start();
      recognitionRef.current = rec;
      setIsRecording(true);
    } catch (e) {
      console.warn('음성 인식 실패:', e);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    try { recognitionRef.current?.stop(); } catch(e) {}
    setTimeout(() => {
      if (transcriptRef.current) {
        onSend(transcriptRef.current);
        transcriptRef.current = '';
      }
    }, 500);
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
        onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); startRecording(); }}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); stopRecording(); }}
        onContextMenu={(e) => e.preventDefault()}
        className={`${styles.voiceBtn} ${isRecording ? styles.recording : ''}`}
        type="button"
      >
        {isRecording ? '🔴' : '🎤'}
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

