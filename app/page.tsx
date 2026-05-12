'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import BrainHeader from '@/components/BrainHeader';
import ChatBubble from '@/components/ChatBubble';
import ChatInput from '@/components/ChatInput';
import RoomList from '@/components/RoomList';
import RoomBar from '@/components/RoomBar';
import WordModal from '@/components/WordModal';
import styles from './page.module.css';

interface Message {
  messageId: string;
  original: string;
  translated: string;
  translations?: { ko?: string; vi?: string; en?: string };
  sourceLang?: string;
  targetLang?: string;
  emotion?: string;
  riskScore?: number;
  culturalNote?: string;
  timestamp: string;
  userId?: string;
}

interface Room {
  roomId: string;
  title: string;
  inviteCode?: string;
  messageCount?: number;
}

interface DailyWord {
  word: string;
  meaning?: string;
  usage?: string;
  culturalNote?: string;
}

const getDeviceId = () => {
  if (typeof window === 'undefined') return 'anonymous';
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = `device_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem('deviceId', id);
  }
  return id;
};

const fetchDailyWord = async (): Promise<DailyWord & { _error?: string }> => {
  const res = await fetch('/api/corenull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ action: 'get-word-data', word: '오늘', lang: 'vi' }),
  }).catch(() => null);

  if (!res || !res.ok) return { word: '', _error: 'fetch_failed' };

  const text = await res.text().catch(() => null);
  if (!text) return { word: '', _error: 'empty' };

  const json = JSON.parse(text) as { success?: boolean; payload?: DailyWord };
  if (!json.success || !json.payload?.word) return { word: '', _error: 'no_payload' };

  return json.payload;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentRoomCode, setCurrentRoomCode] = useState('------');
  const [isRoomMode, setIsRoomMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [nickname, setNickname] = useState('익명');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceId] = useState(getDeviceId());
  const chatRef = useRef<HTMLDivElement>(null);
  const [firstLanguage, setFirstLanguage] = useState<string | null>(null);
  const [dailyWord, setDailyWord] = useState<DailyWord>({
    word: 'xin chào',
    meaning: '안녕하세요',
    usage: '처음 만나는 사람에게 쓰는 베트남어 인사',
    culturalNote: '남부에서는 "chào" 만으로도 자연스럽습니다',
  });
  const [showDaily, setShowDaily] = useState(true);

  // 자동 스크롤
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // 오늘의 단어 조회
  useEffect(() => {
    fetchDailyWord().then((result) => {
      if (!result._error && result.word) {
        setDailyWord(result);
      }
    });
  }, []);

  // 메시지 도착 시 오늘의 단어 숨김
  useEffect(() => {
    if (messages.length > 0) setShowDaily(false);
  }, [messages.length]);

  // 방 목록 불러오기
  const loadRooms = useCallback(async () => {
    const res = await fetch('/api/chat/rooms').catch(() => null);
    if (!res) return;
    const data = await res.json().catch(() => null);
    if (!data) return;
    // ✅ 응답 구조: { success, data: { rooms } }
    if (data.success && data.data?.rooms) setRooms(data.data.rooms);
    else if (Array.isArray(data.data)) setRooms(data.data);
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // 폴링
  useEffect(() => {
    if (!currentRoomId) return;

    const poll = async () => {
      const res = await fetch(`/api/chat/poll?roomId=${currentRoomId}&limit=50`).catch(() => null);
      if (!res || !res.ok) return;

      const data = await res.json().catch(() => null);
      if (!data) return;

      // ✅ poll 응답 구조 유연하게 처리
      const rawMsgs = data.data?.messages || data.payload?.messages || [];
      if (!rawMsgs.length) return;

      const msgs = [...rawMsgs].reverse();
      const enriched = msgs.map((m: any) => {
        const hasKorean = /[가-힣]/.test(m.original || '');
        const srcLang = hasKorean ? 'ko' : 'vi';
        const tgtLang = srcLang === 'ko' ? 'vi' : 'ko';

        let translated = '';
        if (m.translations) {
          translated = m.translations[tgtLang] || m.translations[srcLang] || '';
        }
        if (!translated || translated === m.original) {
          translated = m.extra?.translated || m.original;
        }

        return {
          messageId: m.messageId || m.id,
          original: m.original || '',
          translated,
          sourceLang: srcLang,
          targetLang: tgtLang,
          emotion: typeof m.emotion === 'string' ? m.emotion : m.emotion?.primary || 'neutral',
          riskScore: m.extra?.riskScore || 0,
          timestamp: m.timestamp || m.createdAt,
          userId: m.userId || '',
        };
      });

      setMessages(enriched);
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [currentRoomId]);

  // 첫 번째 언어 감지
  useEffect(() => {
    if (messages.length > 0 && messages[0].sourceLang && !firstLanguage) {
      setFirstLanguage(messages[0].sourceLang);
    }
  }, [messages.length, firstLanguage]);

  const sendMessageToRoom = async (roomId: string, text: string) => {
    await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ roomId, userId: deviceId, original: text, analyze: true }),
    }).catch((err) => console.error('메시지 전송 실패:', err));
  };

  const handleSend = useCallback(async (text: string) => {
    setIsLoading(true);
    if (!currentRoomId) {
      // 방 없으면 자동 생성
      const res = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ title: '기본 채팅방' }),
      }).catch(() => null);

      const data = res ? await res.json().catch(() => null) : null;
      // ✅ 응답 구조: { success, data: { room } }
      if (data?.success && data.data?.room) {
        const newRoomId = data.data.room.roomId;
        setCurrentRoomId(newRoomId);
        setCurrentRoomCode(data.data.room.inviteCode || '------');
        loadRooms();
        await sendMessageToRoom(newRoomId, text);
      }
    } else {
      await sendMessageToRoom(currentRoomId, text);
    }
    setIsLoading(false);
  }, [currentRoomId, deviceId, loadRooms]);

  const handleBubbleClick = useCallback((msg: Message) => {
    setSelectedMessage(msg);
  }, []);

  const handleExitRoom = useCallback(() => {
    setCurrentRoomId(null);
    setCurrentRoomCode('------');
    setMessages([]);
    setIsRoomMode(false);
    setFirstLanguage(null);
    setShowDaily(true);
  }, []);

  return (
    <div className="app-shell">
      <BrainHeader
        project={currentRoomId ? 'chat' : 'ring'}
        isRoomMode={isRoomMode}
        onRoomToggle={() => {
          if (currentRoomId) handleExitRoom();
          else setIsRoomMode(prev => !prev);
        }}
        isTyping={isTyping}
        onClear={() => setMessages([])}
        onShare={async () => {
          await navigator.share?.({ title: 'BRAINPOOL', text: 'CORE-RING', url: location.href })
            .catch(() => navigator.clipboard.writeText(location.href));
        }}
      />

      <RoomList
        rooms={rooms}
        onSelectRoom={(id) => setCurrentRoomId(id)}
        onCreateRoom={async () => {
          const title = prompt('방 제목:');
          if (!title) return;
          const res = await fetch('/api/chat/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ title }),
          }).catch(() => null);
          const data = res ? await res.json().catch(() => null) : null;
          // ✅ 응답 구조: { success, data: { room } }
          if (data?.success && data.data?.room) {
            loadRooms();
            setCurrentRoomId(data.data.room.roomId);
            setCurrentRoomCode(data.data.room.inviteCode || '------');
          }
        }}
        visible={isRoomMode && !currentRoomId}
      />

      <div className="chat-container" ref={chatRef}>
        {/* 오늘의 단어 — 메시지 없을 때만 표시 */}
        {showDaily && messages.length === 0 && !isLoading && (
          <div className={styles.dailyCard}>
            <p className={styles.dailyLabel}>오늘의 단어</p>
            <p className={styles.dailyWord}>{dailyWord.word}</p>
            {dailyWord.meaning && (
              <p className={styles.dailyMeaning}>{dailyWord.meaning}</p>
            )}
            {dailyWord.usage && (
              <p className={styles.dailyUsage}>{dailyWord.usage}</p>
            )}
            {dailyWord.culturalNote && (
              <p className={styles.dailyNote}>{dailyWord.culturalNote}</p>
            )}
          </div>
        )}

        {/* 빈 상태 */}
        {messages.length === 0 && !isLoading && !dailyWord.word && (
          <div className={styles.emptyState}>
            <p>심장을 분석합니다...</p>
            <p className={styles.emptyStateSub}>한국어 ↔ 베트남어 방언까지</p>
          </div>
        )}

        {isLoading && (
          <div className={styles.loadingState}>번역 분석 중...</div>
        )}

        {messages.map((msg) => {
          const isFirstLang = msg.sourceLang === firstLanguage;
          return (
            <ChatBubble
              key={msg.messageId}
              original={msg.original}
              translated={msg.translated}
              sourceLang={msg.sourceLang}
              targetLang={msg.targetLang}
              emotion={msg.emotion}
              riskScore={msg.riskScore}
              timestamp={msg.timestamp}
              deviceId={deviceId}
              messageId={msg.messageId}
              isFirstLang={isFirstLang}
              onClick={() => handleBubbleClick(msg)}
            />
          );
        })}
      </div>

      <RoomBar
        nickname={nickname}
        roomCode={currentRoomCode}
        onChangeNickname={() => {
          const name = prompt('닉네임:', nickname);
          if (name) setNickname(name);
        }}
        onCopyCode={() => navigator.clipboard.writeText(currentRoomCode)}
        onExit={handleExitRoom}
        visible={!!currentRoomId}
      />

      <ChatInput onSend={handleSend} onTypingChange={setIsTyping} />

      <WordModal
        word={
          selectedMessage
            ? {
                word: selectedMessage.translated,
                standard: selectedMessage.translated,
                meaning: `"${selectedMessage.original}" → "${selectedMessage.translated}"`,
                usage: selectedMessage.sourceLang === 'ko'
                  ? '한국어에서 베트남어로 번역된 표현입니다.'
                  : '베트남어에서 한국어로 번역된 표현입니다.',
                emotion: selectedMessage.emotion,
                riskScore: selectedMessage.riskScore,
                culturalNote: selectedMessage.culturalNote || '문화적 맥락을 분석 중입니다.',
                relatedWords: [selectedMessage.original],
              }
            : null
        }
        onClose={() => setSelectedMessage(null)}
      />
    </div>
  );
}