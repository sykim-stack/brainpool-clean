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

/** 텍스트 문자 기반 언어 추정. 한글 우선, 없으면 베트남어 부호, 그다음 기본 vi. */
const detectSpeechLang = (text: string): string => {
  if (/[가-힣]/.test(text)) return 'ko-KR';
  if (/[ĂÂÊÔƠƯăâêôơưĐđàáảãạèéẻẽẹìíỉĩịòóỏõọùúủũụỳýỷỹỵ]/.test(text)) return 'vi-VN';
  // 학습 해설이 무부호 라틴만 있어도 VI 쪽으로 (KO 기본 음성 오용 방지)
  if (/[a-zA-Z]/.test(text)) return 'vi-VN';
  return 'ko-KR';
};

const langCode = (lang: LearningLanguage) => (lang === 'ko' ? 'ko-KR' : 'vi-VN');

type LearnStatus = 'new' | 'learning' | 'done';
type PhraseItem = {
  id: string;
  word: string;
  meaning_kr?: string;
  memo?: string;
  learn_status?: LearnStatus;
  is_bookmarked?: boolean;
  review_at?: string | null;
  source_session_id?: string;
};

interface CorePhraseProps {
  deviceId: string;
  locale?: string;
}

export default function CorePhrase({ deviceId, locale: localeProp }: CorePhraseProps) {
  const [items, setItems] = useState<PhraseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uiLocale, setUiLocaleState] = useState<'ko' | 'vi'>(() =>
    localeProp === 'vi' ? 'vi' : 'ko'
  );
  const [learningDirection, setCurrentLearningDirection] = useState<{
    source: LearningLanguage;
    target: LearningLanguage;
  }>({ source: 'ko', target: 'vi' });
  const [listPanel, setListPanel] = useState<'vocab' | 'settings'>('vocab');
  const [filter, setFilter] = useState<'all' | 'bookmarked' | 'review'>('all');
  const [mode, setMode] = useState<'list' | 'study'>('list');
  const [studyItems, setStudyItems] = useState<PhraseItem[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [studiedToday, setStudiedToday] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMeaning, setEditMeaning] = useState('');
  const [editMemo, setEditMemo] = useState('');

  const copy = useCallback(
    (key: CorePhraseMessageKey, values?: Record<string, string | number>) => t(key, uiLocale, values),
    [uiLocale],
  );

  const handleUiLocaleChange = (value: 'ko' | 'vi') => {
    setUiLocaleState(setUiLocale(value) === 'vi' ? 'vi' : 'ko');
  };

  const handleLearningDirectionChange = (value: 'ko-vi' | 'vi-ko') => {
    const [source, target] = value.split('-') as [LearningLanguage, LearningLanguage];
    setCurrentLearningDirection(setLearningDirection(source, target));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUiLocaleState(getUiLocale() === 'vi' ? 'vi' : 'ko');
      setCurrentLearningDirection(getLearningDirection());
    }, 0);
    return () => window.clearTimeout(timer);
  }, [localeProp]);

  const loadItems = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/corephrase', {
        headers: { 'x-device-id': deviceId },
      });
      const json = await res.json().catch(() => null);
      if (json?.success && Array.isArray(json.items)) {
        setItems(json.items);
      } else if (Array.isArray(json)) {
        setItems(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const updateItem = async (item: PhraseItem, patch: Partial<PhraseItem>) => {
    const res = await fetch('/api/corephrase', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': deviceId,
      },
      body: JSON.stringify({ id: item.id, ...patch }),
    });
    if (!res.ok) return;
    setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, ...patch } : row)));
    setStudyItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, ...patch } : row)));
  };

  const startEdit = (item: PhraseItem) => {
    setEditingId(item.id);
    setEditMeaning(item.meaning_kr || '');
    setEditMemo(item.memo || '');
  };

  const saveEdit = async (item: PhraseItem) => {
    await updateItem(item, { meaning_kr: editMeaning, memo: editMemo });
    setEditingId(null);
  };

  const deleteItem = async (item: PhraseItem) => {
    const res = await fetch('/api/corephrase', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': deviceId,
      },
      body: JSON.stringify({ id: item.id }),
    });
    if (!res.ok) return;
    setItems((prev) => prev.filter((row) => row.id !== item.id));
  };

  const toggleBookmark = async (item: PhraseItem) => {
    await updateItem(item, { is_bookmarked: !item.is_bookmarked });
  };

  const markAnswer = async (know: boolean) => {
    const current = studyItems[studyIndex];
    if (!current) return;
    const reviewAt = new Date();
    if (know) {
      reviewAt.setDate(reviewAt.getDate() + 3);
      await updateItem(current, { learn_status: 'done', review_at: reviewAt.toISOString() });
    } else {
      reviewAt.setDate(reviewAt.getDate() + 1);
      await updateItem(current, { learn_status: 'learning', review_at: reviewAt.toISOString() });
    }
    setStudiedToday((n) => n + 1);
    setFlipped(false);
    if (studyIndex >= studyItems.length - 1) {
      setStudyIndex(studyItems.length);
    } else {
      setStudyIndex((i) => i + 1);
    }
  };

  const startStudy = () => {
    const pool =
      filter === 'bookmarked'
        ? items.filter((i) => i.is_bookmarked)
        : filter === 'review'
          ? items.filter((i) => i.learn_status === 'learning' || i.learn_status === 'new')
          : items;
    if (!pool.length) return;
    setStudyItems(pool);
    setStudyIndex(0);
    setFlipped(false);
    setStudiedToday(0);
    setMode('study');
  };

  const filtered = items.filter((item) => {
    if (filter === 'bookmarked') return item.is_bookmarked;
    if (filter === 'review') return item.learn_status === 'learning' || item.learn_status === 'new';
    return true;
  });

  const stats = {
    total: items.length,
    done: items.filter((i) => i.learn_status === 'done').length,
    review: items.filter((i) => i.learn_status === 'learning' || i.learn_status === 'new').length,
  };

  const statusLabel: Record<LearnStatus, string> = {
    new: copy('status.new'),
    learning: copy('status.learning'),
    done: copy('status.done'),
  };

  if (!deviceId) {
    return <div className={styles.empty}>{copy('loading')}</div>;
  }

  if (mode === 'study') {
    if (studyIndex >= studyItems.length) {
      return (
        <div className={styles.studyWrap}>
          <h2>{copy('study.doneTitle')}</h2>
          <p>{copy('study.doneCount', { count: studiedToday })}</p>
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
    }

    const currentCard = studyItems[studyIndex];
    const meaningText = currentCard?.memo || currentCard?.meaning_kr || '';

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
                    // 앞면 = 학습 소스 언어 (KO→VI면 한국어)
                    speakNow(text, langCode(learningDirection.source) || detectSpeechLang(text));
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
                    // 뒷면(해설) = 학습 타깃 언어 (KO→VI면 베트남어 음성)
                    const lang = langCode(learningDirection.target);
                    speakNow(meaningText, lang);
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
          <button className={styles.dontKnowBtn} onClick={() => void markAnswer(false)}>
            {copy('answer.dontKnow')}
          </button>
          <button className={styles.knowBtn} onClick={() => void markAnswer(true)}>
            {copy('answer.know')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.subTabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={listPanel === 'vocab'}
          className={listPanel === 'vocab' ? styles.subTabActive : styles.subTab}
          onClick={() => setListPanel('vocab')}
        >
          {copy('tab.vocab')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={listPanel === 'settings'}
          className={listPanel === 'settings' ? styles.subTabActive : styles.subTab}
          onClick={() => setListPanel('settings')}
        >
          {copy('tab.settings')}
        </button>
      </div>

      {listPanel === 'settings' && (
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
              onChange={(event) => handleLearningDirectionChange(event.target.value as 'ko-vi' | 'vi-ko')}
            >
              <option value="ko-vi">한국어 → Tiếng Việt</option>
              <option value="vi-ko">Tiếng Việt → 한국어</option>
            </select>
          </label>
        </div>
      )}

      {listPanel === 'vocab' && (
        <>
          <div className={styles.stats}>
            <div>
              <strong>{stats.total}</strong>
              <span>{copy('stats.total')}</span>
            </div>
            <div>
              <strong>{stats.done}</strong>
              <span>{copy('stats.done')}</span>
            </div>
            <div>
              <strong>{stats.review}</strong>
              <span>{copy('stats.reviewToday')}</span>
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

          <button type="button" className={styles.studyStart} onClick={startStudy} disabled={!filtered.length}>
            {copy('study.startCount', { count: filtered.length })}
          </button>

          {loading ? (
            <p className={styles.empty}>{copy('loading')}</p>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <p>{copy('empty.noItems')}</p>
              <p>{copy('empty.hint')}</p>
            </div>
          ) : (
            <ul className={styles.list}>
              {filtered.map((item) => (
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
                            onClick={() => {
                              speakNow(item.word, detectSpeechLang(item.word));
                            }}
                            aria-label={copy('audio.listen')}
                          >
                            🔊
                          </button>
                        </div>
                        <div className={styles.cardActions}>
                          <button type="button" onClick={() => startEdit(item)}>
                            {copy('edit.action')}
                          </button>
                          <button type="button" onClick={() => void toggleBookmark(item)}>
                            {item.is_bookmarked ? copy('item.unbookmark') : copy('item.bookmark')}
                          </button>
                          <button type="button" onClick={() => void deleteItem(item)}>
                            {copy('item.delete')}
                          </button>
                        </div>
                      </div>
                      {item.meaning_kr && (
                        <span className={styles.meaningRow}>
                          <span className={styles.meaning}>{item.meaning_kr}</span>
                          <button
                            type="button"
                            className={styles.speakBtnInline}
                            onClick={() => {
                              speakNow(item.meaning_kr || '', detectSpeechLang(item.meaning_kr || ''));
                            }}
                            aria-label={copy('audio.listen')}
                          >
                            🔊
                          </button>
                        </span>
                      )}
                      {item.memo && (
                        <span className={styles.meaningRow}>
                          <span className={styles.memo}>{item.memo}</span>
                          <button
                            type="button"
                            className={styles.speakBtnInline}
                            onClick={() => {
                              speakNow(item.memo || '', detectSpeechLang(item.memo || ''));
                            }}
                            aria-label={copy('audio.listen')}
                          >
                            🔊
                          </button>
                        </span>
                      )}
                      <span className={styles.status}>
                        {statusLabel[(item.learn_status as LearnStatus) || 'new']}
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
