'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import BrainHeader from '@/components/BrainHeader';
import ChatBubble from '@/components/ChatBubble';
import ChatInput from '@/components/ChatInput';
import RoomList from '@/components/RoomList';
import RoomBar from '@/components/RoomBar';
import WordModal from '@/components/WordModal';
import CorePhrase from '@/components/CorePhrase';
import ShareRoomModal from '@/components/ShareRoomModal';
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
  intent?: string;
  culturalNote?: string;
  timestamp: string;
  userId?: string;
  audioUrl?: string;
}

interface Room {
  roomId: string;
  title: string;
  inviteCode?: string;
  messageCount?: number;
  isPublic?: boolean;
  ownerDeviceId?: string;
}

interface DailyWord {
  word: string;
  meaning?: string;
  usage?: string;
  culturalNote?: string;
}

const subscribePush = async (deviceId: string) => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: deviceId, subscription: sub }),
    });
  } catch (e) {
    console.warn('[Push] 구독 실패:', e);
  }
};

const DEVICE_ID_KEY = 'corering_device_id';
const LEGACY_DEVICE_ID_KEY = 'deviceId';

function readOrCreateDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const legacy = localStorage.getItem(LEGACY_DEVICE_ID_KEY);
  if (legacy) {
    localStorage.setItem(DEVICE_ID_KEY, legacy);
    return legacy;
  }
  const fresh = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, fresh);
  return fresh;
}

const fetchDailyWord = async (): Promise<DailyWord & { _error?: string }> => {
  const res = await fetch('/api/phrase', {
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

export default function Home({ initialRoomId }: { initialRoomId?: string } = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentRoomCode, setCurrentRoomCode] = useState('------');
  const [isRoomMode, setIsRoomMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedWord, setSelectedWord] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  const [firstLanguage, setFirstLanguage] = useState<string | null>(null);
  const [dailyWord, setDailyWord] = useState<DailyWord>({
    word: 'xin chào', meaning: '안녕하세요',
    usage: '처음 만나는 사람에게 쓰는 인사',
    culturalNote: '남부에서는 "chào" 만으로도 자연스러워요',
  });
  const [showDaily, setShowDaily] = useState(true);
  const [showRoomBanner, setShowRoomBanner] = useState(false);
  const [shareRoomCode, setShareRoomCode] = useState<string | null>(null);
  const [shareRoomId, setShareRoomId] = useState<string | null>(null);
  const [langHistory, setLangHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'ring' | 'phrase'>('ring');
  const [myRooms, setMyRooms] = useState<Room[]>(() => {
    if (typeof window === 'undefined') return [];
    return JSON.parse(localStorage.getItem('myRooms') || '[]');
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

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
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = useCallback(async () => {
    const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const isKakao = /KAKAOTALK/i.test(navigator.userAgent);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else if (isKakao) {
      window.open(`intent://${location.href.replace(/https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`);
    }
  }, [deferredPrompt]);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    setDeviceId(readOrCreateDeviceId());
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentTranslations');
      if (saved) setMessages(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (currentRoomId) return;
    try {
      const toSave = messages.slice(-30);
      localStorage.setItem('recentTranslations', JSON.stringify(toSave));
    } catch { /* ignore */ }
  }, [messages, currentRoomId]);

  useEffect(() => {
    fetchDailyWord().then(result => {
      if (!result._error && result.word) setDailyWord(result);
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
    if (data?.payload?.rooms) setRooms(data.payload.rooms);
  }, [deviceId]);

  const validateMyRooms = useCallback(async () => {
    setMyRooms(prev => {
      if (prev.length === 0) return prev;
      (async () => {
        const checks = await Promise.all(
          prev.map(async (room) => {
            const res = await fetch('/api/chat/rooms/' + room.roomId).catch(() => null);
            if (!res || !res.ok) return null;
            const data = await res.json().catch(() => null);
            return data?.payload?.room ? room : null;
          })
        );
        const alive = checks.filter(Boolean) as Room[];
        if (alive.length !== prev.length) {
          setMyRooms(alive);
          localStorage.setItem('myRooms', JSON.stringify(alive));
        }
      })();
      return prev;
    });
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);
  useEffect(() => { validateMyRooms(); }, [validateMyRooms]);

  useEffect(() => {
    if (!deviceId) return;
    if (typeof Notification !== 'undefined' && Notification.requestPermission) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') subscribePush(deviceId);
      }).catch(() => {});
    }
  }, [deviceId]);

  const handleExitRoom = useCallback(() => {
    setCurrentRoomId(null);
    setCurrentRoomCode('------');
    setMessages([]);
    setIsRoomMode(false);
  }, []);

  useEffect(() => {
    if (!currentRoomId) return;
    let isPolling = false;
    let cancelled = false;
    const poll = async () => {
      if (isPolling || cancelled) return;
      isPolling = true;
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ action: 'poll', roomId: currentRoomId, limit: 50 }),
        });
        if (cancelled || !res || !res.ok) return;
        const data = await res.json().catch(() => null);
        if (cancelled || !data) return;
        if (data._error === 'ROOM_DELETED') {
          alert('이 방은 삭제되었습니다.');
          handleExitRoom();
          return;
        }
        const rawMsgs = data.payload?.messages || [];
        if (!rawMsgs.length) return;
        const msgs = [...rawMsgs].reverse();
        const enriched = msgs.map((m: any) => {
          const srcLang = m.sourceLang || (/[가-힣]/.test(m.original || '') ? 'ko' : 'vi');
          const tgtLang = m.targetLang || (srcLang === 'ko' ? 'vi' : 'ko');
          const translated = m.translated || m.translations?.[tgtLang] || m.translations?.[srcLang] || m.original;
          return {
            messageId: m.messageId || m.id,
            original: m.original || '',
            translated,
            sourceLang: srcLang,
            targetLang: tgtLang,
            emotion: typeof m.emotion === 'string' ? m.emotion : m.emotion?.primary || 'neutral',
            riskScore: m.riskScore ?? 0,
            intent: m.intent || undefined,
            culturalNote: m.culturalNote || undefined,
            timestamp: m.timestamp || m.createdAt,
            userId: m.userId || '',
            audioUrl: m.audioUrl || undefined,
          };
        });
        if (!cancelled) setMessages(enriched);
      } catch (e: any) {
        if (!cancelled) console.warn('[poll] 에러:', e.message);
      } finally {
        isPolling = false;
      }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentRoomId, handleExitRoom]);

  useEffect(() => {
    if (messages.length > 0 && messages[0].sourceLang && !firstLanguage) {
      setFirstLanguage(messages[0].sourceLang);
    }
  }, [messages.length, firstLanguage]);

  const sendMessageToRoom = async (roomId: string, text: string) => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ action: 'send', roomId, userId: deviceId, original: text, analyze: true }),
    }).catch(err => { console.error('메시지 전송 실패:', err); return null; });
    const data = res ? await res.json().catch(() => null) : null;
    if (data?._error === 'ROOM_DELETED') {
      alert('이 방은 삭제되었습니다.');
      handleExitRoom();
    }
  };

  const handleSend = useCallback(async (text: string) => {
    setIsLoading(true);
    if (!currentRoomId) {
      try {
        const res = await fetch('/api/brainpool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ text }),
        }).catch(() => null);
        const data = res ? await res.json().catch(() => null) : null;
        if (data?.payload) {
          const p = data.payload;
          const srcLang = p.sourceLang || null;
          const tgtLang = p.targetLang || (srcLang === 'ko' ? 'vi' : 'ko');
          setMessages(prev => [...prev, {
            messageId: p.id || crypto.randomUUID(),
            original: p.original || text,
            translated: p.translated || text,
            sourceLang: srcLang,
            targetLang: tgtLang,
            emotion: p.emotion || 'neutral',
            riskScore: p.riskScore ?? 0,
            intent: p.intent || undefined,
            culturalNote: p.culturalNote || undefined,
            timestamp: new Date().toISOString(),
            userId: deviceId,
          }]);
          setLangHistory(prev => {
            const updated = [...prev, srcLang || 'unknown'];
            if (updated.includes('ko') && updated.includes('vi')) setShowRoomBanner(true);
            return updated;
          });
        }
      } catch (e) {}
      setIsLoading(false);
      return;
    } else {
      await sendMessageToRoom(currentRoomId, text);
    }
    setIsLoading(false);
  }, [currentRoomId, deviceId]);

  const handleJoinByCode = useCallback(async (inviteCode: string) => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ action: 'join', inviteCode }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    if (data && data.payload && data.payload.room) {
      setCurrentRoomId(data.payload.room.roomId);
      setCurrentRoomCode(data.payload.room.inviteCode || '------');
      saveMyRoom(data.payload.room);
      setIsRoomMode(false);
    } else {
      alert('방을 찾을 수 없습니다. 코드를 확인해주세요.');
    }
  }, []);

  useEffect(() => {
    if (initialRoomId) {
      (async () => {
        const res = await fetch('/api/chat/rooms/' + initialRoomId).catch(() => null);
        const data = res ? await res.json().catch(() => null) : null;
        if (data?.payload?.room) {
          setMessages([]);
          setCurrentRoomId(data.payload.room.roomId);
          setCurrentRoomCode(data.payload.room.inviteCode || '------');
          saveMyRoom(data.payload.room);
        }
      })();
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const roomParam = params.get('room');
    if (code) {
      handleJoinByCode(code.toUpperCase());
      window.history.replaceState({}, '', window.location.pathname);
    } else if (roomParam) {
      (async () => {
        const res = await fetch('/api/chat/rooms/' + roomParam).catch(() => null);
        const data = res ? await res.json().catch(() => null) : null;
        if (data?.payload?.room) {
          setMessages([]);
          setCurrentRoomId(data.payload.room.roomId);
          setCurrentRoomCode(data.payload.room.inviteCode || '------');
          saveMyRoom(data.payload.room);
        }
        window.history.replaceState({}, '', window.location.pathname);
      })();
    }
  }, [initialRoomId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteRoom = useCallback(async (roomId: string) => {
    const res = await fetch(`/api/chat/rooms/${roomId}`, {
      method: 'DELETE',
      headers: { 'x-device-id': deviceId },
    }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    if (data?.payload?.deleted) {
      setMyRooms(prev => {
        const updated = prev.filter(r => r.roomId !== roomId);
        localStorage.setItem('myRooms', JSON.stringify(updated));
        return updated;
      });
      loadRooms();
    } else if (String(data?._error || '').startsWith('FORBIDDEN')) {
      alert('방장만 삭제할 수 있어요.');
    }
  }, [deviceId, loadRooms]);

  const handleBubbleClick = (msg: Message) => setSelectedMessage(msg);
  const handleWordClick = (msg: Message, word: string) => {
    setSelectedMessage(msg);
    setSelectedWord({ word });
  };

  const handleVoiceSend = useCallback(async (_audioUrl: string) => {
    // voice path handled by ChatInput / API
  }, []);

  return (
    <div className={styles.page}>
      <BrainHeader
        isRoomMode={isRoomMode || !!currentRoomId}
        onRoomToggle={() => {
          if (currentRoomId) handleExitRoom();
          else setIsRoomMode(prev => !prev);
        }}
        isTyping={isTyping}
        onClear={async () => {
          if (!currentRoomId) {
            if (!window.confirm('번역 기록을 모두 지울까요?')) return;
            setMessages([]);
            localStorage.removeItem('recentTranslations');
            return;
          }
          if (!window.confirm('이 방의 메시지를 모두 지울까요?')) return;
          const res = await fetch(`/api/chat/rooms/${currentRoomId}`, {
            method: 'PATCH',
            headers: { 'x-device-id': deviceId },
          }).catch(() => null);
          const data = res ? await res.json().catch(() => null) : null;
          if (data?.payload?.cleared) {
            setMessages([]);
          } else if (String(data?._error || '').startsWith('FORBIDDEN')) {
            alert('방장만 메시지를 초기화할 수 있어요.');
          } else {
            alert('메시지 초기화에 실패했어요.');
          }
        }}
        onShare={async () => {
          await navigator.share?.({ title: 'BRAINPOOL', text: 'CORE-RING', url: location.href })
            .catch(() => navigator.clipboard.writeText(location.href));
        }}
        onInstall={handleInstall}
      />

      <RoomList
        rooms={rooms}
        myRooms={myRooms}
        onJoin={(room) => {
          setCurrentRoomId(room.roomId);
          setCurrentRoomCode(room.inviteCode || '------');
          saveMyRoom(room);
          setIsRoomMode(false);
        }}
        onCreateRoom={async (title: string, isPublic: boolean) => {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ action: 'create', title, isPublic, createdBy: deviceId }),
          }).catch(() => null);
          const data = res ? await res.json().catch(() => null) : null;
          if (data?.payload?.room) {
            loadRooms();
            setCurrentRoomId(data.payload.room.roomId);
            setCurrentRoomCode(data.payload.room.inviteCode || '------');
            saveMyRoom(data.payload.room);
            setShareRoomCode(data.payload.room.inviteCode || null);
            setShareRoomId(data.payload.room.roomId);
          }
        }}
        onDeleteRoom={handleDeleteRoom}
        visible={isRoomMode && !currentRoomId}
      />

      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'ring' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('ring')}
        >CoreRing</button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'phrase' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('phrase')}
        >CorePhrase</button>
      </div>

      {activeTab === 'phrase' && <CorePhrase userId={deviceId} />}

      <div className="chat-container" ref={chatRef}
        style={{ display: activeTab === 'ring' ? 'flex' : 'none' }}>
        {showDaily && messages.length === 0 && !isLoading && (
          <div className={styles.dailyCard}>
            <p className={styles.dailyLabel}>오늘의 단어</p>
            <p className={styles.dailyWord}>{dailyWord.word}</p>
            <p className={styles.dailyMeaning}>{dailyWord.meaning}</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isFirstLang = firstLanguage ? msg.sourceLang === firstLanguage : i % 2 === 0;
          return (
            <ChatBubble
              key={msg.messageId || i}
              original={msg.original}
              translated={msg.translated}
              emotion={msg.emotion}
              riskScore={msg.riskScore}
              timestamp={msg.timestamp}
              deviceId={deviceId}
              messageId={msg.messageId}
              isFirstLang={isFirstLang}
              onClick={() => handleBubbleClick(msg)}
              audioUrl={msg.audioUrl}
              onWordClick={(word) => handleWordClick(msg, word)}
            />
          );
        })}
      </div>

      {currentRoomId && (
        <RoomBar
          roomCode={currentRoomCode}
          onExit={handleExitRoom}
          onShare={() => {
            setShareRoomCode(currentRoomCode);
            setShareRoomId(currentRoomId);
          }}
        />
      )}

      <ChatInput onSend={handleSend} onTypingChange={setIsTyping} userId={deviceId} onVoiceSend={handleVoiceSend} />

      {showRoomBanner && !currentRoomId && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--color-surface)', padding: '12px 16px', borderRadius: 12, zIndex: 50,
        }}>
          양방향 대화가 감지됐어요. 채팅방을 만들어 보세요.
          <button onClick={() => setIsRoomMode(true)}>방 만들기</button>
          <button onClick={() => setShowRoomBanner(false)}>닫기</button>
        </div>
      )}

      <WordModal
        message={selectedMessage ? {
          original: selectedMessage.original,
          translated: selectedMessage.translated,
          wordDetail: selectedWord || undefined,
        } : null}
        userId={deviceId}
        onClose={() => { setSelectedMessage(null); setSelectedWord(null); }}
      />

      {shareRoomCode && (
        <ShareRoomModal
          inviteCode={shareRoomCode}
          roomId={shareRoomId || undefined}
          onClose={() => { setShareRoomCode(null); setShareRoomId(null); }}
        />
      )}

      {showIOSGuide && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--color-surface)', padding: 16, borderRadius: 12, zIndex: 50,
        }}>
          <p>iOS: 공유 → 홈 화면에 추가</p>
          <button onClick={() => setShowIOSGuide(false)} style={{ background: 'transparent', color: 'var(--color-text-muted)', border: 'none', cursor: 'pointer' }}>
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
