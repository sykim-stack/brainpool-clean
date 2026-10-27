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

/** 텍스트 문자 기반 언어 추정. 한글 우선 → 베트남어 부호 → 라틴(VI) → ko */
const detectSpeechLang = (text: string): string => {
  if (/[가-힣]/.test(text)) return 'ko-KR';
  if (/[ĂÂÊÔƠƯăâêôơưĐđàáảãạèéẻẽẹìíỉĩịòóỏõọùúủũụỳýỷỹỵ]/.test(text)) return 'vi-VN';
  if (/[a-zA-Z]/.test(text)) return 'vi-VN';
  return 'ko-KR';
};

const langCode = (lang: LearningLanguage) => (lang === 'ko' ? 'ko-KR' : 'vi-VN');

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
    setStudyIndex((prev) => prev + 1);
  };

  const startStudy = () => {
    setStudyIndex(0);
    setFlipped(false);
    setStudiedToday(0);
    setMode('study');
  };

  const today = new Date().toISOString().split('T')[0];
  const reviewCount = items.filter((i) => i.review_at && i.review_at.split('T')[0] <= today).length;
  const streakDays = (() => {
    const days = [
      ...new Set(items.filter((i) => i.review_at).map((i) => i.review_at!.split('T')[0])),
    ].sort()
      .reverse();
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 60; i++) {
      const key = d.toISOString().split('T')[0];
      if (days.includes(key)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else if (i === 0) {
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return streak;
  })();

  const filteredItems = items.filter((item) => {
    if (filter === 'bookmarked') return item.is_bookmarked;
    if (filter === 'review') return item.review_at && item.review_at.split('T')[0] <= today;
    return true;
  });

  const studyItems = filteredItems;
  const currentCard = studyItems[studyIndex];
  const meaningText = currentCard?.memo || currentCard?.meaning_kr || '';

  const statusLabel = (s: string) => {
    if (s === 'done') return copy('status.done');
    if (s === 'learning') return copy('status.learning');
    return copy('status.new');
  };

  if (mode === 'study') {
    if (!currentCard || studyIndex >= studyItems.length) {
      return (
        <div className={styles.studyWrap}>
          <h2>{copy('study.doneTitle')}</h2>
          <p>{copy('study.doneCount', { count: studiedToday })}</p>
          <button
            className={styles.studyBackBtn}
            onClick={() => {
              setMode('list');
              setListPanel('vocab');
            }}
          >
            {copy('study.backToList')}
          </button>
        </div>
      );
    }

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
              <div className={styles.flipTop}>
                <p className={styles.flipLabel}>{copy('card.expression')}</p>
                <button
                  type="button"
                  className={styles.speakBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    const text = currentCard?.word || '';
                    speakNow(text, langCode(learningDirection.source));
                  }}
                  aria-label={copy('audio.listen')}
                >
                  🔊
                </button>
              </div>
              <p className={styles.flipWord}>{currentCard?.word}</p>
              <p className={styles.flipHint}>{copy('card.revealHint')}</p>
            </div>
            <div className={styles.flipBack}>
              <div className={styles.flipTop}>
                <p className={styles.flipLabel}>{copy('card.meaning')}</p>
                <button
                  type="button"
                  className={styles.speakBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    speakNow(meaningText, langCode(learningDirection.target));
                  }}
                  aria-label={copy('audio.listen')}
                >
                  🔊
                </button>
              </div>
              <p className={styles.flipWord}>{meaningText}</p>
            </div>
          </div>
        </div>
        <div className={styles.studyActions}>
          <button className={styles.dontKnowBtn} onClick={() => void handleDontKnow(currentCard)}>
            {copy('answer.dontKnow')}
          </button>
          <button className={styles.knowBtn} onClick={() => void handleKnow(currentCard)}>
            {copy('answer.know')}
          </button>
        </div>
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
        <div className={styles.settingsPanel}>
          <label className={styles.settingRow}>
            <span>{copy('settings.uiLanguage')}</span>
            <select
              value={uiLocale}
              onChange={(event) => handleUiLocaleChange(event.target.value as 'ko' | 'vi')}
            >
              <option value="ko">한국어</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </label>
          <label className={styles.settingRow}>
            <span>{copy('settings.learningDirection')}</span>
            <select
              value={`${learningDirection.source}-${learningDirection.target}`}
              onChange={(event) =>
                handleLearningDirectionChange(event.target.value as 'ko-vi' | 'vi-ko')
              }
            >
              <option value="ko-vi">한국어 → Tiếng Việt</option>
              <option value="vi-ko">Tiếng Việt → 한국어</option>
            </select>
          </label>
        </div>
      ) : null}

      {listPanel === 'vocab' ? (
        <>
          <div className={styles.stats}>
            <div>
              <strong>{items.length}</strong>
              <span>{copy('stats.total')}</span>
            </div>
            <div>
              <strong>{items.filter((i) => i.learn_status === 'done').length}</strong>
              <span>{copy('stats.done')}</span>
            </div>
            <div>
              <strong>{reviewCount}</strong>
              <span>{copy('stats.reviewToday')}</span>
            </div>
            <div>
              <strong>{streakDays}</strong>
              <span>{copy('stats.streak')}</span>
            </div>
          </div>

          <div className={styles.filters}>
            <button
              type="button"
              className={filter === 'all' ? styles.filterActive : styles.filterBtn}
              onClick={() => setFilter('all')}
            >
              {copy('filter.all')}
            </button>
            <button
              type="button"
              className={filter === 'bookmarked' ? styles.filterActive : styles.filterBtn}
              onClick={() => setFilter('bookmarked')}
            >
              {copy('filter.bookmarked')}
            </button>
            <button
              type="button"
              className={filter === 'review' ? styles.filterActive : styles.filterBtn}
              onClick={() => setFilter('review')}
            >
              {copy('filter.review')}
            </button>
          </div>

          <button
            type="button"
            className={styles.studyStart}
            onClick={startStudy}
            disabled={!filteredItems.length}
          >
            {copy('study.startCount', { count: filteredItems.length })}
          </button>

          {isLoading ? (
            <p className={styles.empty}>{copy('loading')}</p>
          ) : filteredItems.length === 0 ? (
            <div className={styles.empty}>
              <p>{copy('empty.noItems')}</p>
              <p>{copy('empty.hint')}</p>
            </div>
          ) : (
            <ul className={styles.list}>
              {filteredItems.map((item) => (
                <li key={item.id} className={styles.card}>
                  {editingId === item.id ? (
                    <div className={styles.editBox}>
                      <input
                        value={editMeaning}
                        onChange={(e) => setEditMeaning(e.target.value)}
                        placeholder={copy('edit.meaningPlaceholder')}
                      />
                      <textarea
                        value={editMemo}
                        onChange={(e) => setEditMemo(e.target.value)}
                        placeholder={copy('edit.memoPlaceholder')}
                      />
                      <div className={styles.editActions}>
                        <button type="button" onClick={() => void saveEdit(item)}>
                          {copy('edit.save')}
                        </button>
                        <button type="button" onClick={() => setEditingId(null)}>
                          {copy('edit.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles.cardTop}>
                        <div className={styles.wordRow}>
                          <strong>{item.word}</strong>
                          <button
                            type="button"
                            className={styles.speakBtnInline}
                            onClick={() => speakNow(item.word, detectSpeechLang(item.word))}
                            aria-label={copy('audio.listen')}
                          >
                            🔊
                          </button>
                        </div>
                        <div className={styles.cardActions}>
                          <button type="button" onClick={() => startEdit(item)}>
                            {copy('edit.action')}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void updateItem(item, { is_bookmarked: !item.is_bookmarked })
                            }
                          >
                            {item.is_bookmarked ? copy('item.unbookmark') : copy('item.bookmark')}
                          </button>
                          <button type="button" onClick={() => void deleteItem(item)}>
                            {copy('item.delete')}
                          </button>
                        </div>
                      </div>
                      {item.meaning_kr ? (
                        <span className={styles.meaningRow}>
                          <span className={styles.meaning}>{item.meaning_kr}</span>
                          <button
                            type="button"
                            className={styles.speakBtnInline}
                            onClick={() =>
                              speakNow(item.meaning_kr || '', detectSpeechLang(item.meaning_kr || ''))
                            }
                            aria-label={copy('audio.listen')}
                          >
                            🔊
                          </button>
                        </span>
                      ) : null}
                      {item.memo ? (
                        <span className={styles.meaningRow}>
                          <span className={styles.memo}>{item.memo}</span>
                          <button
                            type="button"
                            className={styles.speakBtnInline}
                            onClick={() => speakNow(item.memo || '', detectSpeechLang(item.memo || ''))}
                            aria-label={copy('audio.listen')}
                          >
                            🔊
                          </button>
                        </span>
                      ) : null}
                      <span className={styles.status}>{statusLabel(item.learn_status)}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
