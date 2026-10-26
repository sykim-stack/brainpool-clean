'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './CorePhrase.module.css';
import { speakNow } from '@/lib/tts';
import {
  getLearningDirection,
  getUiLocale,
  setLearningDirection,
  setUiLocale,
  type LearningLanguage,
} from '@/lib/locale';
import { t, type CorePhraseMessageKey } from '@/lib/i18n/messages';

// word 필드가 한국어/베트남어 어느 쪽이든 저장될 수 있어(원문 메시지 그대로
// 저장되는 구조), 재생 직전에 한글 포함 여부로 언어를 판단한다.
// (brain-engine/engines/language/detect.js와 동일한 감지 방식)
const detectSpeechLang = (text: string) => (/[가-힣]/.test(text) ? 'ko-KR' : 'vi-VN');

interface VocabItem {
  id: string;
  word: string;
  meaning_kr?: string;
  memo?: string;
  learn_status: string;
  is_bookmarked: boolean;
  created_at: string;
  source_session_id?: string;
  review_at?: string;
}

interface CorePhraseProps {
  userId: string;
}

type ViewMode = 'list' | 'study';
type ListPanel = 'vocab' | 'settings';

export default function CorePhrase({ userId }: CorePhraseProps) {
  const [items, setItems] = useState<VocabItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>('list');
  const [listPanel, setListPanel] = useState<ListPanel>('vocab');
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState<'all' | 'bookmarked' | 'review'>('all');
  const [studiedToday, setStudiedToday] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMemo, setEditMemo] = useState('');
  const [editMeaning, setEditMeaning] = useState('');
  const [uiLocale, setCurrentUiLocale] = useState<'ko' | 'vi'>('ko');
  const [learningDirection, setCurrentLearningDirection] = useState<{
    source: LearningLanguage;
    target: LearningLanguage;
  }>({ source: 'ko', target: 'vi' });

  const copy = (key: CorePhraseMessageKey, values?: Record<string, string | number>) =>
    t(key, uiLocale, values);

  const handleUiLocaleChange = (locale: 'ko' | 'vi') => {
    setUiLocale(locale);
    setCurrentUiLocale(locale);
  };

  const handleLearningDirectionChange = (value: 'ko-vi' | 'vi-ko') => {
    const [source, target] = value.split('-') as [LearningLanguage, LearningLanguage];
    setCurrentLearningDirection(setLearningDirection(source, target));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentUiLocale(getUiLocale() === 'vi' ? 'vi' : 'ko');
      setCurrentLearningDirection(getLearningDirection());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const fetchVocab = useCallback(async () => {
    setIsLoading(true);
    const res = await fetch('/api/phrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ action: 'get-user-vocabulary', user_id: userId }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setIsLoading(false);
      return;
    }
    const json = await res.json().catch(() => null);
    if (json?.success && Array.isArray(json.payload)) setItems(json.payload);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchVocab();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchVocab]);

  const updateItem = async (item: VocabItem, fields: Record<string, unknown>) => {
    await fetch('/api/phrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ action: 'update-vocabulary', id: item.id, user_id: userId, ...fields }),
    }).catch(() => null);
    fetchVocab();
  };

  const deleteItem = async (item: VocabItem) => {
    await fetch('/api/phrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ action: 'delete-vocabulary', id: item.id, user_id: userId }),
    }).catch(() => null);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const startEdit = (item: VocabItem) => {
    setEditingId(item.id);
    setEditMeaning(item.meaning_kr || '');
    setEditMemo(item.memo || '');
  };

  const saveEdit = async (item: VocabItem) => {
    await updateItem(item, { meaning_kr: editMeaning, memo: editMemo });
    setEditingId(null);
  };

  const handleKnow = async (item: VocabItem) => {
    const reviewAt = new Date();
    reviewAt.setDate(reviewAt.getDate() + 7);
    await updateItem(item, { learn_status: 'done', review_at: reviewAt.toISOString() });
    setStudiedToday((prev) => prev + 1);
    nextCard();
  };

  const handleDontKnow = async (item: VocabItem) => {
    const reviewAt = new Date();
    reviewAt.setDate(reviewAt.getDate() + 1);
    await updateItem(item, { learn_status: 'learning', review_at: reviewAt.toISOString() });
    setStudiedToday((prev) => prev + 1);
    nextCard();
  };

  const nextCard = () => {
    setFlipped(false);
    setTimeout(() => setStudyIndex((prev) => prev + 1), 200);
  };

  const startStudy = () => {
    setStudyIndex(0);
    setFlipped(false);
    setMode('study');
  };

  const today = new Date().toISOString().split('T')[0];

  const totalCount = items.length;
  const doneCount = items.filter((i) => i.learn_status === 'done').length;
  const reviewCount = items.filter((i) => i.review_at && i.review_at.split('T')[0] <= today).length;
  const streakDays = (() => {
    const dates = [
      ...new Set(items.filter((i) => i.review_at).map((i) => i.review_at!.split('T')[0])),
    ]
      .sort()
      .reverse();
    let streak = 0;
    let cursor = new Date();
    for (const d of dates) {
      const diff = Math.round((cursor.getTime() - new Date(d).getTime()) / 86400000);
      if (diff <= 1) {
        streak++;
        cursor = new Date(d);
      } else break;
    }
    return streak;
  })();

  const filteredItems = items.filter((item) => {
    if (filter === 'bookmarked') return item.is_bookmarked;
    if (filter === 'review') return item.review_at && item.review_at.split('T')[0] <= today;
    return true;
  });

  const studyItems = filteredItems.filter((i) => i.learn_status !== 'done');
  const currentCard = studyItems[studyIndex];
  const isDone = studyIndex >= studyItems.length;

  const statusLabel: Record<string, string> = {
    new: copy('status.new'),
    learning: copy('status.learning'),
    done: copy('status.done'),
  };

  if (isLoading) return <div className={styles.empty}>{copy('loading')}</div>;

  if (mode === 'study') {
    if (isDone)
      return (
        <div className={styles.studyDone}>
          <p className={styles.studyDoneEmoji}>🎉</p>
          <p className={styles.studyDoneText}>{copy('study.doneTitle')}</p>
          <p className={styles.studyDoneSub}>{copy('study.doneCount', { count: studiedToday })}</p>
          <button
            className={styles.studyBackBtn}
            onClick={() => {
              setMode('list');
              setListPanel('vocab');
              setStudiedToday(0);
            }}
          >
            {copy('study.backToList')}
          </button>
        </div>
      );
    return (
      <div className={styles.studyWrap}>
        <div className={styles.studyHeader}>
          <button className={styles.studyBackBtn} onClick={() => setMode('list')}>
            {copy('study.back')}
          </button>
          <span className={styles.studyProgress}>
            {studyIndex + 1} / {studyItems.length}
          </span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${(studyIndex / Math.max(studyItems.length, 1)) * 100}%` }}
          />
        </div>
        <div
          className={`${styles.flipCard} ${flipped ? styles.flipped : ''}`}
          onClick={() => setFlipped((prev) => !prev)}
        >
          <div className={styles.flipInner}>
            <div className={styles.flipFront}>
              <p className={styles.flipLabel}>{copy('card.expression')}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <p className={styles.flipWord} style={{ margin: 0 }}>
                  {currentCard?.word}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakNow(currentCard?.word || '', detectSpeechLang(currentCard?.word || ''));
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '20px',
                    flexShrink: 0,
                  }}
                  aria-label={copy('audio.listen')}
                >
                  🔊
                </button>
              </div>
              <p className={styles.flipHint}>{copy('card.revealHint')}</p>
            </div>
            <div className={styles.flipBack}>
              <p className={styles.flipLabel}>{copy('card.meaning')}</p>
              <p className={styles.flipWord}>{currentCard?.memo || currentCard?.meaning_kr}</p>
            </div>
          </div>
        </div>
        {flipped && (
          <div className={styles.studyBtns}>
            <button
              className={styles.dontKnowBtn}
              onClick={() => currentCard && handleDontKnow(currentCard)}
            >
              {copy('answer.dontKnow')}
            </button>
            <button className={styles.knowBtn} onClick={() => currentCard && handleKnow(currentCard)}>
              {copy('answer.know')}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.subTabs} role="tablist" aria-label={copy('settings.group')}>
        <button
          type="button"
          role="tab"
          aria-selected={listPanel === 'vocab'}
          className={`${styles.subTab} ${listPanel === 'vocab' ? styles.subTabActive : ''}`}
          onClick={() => setListPanel('vocab')}
        >
          {copy('tab.vocab')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={listPanel === 'settings'}
          className={`${styles.subTab} ${listPanel === 'settings' ? styles.subTabActive : ''}`}
          onClick={() => setListPanel('settings')}
        >
          {copy('tab.settings')}
        </button>
      </div>

      {listPanel === 'settings' ? (
        <div className={styles.preferences} role="group" aria-label={copy('settings.group')}>
          <label className={styles.preferenceRow}>
            <span>{copy('settings.uiLanguage')}</span>
            <select
              className={styles.preferenceSelect}
              value={uiLocale}
              onChange={(event) => handleUiLocaleChange(event.target.value as 'ko' | 'vi')}
            >
              <option value="ko">한국어</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </label>
          <label className={styles.preferenceRow}>
            <span>{copy('settings.learningDirection')}</span>
            <select
              className={styles.preferenceSelect}
              value={`${learningDirection.source}-${learningDirection.target}`}
              onChange={(event) => handleLearningDirectionChange(event.target.value as 'ko-vi' | 'vi-ko')}
            >
              <option value="ko-vi">한국어 → Tiếng Việt</option>
              <option value="vi-ko">Tiếng Việt → 한국어</option>
            </select>
          </label>
        </div>
      ) : (
        <>
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statNum}>{totalCount}</span>
              <span className={styles.statLabel}>{copy('stats.total')}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNum}>{doneCount}</span>
              <span className={styles.statLabel}>{copy('stats.done')}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNum}>{reviewCount}</span>
              <span className={styles.statLabel}>{copy('stats.reviewToday')}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNum}>
                {streakDays}
                <span className={styles.statNumAccent} aria-hidden>
                  🔥
                </span>
              </span>
              <span className={styles.statLabel}>{copy('stats.streak')}</span>
            </div>
          </div>

          <div className={styles.toolbar}>
            <div className={styles.filters}>
              <button
                className={`${styles.filterBtn} ${filter === 'all' ? styles.filterActive : ''}`}
                onClick={() => setFilter('all')}
              >
                {copy('filter.all')} {items.length}
              </button>
              <button
                className={`${styles.filterBtn} ${filter === 'bookmarked' ? styles.filterActive : ''}`}
                onClick={() => setFilter('bookmarked')}
              >
                {copy('filter.bookmarked')} {items.filter((i) => i.is_bookmarked).length}
              </button>
              <button
                className={`${styles.filterBtn} ${filter === 'review' ? styles.filterActive : ''}`}
                onClick={() => setFilter('review')}
              >
                {copy('filter.review')} {reviewCount}
              </button>
            </div>
            <button
              className={styles.studyStartBtn}
              onClick={startStudy}
              disabled={studyItems.length === 0}
            >
              {studyItems.length > 0
                ? copy('study.startCount', { count: studyItems.length })
                : copy('study.start')}
            </button>
          </div>

          {filteredItems.length === 0 ? (
            <div className={styles.empty}>
              <p>{copy('empty.noItems')}</p>
              <p className={styles.emptySub}>{copy('empty.hint')}</p>
            </div>
          ) : (
            <div className={styles.list}>
              {filteredItems.map((item) => (
                <div key={item.id} className={styles.card}>
                  {editingId === item.id ? (
                    <div className={styles.editBox}>
                      <p className={styles.editWord}>{item.word}</p>
                      <input
                        className={styles.editInput}
                        value={editMeaning}
                        onChange={(e) => setEditMeaning(e.target.value)}
                        placeholder={copy('edit.meaningPlaceholder')}
                      />
                      <textarea
                        className={styles.editTextarea}
                        value={editMemo}
                        onChange={(e) => setEditMemo(e.target.value)}
                        placeholder={copy('edit.memoPlaceholder')}
                        rows={2}
                      />
                      <div className={styles.editBtns}>
                        <button className={styles.editSaveBtn} onClick={() => saveEdit(item)}>
                          {copy('edit.save')}
                        </button>
                        <button className={styles.editCancelBtn} onClick={() => setEditingId(null)}>
                          {copy('edit.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles.cardTop}>
                        <div className={styles.words}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                            <span className={styles.word}>{item.word}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                speakNow(item.word, detectSpeechLang(item.word));
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '16px',
                                opacity: 0.7,
                                flexShrink: 0,
                                marginTop: 2,
                              }}
                              aria-label={copy('audio.listen')}
                            >
                              🔊
                            </button>
                          </div>
                          {item.meaning_kr && <span className={styles.meaning}>{item.meaning_kr}</span>}
                          {item.memo && <span className={styles.memo}>{item.memo}</span>}
                        </div>
                        <button
                          className={`${styles.bookmark} ${item.is_bookmarked ? styles.bookmarked : ''}`}
                          onClick={() => updateItem(item, { is_bookmarked: !item.is_bookmarked })}
                          aria-label={item.is_bookmarked ? copy('item.unbookmark') : copy('item.bookmark')}
                        >
                          {item.is_bookmarked ? '♥' : '♡'}
                        </button>
                      </div>
                      <div className={styles.cardBottom}>
                        <button
                          className={styles.statusBtn}
                          onClick={() => {
                            const next: Record<string, string> = {
                              new: 'learning',
                              learning: 'done',
                              done: 'new',
                            };
                            updateItem(item, { learn_status: next[item.learn_status] || 'new' });
                          }}
                        >
                          {statusLabel[item.learn_status] || copy('status.new')}
                        </button>
                        <div className={styles.cardActions}>
                          <button
                            className={styles.editBtn}
                            onClick={() => startEdit(item)}
                            aria-label={copy('edit.action')}
                          >
                            ✎
                          </button>
                          <button className={styles.deleteBtn} onClick={() => deleteItem(item)}>
                            {copy('item.delete')}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
