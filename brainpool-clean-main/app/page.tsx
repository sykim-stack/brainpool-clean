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

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentRoomCode, setCurrentRoomCode] = useState('------');
  const [isRoomMode, setIsRoomMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [nickname, setNickname] = useState('익명');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedWord, setSelectedWord] = useState<any>(null);
  const [selectedWordText, setSelectedWordText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceId] = useState(getDeviceId);
  const chatRef = useRef<HTMLDivElement>(null);
  const [firstLanguage, setFirstLanguage] = useState<string | null>(null);
  const [dailyWord, setDailyWord] = useState<DailyWord>({
    word: 'xin chào', meaning: '안녕하세요',
    usage: '처음 만나는 사람에게 쓰는 베트남어 인사',
    culturalNote: '남부에서는 "chào" 만으로도 자연스럽습니다',
  });
  const [showDaily, setShowDaily] = useState(true);
  const [showRoomBanner, setShowRoomBanner] = useState(false);
  const [shareRoomCode, setShareRoomCode] = useState<string | null>(null);
  const [langHistory, setLangHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'ring' | 'phrase'>('ring');
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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

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
    try {
      const saved = localStorage.getItem('recentTranslations');
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    if (currentRoomId) return;
    try {
      localStorage.setItem('recentTranslations', JSON.stringify(messages.slice(-30)));
    } catch {}
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

  useEffect(() => { loadRooms(); }, [loadRooms]);

  useEffect(() => {
    if (!deviceId) return;
    if (typeof Notification !== 'undefined' && Notification.requestPermission) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') subscribePush(deviceId);
      }).catch(() => {});
    }
  }, [deviceId]);

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
  }, [currentRoomId]);

  useEffect(() => {
    if (messages.length > 0 && messages[0].sourceLang && !firstLanguage) {
      setFirstLanguage(messages[0].sourceLang);
    }
  }, [messages.length, firstLanguage]);

  const sendMessageToRoom = async (roomId: string, text: string) => {
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ action: 'send', roomId, userId: deviceId, original: text, analyze: true }),
    }).catch(err => console.error('메시지 전송 실패:', err));
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
  }, [currentRoomId, deviceId, loadRooms]);

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
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const roomParam = params.get('room');
    if (code) {
      handleJoinByCode(code.toUpperCase());
      window.history.replaceState({}, '', window.location.pathname);
    } else if (roomParam) {
      (async () => {
        const res = await fetch(`/api/chat/rooms/${roomParam}`).catch(() => null);
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
  }, []);

  // [AUTH] deviceId 전달 — 방장만 삭제. 실패 시 피드백.
  const handleDeleteRoom = useCallback(async (roomId: string) => {
    const res = await fetch(`/api/chat/rooms/${roomId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-device-id': deviceId,
      },
      body: JSON.stringify({ deviceId }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    if (data?.payload?.deleted) {
      setMyRooms(prev => {
        const updated = prev.filter(r => r.roomId !== roomId);
        localStorage.setItem('myRooms', JSON.stringify(updated));
        return updated;
      });
      if (currentRoomId === roomId) {
        setCurrentRoomId(null);
        setCurrentRoomCode('------');
        setMessages([]);
      }
      loadRooms();
    } else {
      const msg = typeof data?._error === 'string' ? data._error : '방을 삭제할 수 없습니다.';
      alert(msg.replace(/^FORBIDDEN:\s*/, '') || '방장만 삭제할 수 있습니다.');
    }
  }, [loadRooms, deviceId, currentRoomId]);

  const handleVoiceSend = useCallback(async (audioUrl: string) => {
    const voiceMsg = {
      messageId: crypto.randomUUID(),
      original: '🎤 음성 메시지',
      translated: '🎤 음성 메시지',
      sourceLang: 'ko',
      targetLang: 'vi',
      emotion: 'neutral',
      riskScore: 0,
      timestamp: new Date().toISOString(),
      userId: deviceId,
      audioUrl,
    };
    setMessages(prev => [...prev, voiceMsg]);
    if (currentRoomId) await sendMessageToRoom(currentRoomId, '🎤 음성 메시지');
    setMessages(prev => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, audioUrl }];
    });
  }, [currentRoomId]);

  const handleBubbleClick = useCallback((msg: Message) => {
    setSelectedMessage(msg);
    setSelectedWord(null);
    setSelectedWordText(null);
  }, []);

  const handleWordClick = useCallback(async (msg: Message, word: string) => {
    setSelectedMessage(msg);
    setSelectedWord(null);
    setSelectedWordText(word);
    const res = await fetch('/api/phrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ action: 'getWordData', word }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    if (json?.success && json.payload) setSelectedWord(json.payload);
  }, []);

  const handleExitRoom = useCallback(() => {
    setCurrentRoomId(null);
    setCurrentRoomCode('------');
    setMessages([]);
    setIsRoomMode(false);
  }, []);

  return (
    <div className="app-shell">
      <BrainHeader
        project={(isRoomMode || currentRoomId) ? 'chat' : 'ring'}
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
          // [AUTH] 서버 성공 후에만 로컬 비움 + deviceId 방장 검증
          if (!window.confirm('이 방의 메시지를 모두 지울까요? (방장만 가능)')) return;
          const res = await fetch(`/api/chat/rooms/${currentRoomId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'x-device-id': deviceId,
            },
            body: JSON.stringify({ deviceId }),
          }).catch(() => null);
          const data = res ? await res.json().catch(() => null) : null;
          if (data?.payload?.cleared) {
            setMessages([]);
          } else {
            const msg = typeof data?._error === 'string' ? data._error : '메시지를 초기화할 수 없습니다.';
            alert(msg.replace(/^FORBIDDEN:\s*/, '') || '방장만 초기화할 수 있습니다.');
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
        onSelectRoom={(id) => {
          const room = rooms.find(r => r.roomId === id) || myRooms.find(r => r.roomId === id);
          setMessages([]);
          setCurrentRoomId(id);
          setCurrentRoomCode(room?.inviteCode || '------');
        }}
        onJoinByCode={handleJoinByCode}
        onCreateRoom={async (title: string, isPublic: boolean) => {
          // [AUTH] createdBy에 실제 deviceId 전달
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
            setIsRoomMode(false);
          }
        }}
        onDeleteRoom={handleDeleteRoom}
        visible={isRoomMode && !currentRoomId}
      />

      <div className={styles.tabBar}>
        <button className={`${styles.tabBtn} ${activeTab === 'ring' ? styles.tabActive : ''}`} onClick={() => setActiveTab('ring')}>CoreRing</button>
        <button className={`${styles.tabBtn} ${activeTab === 'phrase' ? styles.tabActive : ''}`} onClick={() => setActiveTab('phrase')}>CorePhrase</button>
      </div>

      {activeTab === 'phrase' ? (
        <CorePhrase userId={deviceId} />
      ) : (
        <>
          <RoomBar
            nickname={nickname}
            roomCode={currentRoomCode}
            onChangeNickname={() => {
              const n = window.prompt('닉네임', nickname);
              if (n) setNickname(n);
            }}
            onCopyCode={() => { navigator.clipboard.writeText(currentRoomCode).catch(() => {}); }}
            onExit={handleExitRoom}
            visible={!!currentRoomId}
          />
          <div className={styles.chatArea} ref={chatRef}>
            {showDaily && !currentRoomId && messages.length === 0 && (
              <div className={styles.dailyWord}>
                <div className={styles.dailyLabel}>오늘의 단어</div>
                <div className={styles.dailyMain}>{dailyWord.word}</div>
                <div className={styles.dailyMeaning}>{dailyWord.meaning}</div>
                {dailyWord.usage && <div className={styles.dailyUsage}>{dailyWord.usage}</div>}
                {dailyWord.culturalNote && <div className={styles.dailyNote}>{dailyWord.culturalNote}</div>}
              </div>
            )}
            {messages.map((msg) => {
              // [FIX] ChatBubble 필수 props 복구 (deviceId/messageId/isFirstLang/riskScore)
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
                audioUrl={msg.audioUrl}
                onClick={() => handleBubbleClick(msg)}
                onWordClick={(word: string) => handleWordClick(msg, word)}
              />
              );
            })}
            {isLoading && <div className={styles.typing}>번역 중…</div>}
          </div>
          <ChatInput onSend={handleSend} onVoiceSend={handleVoiceSend} disabled={isLoading} />
        </>
      )}

      {showRoomBanner && !currentRoomId && (
        <div className={styles.roomBanner}>
          <p>양방향 대화가 감지되었습니다. 채팅방을 만들어 보세요.</p>
          <button onClick={() => { setShowRoomBanner(false); setIsRoomMode(true); }}>💬 채팅방 만들기</button>
          <button onClick={() => setShowRoomBanner(false)}>닫기</button>
        </div>
      )}

      {shareRoomCode && (
        <ShareRoomModal roomCode={shareRoomCode} onClose={() => setShareRoomCode(null)} />
      )}

      <WordModal
        data={selectedMessage ? {
          sentence: selectedWordText || selectedMessage.original,
          translated: selectedWordText ? '' : selectedMessage.translated,
          sourceLang: selectedMessage.sourceLang,
          targetLang: selectedMessage.targetLang,
          emotion: selectedMessage.emotion,
          riskScore: selectedMessage.riskScore,
          intent: selectedMessage.intent,
          culturalNote: selectedMessage.culturalNote,
          sessionId: currentRoomId || undefined,
          wordDetail: selectedWord || undefined,
        } : null}
        userId={deviceId}
        onClose={() => { setSelectedMessage(null); setSelectedWord(null); setSelectedWordText(null); }}
      />

      {showIOSGuide && (
        <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', background: 'var(--color-surface)', border: '1px solid var(--color-accent)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', width: '90%', maxWidth: '400px', zIndex: 50 }}>
          <p>📲 Safari 하단 공유버튼 → "홈 화면에 추가"</p>
          <button onClick={() => setShowIOSGuide(false)}>닫기</button>
        </div>
      )}
    </div>
  );
}
