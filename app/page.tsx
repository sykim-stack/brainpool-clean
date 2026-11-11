'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import BrainHeader from '@/components/BrainHeader';
import ChatBubble from '@/components/ChatBubble';
import ChatInput from '@/components/ChatInput';
import OpportunityBanner, { type OpportunityItem } from '@/components/OpportunityBanner';
import RoomList from '@/components/RoomList';
import RoomBar from '@/components/RoomBar';
import WordModal from '@/components/WordModal';
import WordPreviewSheet from '@/components/WordPreviewSheet';
import CorePhrase from '@/components/CorePhrase';
import KiipPractice from '@/components/KiipPractice';
import ShareRoomModal from '@/components/ShareRoomModal';
import { speakNow } from '@/lib/tts';
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
/** CoreNull lib/ownerKey.ts 와 동일 — Platform 통합 아이디 */
const OWNER_KEY = 'corenull_owner_key';

function readOwnerKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(OWNER_KEY)?.trim() || '';
}

/** device 필수 + owner_key 있으면 x-owner-key 부착 */
function authHeaders(deviceId: string, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'x-device-id': deviceId,
    ...extra,
  };
  const ownerKey = readOwnerKey();
  if (ownerKey) headers['x-owner-key'] = ownerKey;
  return headers;
}

/** CoreNull Yard와 동일 톤 — CoreHub action_type → 표시 문구 */
const OPPORTUNITY_LABEL: Record<string, string> = {
  'suggest.corering': '💬 번역 도움이 필요하신가요?',
  'trigger.hajunai.celebrate': '🍎 씨앗이 열매가 됐어요',
  'trigger.hajunai.nudge': '🌱 씨앗이 기다리고 있어요',
};

const COREHUB_OPP_URL = 'https://brainpool-corehub.vercel.app/api/corehub/opportunities';

function mapOpportunities(raw: any[]): OpportunityItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 3).map((item: any) => ({
    id: String(item.id),
    label:
      OPPORTUNITY_LABEL[item.action_type] ||
      item.payload?.message ||
      '발견',
  }));
}

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
  const [nickname, setNickname] = useState('익명');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedWord, setSelectedWord] = useState<any>(null);
  const [wordPreviewOpen, setWordPreviewOpen] = useState(false);
  const [wordPreviewLoading, setWordPreviewLoading] = useState(false);
  const [wordPreviewAnchor, setWordPreviewAnchor] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  const [firstLanguage, setFirstLanguage] = useState<string | null>(null);
  const [dailyWord, setDailyWord] = useState<DailyWord>({
    word: 'xin chào',
    meaning: '안녕하세요',
    usage: '처음 만나는 사람에게 쓰는 인사',
    culturalNote: '남부에서는 "chào" 만으로도 자연스러워요',
  });
  const [showDaily, setShowDaily] = useState(true);
  const [showRoomBanner, setShowRoomBanner] = useState(false);
  const [shareRoomCode, setShareRoomCode] = useState<string | null>(null);
  const [shareRoomId, setShareRoomId] = useState<string | null>(null);
  const [langHistory, setLangHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'ring' | 'phrase' | 'kiip'>('ring');
  const [myRooms, setMyRooms] = useState<Room[]>(() => {
    if (typeof window === 'undefined') return [];
    return JSON.parse(localStorage.getItem('myRooms') || '[]');
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const dismissedOppRef = useRef<Set<string>>(new Set());

  const saveMyRoom = (room: Room) => {
    setMyRooms((prev) => {
      if (prev.find((r) => r.roomId === room.roomId)) return prev;
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
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else if (isIOS) setShowIOSGuide(true);
  }, [deferredPrompt]);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    setDeviceId(readOrCreateDeviceId());
  }, []);

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
    fetchDailyWord().then((r) => {
      if (!r._error && r.word) setDailyWord(r);
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) setShowDaily(false);
  }, [messages.length]);

  const loadRooms = useCallback(async () => {
    const res = await fetch('/api/chat/rooms', { headers: authHeaders(deviceId) }).catch(() => null);
    if (!res) return;
    const data = await res.json().catch(() => null);
    if (data?.payload?.rooms) setRooms(data.payload.rooms);
  }, [deviceId]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (!deviceId) return;
    if (typeof Notification !== 'undefined' && Notification.requestPermission) {
      Notification.requestPermission()
        .then((p) => {
          if (p === 'granted') subscribePush(deviceId);
        })
        .catch(() => {});
    }
  }, [deviceId]);

  const refreshOpportunities = useCallback(async (ownerKey: string) => {
    if (!ownerKey) return;
    try {
      const res = await fetch(
        `${COREHUB_OPP_URL}?owner_key=${encodeURIComponent(ownerKey)}&status=open&limit=5`,
        { cache: 'no-store' }
      ).catch(() => null);
      if (!res || !res.ok) return;
      const data = await res.json().catch(() => null);
      const raw = Array.isArray(data?.data)
        ? data.data
        : data?.payload?.opportunities || data?.opportunities || [];
      const mapped = mapOpportunities(raw).filter((o) => !dismissedOppRef.current.has(o.id));
      setOpportunities(mapped);
    } catch (e) {
      console.warn('[opp] refresh failed', e);
    }
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    // Platform owner_key 우선, 없으면 deviceId (기존과 동일)
    refreshOpportunities(readOwnerKey() || deviceId);
  }, [deviceId, refreshOpportunities]);

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
          headers: authHeaders(deviceId, {
            'Content-Type': 'application/json; charset=utf-8',
          }),
          body: JSON.stringify({ action: 'poll', roomId: currentRoomId, limit: 50 }),
        });
        if (cancelled || !res?.ok) return;
        const data = await res.json().catch(() => null);
        if (cancelled || !data) return;
        if (data._error === 'ROOM_DELETED') {
          alert('이 방은 삭제되었습니다.');
          handleExitRoom();
          return;
        }
        const rawMsgs = data.payload?.messages || [];
        if (!rawMsgs.length) return;
        const enriched = [...rawMsgs].reverse().map((m: any) => {
          const srcLang = m.sourceLang || (/[가-힣]/.test(m.original || '') ? 'ko' : 'vi');
          const tgtLang = m.targetLang || (srcLang === 'ko' ? 'vi' : 'ko');
          return {
            messageId: m.messageId || m.id,
            original: m.original || '',
            translated:
              m.translated ||
              m.translations?.[tgtLang] ||
              m.translations?.[srcLang] ||
              m.original,
            sourceLang: srcLang,
            targetLang: tgtLang,
            emotion: typeof m.emotion === 'string' ? m.emotion : m.emotion?.primary || 'neutral',
            riskScore: m.riskScore ?? 0,
            intent: m.intent,
            culturalNote: m.culturalNote,
            timestamp: m.timestamp || m.createdAt,
            userId: m.userId || '',
            audioUrl: m.audioUrl,
          };
        });
        if (!cancelled) setMessages(enriched);
      } catch (e: any) {
        if (!cancelled) console.warn('[poll]', e.message);
      } finally {
        isPolling = false;
      }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentRoomId, deviceId, handleExitRoom]);

  useEffect(() => {
    if (messages.length > 0 && messages[0].sourceLang && !firstLanguage) {
      setFirstLanguage(messages[0].sourceLang);
    }
  }, [messages.length, firstLanguage]);

  const sendMessageToRoom = async (roomId: string, text: string) => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: authHeaders(deviceId, {
        'Content-Type': 'application/json; charset=utf-8',
      }),
      body: JSON.stringify({
        action: 'send',
        roomId,
        userId: deviceId,
        original: text,
        analyze: true,
      }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    if (data?._error === 'ROOM_DELETED') {
      alert('이 방은 삭제되었습니다.');
      handleExitRoom();
    }
  };

  const handleSend = useCallback(
    async (text: string) => {
      setIsLoading(true);
      if (!currentRoomId) {
        try {
          const res = await fetch('/api/brainpool', {
            method: 'POST',
            headers: authHeaders(deviceId, {
              'Content-Type': 'application/json; charset=utf-8',
            }),
            body: JSON.stringify({ text, device_id: deviceId }),
          }).catch(() => null);
          const data = res ? await res.json().catch(() => null) : null;
          if (data?.payload) {
            const p = data.payload;
            const srcLang = p.sourceLang || null;
            const tgtLang = p.targetLang || (srcLang === 'ko' ? 'vi' : 'ko');
            setMessages((prev) => [
              ...prev,
              {
                messageId: p.id || crypto.randomUUID(),
                original: p.original || text,
                translated: p.translated || text,
                sourceLang: srcLang,
                targetLang: tgtLang,
                emotion: p.emotion || 'neutral',
                riskScore: p.riskScore ?? 0,
                intent: p.intent,
                culturalNote: p.culturalNote,
                timestamp: new Date().toISOString(),
                userId: deviceId,
              },
            ]);
            setLangHistory((prev) => {
              const updated = [...prev, srcLang || 'unknown'];
              if (updated.includes('ko') && updated.includes('vi')) setShowRoomBanner(true);
              return updated;
            });
            window.setTimeout(() => refreshOpportunities(readOwnerKey() || deviceId), 1800);
          }
        } catch {}
        setIsLoading(false);
        return;
      }
      await sendMessageToRoom(currentRoomId, text);
      window.setTimeout(() => refreshOpportunities(readOwnerKey() || deviceId), 1800);
      setIsLoading(false);
    },
    [currentRoomId, deviceId, refreshOpportunities]
  );

  const handleJoinByCode = useCallback(async (inviteCode: string) => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ action: 'join', inviteCode }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    if (data?.payload?.room) {
      setCurrentRoomId(data.payload.room.roomId);
      setCurrentRoomCode(data.payload.room.inviteCode || '------');
      saveMyRoom(data.payload.room);
      setIsRoomMode(false);
    } else alert('방을 찾을 수 없습니다. 코드를 확인해주세요.');
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

  const handleDeleteRoom = useCallback(
    async (roomId: string) => {
      const res = await fetch(`/api/chat/rooms/${roomId}`, {
        method: 'DELETE',
        headers: authHeaders(deviceId),
      }).catch(() => null);
      const data = res ? await res.json().catch(() => null) : null;
      if (data?.payload?.deleted) {
        setMyRooms((prev) => {
          const updated = prev.filter((r) => r.roomId !== roomId);
          localStorage.setItem('myRooms', JSON.stringify(updated));
          return updated;
        });
        loadRooms();
      } else if (String(data?._error || '').startsWith('FORBIDDEN')) {
        alert('방장만 삭제할 수 있어요.');
      }
    },
    [deviceId, loadRooms]
  );

  const handleBubbleClick = useCallback((msg: Message) => {
    setWordPreviewOpen(false);
    setWordPreviewLoading(false);
    setSelectedMessage(msg);
    setSelectedWord(null);
  }, []);

  const handleWordClick = useCallback(async (msg: Message, word: string, anchor: { x: number; y: number }) => {
    setSelectedMessage(msg);
    setSelectedWord({ word });
    setWordPreviewAnchor(anchor);
    setWordPreviewOpen(true);
    setWordPreviewLoading(true);
    const res = await fetch('/api/phrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ action: 'getWordData', word }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    if (json?.success && json.payload) setSelectedWord(json.payload);
    else setSelectedWord({ word, source: 'not_found' });
    setWordPreviewLoading(false);
  }, []);

  const closeWordPreview = useCallback(() => {
    setWordPreviewOpen(false);
    setWordPreviewLoading(false);
    setSelectedMessage(null);
    setSelectedWord(null);
    setWordPreviewAnchor({ x: 0, y: 0 });
  }, []);

  const openWordModalFromPreview = useCallback(() => {
    setWordPreviewOpen(false);
    setWordPreviewLoading(false);
  }, []);

  const handlePreviewSpeak = useCallback(() => {
    const w = selectedWord?.word;
    if (!w) return;
    const lang = selectedMessage?.sourceLang === 'ko' ? 'vi-VN' : 'ko-KR';
    speakNow(w, lang);
  }, [selectedWord, selectedMessage]);

  const handleDismissOpportunity = useCallback(async (id: string) => {
    dismissedOppRef.current.add(id);
    setOpportunities((prev) => prev.filter((o) => o.id !== id));
    try {
      await fetch(`${COREHUB_OPP_URL}?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'dismissed', opportunity_id: id }),
      });
    } catch {
      /* fail-soft */
    }
  }, []);

  return (
    <div className="app-shell">
      <BrainHeader
        isRoomMode={isRoomMode || !!currentRoomId}
        onRoomToggle={() => {
          if (currentRoomId) handleExitRoom();
          else setIsRoomMode((prev) => !prev);
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
            headers: authHeaders(deviceId),
          }).catch(() => null);
          const data = res ? await res.json().catch(() => null) : null;
          if (data?.payload?.cleared) setMessages([]);
          else if (String(data?._error || '').startsWith('FORBIDDEN'))
            alert('방장만 메시지를 초기화할 수 있어요.');
          else alert('메시지 초기화에 실패했어요.');
        }}
        onShare={async () => {
          if (currentRoomId && currentRoomCode && currentRoomCode !== '------') {
            setShareRoomCode(currentRoomCode);
            setShareRoomId(currentRoomId);
            return;
          }
          await navigator.share?.({ title: 'BRAINPOOL', text: 'CORE-RING', url: location.href }).catch(() => {});
        }}
      />

      <div className={styles.tabs} role="tablist">
        <button
          className={`${styles.tabBtn} ${activeTab === 'ring' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('ring')}
          role="tab"
          aria-selected={activeTab === 'ring'}
        >
          CoreRing
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'phrase' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('phrase')}
          role="tab"
          aria-selected={activeTab === 'phrase'}
        >
          CorePhrase
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'kiip' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('kiip')}
          role="tab"
          aria-selected={activeTab === 'kiip'}
        >
          KIIP 연습
        </button>
      </div>

      <div className={styles.main} ref={chatRef}>
        {activeTab === 'phrase' ? (
          <CorePhrase userId={deviceId} />
        ) : activeTab === 'kiip' ? (
          <KiipPractice deviceId={deviceId} />
        ) : (
          <>
            <OpportunityBanner items={opportunities} onDismiss={handleDismissOpportunity} />
            {showDaily && !currentRoomId && (
              <div className={styles.daily}>
                <div className={styles.dailyWord}>{dailyWord.word}</div>
                <div className={styles.dailyMeaning}>{dailyWord.meaning}</div>
                {dailyWord.usage && <div className={styles.dailyUsage}>{dailyWord.usage}</div>}
                {dailyWord.culturalNote && (
                  <div className={styles.dailyNote}>{dailyWord.culturalNote}</div>
                )}
              </div>
            )}
            {isRoomMode && !currentRoomId && (
              <RoomList
                rooms={rooms}
                myRooms={myRooms}
                deviceId={deviceId}
                onSelect={(room) => {
                  setMessages([]);
                  setCurrentRoomId(room.roomId);
                  setCurrentRoomCode(room.inviteCode || '------');
                  saveMyRoom(room);
                  setIsRoomMode(false);
                }}
                onJoinCode={handleJoinByCode}
                onDelete={handleDeleteRoom}
                onCreate={async (title) => {
                  const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: authHeaders(deviceId, {
                      'Content-Type': 'application/json; charset=utf-8',
                    }),
                    body: JSON.stringify({
                      action: 'create',
                      title,
                      createdBy: deviceId,
                      isPublic: true,
                    }),
                  }).catch(() => null);
                  const data = res ? await res.json().catch(() => null) : null;
                  if (data?.payload?.room) {
                    const room = data.payload.room;
                    setMessages([]);
                    setCurrentRoomId(room.roomId);
                    setCurrentRoomCode(room.inviteCode || '------');
                    saveMyRoom(room);
                    setIsRoomMode(false);
                    loadRooms();
                  }
                }}
              />
            )}
            {currentRoomId && (
              <RoomBar
                code={currentRoomCode}
                onExit={handleExitRoom}
                onShare={() => {
                  setShareRoomCode(currentRoomCode);
                  setShareRoomId(currentRoomId);
                }}
              />
            )}
            {showRoomBanner && !currentRoomId && !isRoomMode && (
              <div className={styles.roomBanner}>
                양방향 대화가 감지됐어요. 방을 만들어 대화를 이어가 보세요.
                <button type="button" onClick={() => setIsRoomMode(true)}>
                  방 만들기
                </button>
              </div>
            )}
            <div className={styles.messages}>
              {messages.map((m) => (
                <ChatBubble
                  key={m.messageId}
                  message={m}
                  isMine={m.userId === deviceId}
                  onClick={() => handleBubbleClick(m)}
                  onWordClick={handleWordClick}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {activeTab === 'ring' && (
        <ChatInput onSend={handleSend} disabled={isLoading} />
      )}

      {selectedMessage && !wordPreviewOpen && selectedWord && (
        <WordModal
          message={selectedMessage}
          word={selectedWord}
          onClose={() => {
            setSelectedMessage(null);
            setSelectedWord(null);
          }}
        />
      )}

      {wordPreviewOpen && (
        <WordPreviewSheet
          open={wordPreviewOpen}
          loading={wordPreviewLoading}
          word={selectedWord}
          anchor={wordPreviewAnchor}
          onClose={closeWordPreview}
          onOpenModal={openWordModalFromPreview}
          onSpeak={handlePreviewSpeak}
        />
      )}

      {shareRoomCode && (
        <ShareRoomModal
          code={shareRoomCode}
          roomId={shareRoomId}
          onClose={() => {
            setShareRoomCode(null);
            setShareRoomId(null);
          }}
        />
      )}

      {showIOSGuide && (
        <div className={styles.iosGuide} onClick={() => setShowIOSGuide(false)}>
          <div className={styles.iosCard} onClick={(e) => e.stopPropagation()}>
            <p>홈 화면에 추가하려면 공유 → 홈 화면에 추가를 눌러 주세요.</p>
            <button type="button" onClick={() => setShowIOSGuide(false)}>
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
