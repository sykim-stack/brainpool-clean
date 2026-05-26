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
  isPublic?: boolean;
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
    body: JSON.stringify({ action: 'get-random-word' }),
  }).catch(() => null);

  if (!res || !res.ok) return { word: '', _error: 'fetch_failed' };

  const text = await res.text().catch(() => null);
  if (!text) return { word: '', _error: 'empty' };

  const json = JSON.parse(text) as {
    success?: boolean;
    payload?: { word?: string; meaning?: string; usage?: string; culturalNote?: string };
  };
  if (!json.success || !json.payload?.word) return { word: '', _error: 'no_payload' };

  return {
    word: json.payload.word,
    meaning: json.payload.meaning,
    usage: json.payload.usage,
    culturalNote: json.payload.culturalNote,
  };
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

// 불러오기
const [myRooms, setMyRooms] = useState<Room[]>(() => {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('myRooms') || '[]');
});

const saveMyRoom = (room: Room) => {
  setMyRooms(prev => {
    const exists = prev.find(r => r.roomId === room.roomId);
    if (exists) return prev;
    const updated = [room, ...prev].slice(0, 10);
    localStorage.setItem('myRooms', JSON.stringify(updated));
    return updated;
  });
};

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    fetchDailyWord().then((result) => {
      if (!result._error && result.word) {
        setDailyWord(result);
      }
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) setShowDaily(false);
  }, [messages.length]);

  const loadRooms = useCallback(async () => {
    const res = await fetch('/api/chat/rooms', {
      headers: { 'x-device-id': deviceId },
    }).catch(() => null);
    if (!res) return;
    const data = await res.json().catch(() => null);
    if (!data) return;
    if (data?.payload?.rooms) setRooms(data.payload.rooms);
  }, [deviceId]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  useEffect(() => {
    if (!currentRoomId) return;

    const poll = async () => {
      const res = await fetch(`/api/chat/poll?roomId=${currentRoomId}&limit=50`).catch(() => null);
      if (!res || !res.ok) return;

      const data = await res.json().catch(() => null);
      if (!data) return;

      const rawMsgs = data.payload?.messages || [];
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
          translated = m.original;  // ← 번역 없으면 원문으로 대체
        }

        return {
          messageId: m.messageId || m.id,
          original: m.original || '',
          translated,
          sourceLang: srcLang,
          targetLang: tgtLang,
          emotion: typeof m.emotion === 'string' ? m.emotion : m.emotion?.primary || 'neutral',
          riskScore: 0,
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
      const res = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ title: '기본 채팅방' }),
      }).catch(() => null);

      const data = res ? await res.json().catch(() => null) : null;
      // API 응답: { payload: { room: {...} } }
      if (data?.payload?.room) {
        const newRoomId = data.payload.room.roomId;
        setCurrentRoomId(newRoomId);
        setCurrentRoomCode(data.payload.room.inviteCode || '------');
        saveMyRoom(data.payload.room); // ← 추가
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

  const handleJoinByCode = useCallback(async (inviteCode: string) => {
    const res = await fetch('/api/chat/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ inviteCode }),
    }).catch(() => null);

    const data = res ? await res.json().catch(() => null) : null;
    // API 응답: { payload: { room: {...} } }
    if (data?.payload?.room) {
      setCurrentRoomId(data.payload.room.roomId);
      setCurrentRoomCode(data.payload.room.inviteCode || '------');
      saveMyRoom(data.payload.room); // ← 추가
      setIsRoomMode(false);
    } else {
      alert('방을 찾을 수 없습니다. 코드를 확인해주세요.');
    }
  }, []);
  const handleDeleteRoom = useCallback(async (roomId: string) => {
    const res = await fetch(`/api/chat/rooms/${roomId}`, {
      method: 'DELETE',
    }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    if (data?.payload?.deleted) {
      setMyRooms(prev => {
        const updated = prev.filter(r => r.roomId !== roomId);
        localStorage.setItem('myRooms', JSON.stringify(updated));
        return updated;
      });
      loadRooms();
    }
  }, [loadRooms]);
  return (
    <div className="app-shell">
      <BrainHeader
        project={isRoomMode ? 'chat' : 'ring'}
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
        myRooms={myRooms} 
        onSelectRoom={(id) => {
          const room = rooms.find(r => r.roomId === id);
          setCurrentRoomId(id);
          setCurrentRoomCode(room?.inviteCode || '------');
        }}
        onJoinByCode={handleJoinByCode}
        onCreateRoom={async (title: string, isPublic: boolean) => {
          const res = await fetch('/api/chat/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ title, isPublic }),
          }).catch(() => null);
          const data = res ? await res.json().catch(() => null) : null;
          if (data?.payload?.room) {
            loadRooms();
            setCurrentRoomId(data.payload.room.roomId);
            setCurrentRoomCode(data.payload.room.inviteCode || '------');
            saveMyRoom(data.payload.room); // ← 추가
            setIsRoomMode(false);
          }

        }}
        onDeleteRoom={handleDeleteRoom}  // ← 여기 추가
        visible={isRoomMode && !currentRoomId}
      />

      <div className="chat-container" ref={chatRef}>
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
                word: selectedMessage.original,
                meaning: selectedMessage.translated,
                usage: selectedMessage.sourceLang === 'ko'
                  ? '한국어에서 베트남어로 번역된 표현입니다.'
                  : '베트남어에서 한국어로 번역된 표현입니다.',
                emotion: selectedMessage.emotion,
                riskScore: selectedMessage.riskScore,
                culturalNote: selectedMessage.culturalNote,
                relatedWords: selectedMessage.translated ? [selectedMessage.translated] : [],
                sessionId: currentRoomId || undefined,
              }
            : null
        }
        userId={deviceId}
        onClose={() => setSelectedMessage(null)}
      />
    </div>
  );
}
