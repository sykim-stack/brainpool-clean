const fs = require('fs');

const tsx = `'use client';
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });

        // STT
        setIsUploading(true);
        try {
          const recognition = new (window as any).webkitSpeechRecognition();
          recognition.lang = 'vi-VN';
          recognition.continuous = false;

          // 음성 파일 Supabase Storage 업로드
          const fileName = \`voice/\${userId || 'anon'}/\${Date.now()}.webm\`;
          const formData = new FormData();
          formData.append('file', blob, fileName);
          formData.append('fileName', fileName);

          const uploadRes = await fetch('/api/voice/upload', {
            method: 'POST',
            body: formData,
          }).catch(() => null);

          const uploadJson = uploadRes ? await uploadRes.json().catch(() => null) : null;
          const audioUrl = uploadJson?.url || null;

          // STT로 텍스트 변환
          const audioUrl2 = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl2);

          // Web Speech API로 텍스트 추출
          if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const rec = new SpeechRecognition();
            rec.lang = 'vi-VN';
            rec.onresult = (e: any) => {
              const transcript = e.results[0][0].transcript;
              setText(transcript);
              if (audioUrl && onVoiceSend) {
                onVoiceSend(transcript, audioUrl);
              } else {
                onSend(transcript);
              }
            };
            rec.onerror = () => {
              if (audioUrl) setText('(음성 메시지)');
            };
            rec.start();
            const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
            const stream2 = await navigator.mediaDevices.getUserMedia({ audio: true });
            rec.stop();
          }
        } catch (e) {
          console.warn('STT 실패:', e);
        } finally {
          setIsUploading(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (e) {
      console.warn('마이크 접근 실패:', e);
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
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
        className={\`\${styles.voiceBtn} \${isRecording ? styles.recording : ''}\`}
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
`;

fs.writeFileSync('C:/brainpool-clean/brainpool-clean/components/ChatInput.tsx', tsx, 'utf8');
console.log('완료');
