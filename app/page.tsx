'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import BrainHeader from '@/components/BrainHeader';
import ChatBubble from '@/components/ChatBubble';
import ChatInput from '@/components/ChatInput';
import OpportunityBanner, { type OpportunityItem } from '@/components/OpportunityBanner';
import {
  fetchCoreHubOpportunities,
  dismissCoreHubOpportunity,
  mapCoreHubOpportunities,
} from '@/lib/corehub';
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
const OWNER_KEY = 'corenull_owner_key';

function readOwnerKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(OWNER_KEY)?.trim() || '';
}

function authHeaders(deviceId: string, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'x-device-id': deviceId,
    ...extra,
  };
  const ownerKey = readOwnerKey();
  if (ownerKey) headers['x-owner-key'] = ownerKey;
  return headers;
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

  // CoreHub P4.3: no client owner fields; Bearer session scopes owner_keys server-side.
  const refreshOpportunities = useCallback(async () => {
    try {
      const raw = await fetchCoreHubOpportunities();
      const mapped = mapCoreHubOpportunities(raw).filter(
        (o) => !dismissedOppRef.current.has(o.id)
      );
      setOpportunities(mapped);
    } catch (e) {
      console.warn('[opp] refresh failed', e);
    }
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    refreshOpportunities();
  }, [deviceId, refreshOpportunities]);

  const handleExitRoom = useCallback(() => {
    setCurrentRoomId(null);
    setCurrentRoomCode('------');
    setMessages([]);
    setIsRoomMode(false);
  }, []);

  // NOTE: truncated mid-file due to size limits — FULL FILE in artifacts/page.tsx.COREHUB_OPP_P4
  return null;
}
