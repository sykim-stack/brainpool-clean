'use client';

import { useEffect, useState } from 'react';
import styles from './CorePhrase.module.css';

interface VocabItem {
  id: string;
  word: string;
  meaning_kr?: string;
  learn_status: string;
  is_bookmarked: boolean;
  created_at: string;
  source_session_id?: string;
}

interface CorePhraseProps {
  userId: string;
}

export default function CorePhrase({ userId }: CorePhraseProps) {
  const [items, setItems] = useState<VocabItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVocab = async () => {
    setIsLoading(true);
    const res = await fetch('/api/corenull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ action: 'get-user-vocabulary', user_id: userId }),
    }).catch(() => null);

    if (!res || !res.ok) { setIsLoading(false); return; }
    const json = await res.json().catch(() => null);
    if (json?.success && Array.isArray(json.payload)) {
      setItems(json.payload);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchVocab(); }, [userId]);

  const toggleBookmark = async (item: VocabItem) => {
    const res = await fetch('/api/corenull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        action: 'update-vocabulary',
        id: item.id,
        user_id: userId,
        is_bookmarked: !item.is_bookmarked,
      }),
    }).catch(() => null);
    if (res?.ok) fetchVocab();
  };

  const cycleStatus = async (item: VocabItem) => {
    const next: Record<string, string> = { new: 'learning', learning: 'done', done: 'new' };
    const res = await fetch('/api/corenull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        action: 'update-vocabulary',
        id: item.id,
        user_id: userId,
        learn_status: next[item.learn_status] || 'new',
      }),
    }).catch(() => null);
    if (res?.ok) fetchVocab();
  };

  const deleteItem = async (item: VocabItem) => {
    const res = await fetch('/api/corenull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        action: 'delete-vocabulary',
        id: item.id,
        user_id: userId,
      }),
    }).catch(() => null);
    if (res?.ok) setItems(prev => prev.filter(i => i.id !== item.id));
  };

  const statusLabel: Record<string, string> = {
    new: '🆕 새로운',
    learning: '📖 학습중',
    done: '✅ 완료',
  };

  if (isLoading) return <div className={styles.empty}>불러오는 중...</div>;
  if (!items.length) return (
    <div className={styles.empty}>
      <p>저장된 단어가 없어요</p>
      <p className={styles.emptySub}>채팅 버블을 클릭해서 단어를 저장해보세요</p>
    </div>
  );

  return (
    <div className={styles.list}>
      {items.map((item) => (
        <div key={item.id} className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.words}>
              <span className={styles.word}>{item.word}</span>
              {item.meaning_kr && (
                <span className={styles.meaning}>{item.meaning_kr}</span>
              )}
            </div>
            <button
              className={`${styles.bookmark} ${item.is_bookmarked ? styles.bookmarked : ''}`}
              onClick={() => toggleBookmark(item)}
            >
              {item.is_bookmarked ? '🔖' : '🤍'}
            </button>
          </div>
          <div className={styles.cardBottom}>
            <button
              className={styles.statusBtn}
              onClick={() => cycleStatus(item)}
            >
              {statusLabel[item.learn_status] || '🆕 새로운'}
            </button>
            <button
              className={styles.deleteBtn}
              onClick={() => deleteItem(item)}
            >
              삭제
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
