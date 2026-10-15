'use client';

import { useEffect, useState } from 'react';
import styles from './CorePhrase.module.css';
import { speakNow } from '@/lib/tts';
import {
  getUiLocale,
  setUiLocale,
  getLearningSource,
  getLearningTarget,
  setLearningDirection,
  type UiLocale,
  type LearningLang,
} from '@/lib/locale';
import { translate, type MessageKey } from '@/lib/i18n/messages';

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

export default function CorePhrase({ userId }: CorePhraseProps) {
  const [items, setItems] = useState<VocabItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>('list');
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState<'all' | 'bookmarked' | 'review'>('all');
  const [studiedToday, setStudiedToday] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMemo, setEditMemo] = useState('');
  const [editMeaning, setEditMeaning] = useState('');
  const [uiLocale, setUiLocaleState] = useState<UiLocale>('ko');
  const [learningSource, setLearningSourceState] = useState<LearningLang>('vi');
  const [learningTarget, setLearningTargetState] = useState<LearningLang>('ko');

  useEffect(() => {
    setUiLocaleState(getUiLocale());
    setLearningSourceState(getLearningSource());
    setLearningTargetState(getLearningTarget());
  }, []);

  const t = (key: MessageKey, vars?: Record<string, string | number>) =>
    translate(uiLocale, key, vars);

  const handleUiLocaleChange = (next: UiLocale) => {
    setUiLocale(next);
    setUiLocaleState(next);
  };

  const handleLearningDirChange = (source: LearningLang, target: LearningLang) => {
    const dir = setLearningDirection(source, target);
    setLearningSourceState(dir.source);
    setLearningTargetState(dir.target);
  };

  const fetchVocab = async () => {
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
  };

  useEffect(() => {
    fetchVocab();
  }, [userId]);

  const updateItem = async (item: VocabItem, fields: Record<string, any>) => {
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
    new: t('phrase.status.new'),
    learning: t('phrase.status.learning'),
    done: t('phrase.status.done'),
  };

  const settingsBar = (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px 16px',
        alignItems: 'center',
        padding: '8px 16px',
        borderBottom: '1px solid var(--color-border)',
        width: '100%',
        boxSizing: 'border-box',
        fontSize: '12px',
        color: 'var(--color-text-muted)',
      }}
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{t('phrase.settings.uiLang')}</span>
        <select
          value={uiLocale}
          onChange={(e) => handleUiLocaleChange(e.target.value as UiLocale)}
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            padding: '2px 6px',
          }}
        >
          <option value="ko">한국어</option>
          <option value="vi">Tiếng Việt</option>
        </select>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{t('phrase.settings.learningDir')}</span>
        <select
          value={`${learningSource}->${learningTarget}`}
          onChange={(e) => {
            const [s, tgt] = e.target.value.split('->') as [LearningLang, LearningLang];
            handleLearningDirChange(s, tgt);
          }}
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            padding: '2px 6px',
          }}
        >
          <option value="vi->ko">VI → KO</option>
          <option value="ko->vi">KO → VI</option>
        </select>
      </label>
    </div>
  );

  if (isLoading) return <div className={styles.empty}>...</div>;

  if (mode === 'study') {
    if (isDone)
      return (
        <div className={styles.studyDone}>
          <p className={styles.studyDoneEmoji}>🎉</p>
          <p className={styles.studyDoneText}>{t('phrase.study.doneTitle')}</p>
          <p className={styles.studyDoneSub}>{t('phrase.study.doneSub', { count: studiedToday })}</p>
          <button
            className={styles.studyBackBtn}
            onClick={() => {
              setMode('list');
              setStudiedToday(0);
            }}
          >
            {t('phrase.study.toList')}
          </button>
        </div>
      );
    return (
      <div className={styles.studyWrap}>
        <div className={styles.studyHeader}>
          <button className={styles.studyBackBtn} onClick={() => setMode('list')}>
            {t('phrase.study.back')}
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
              <p className={styles.flipLabel}>{t('phrase.study.frontLabel')}</p>
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
                  aria-label={t('phrase.study.listen')}
                >
                  🔊
                </button>
              </div>
              <p className={styles.flipHint}>{t('phrase.study.hint')}</p>
            </div>
            <div className={styles.flipBack}>
              <p className={styles.flipLabel}>{t('phrase.study.backLabel')}</p>
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
              {t('phrase.study.dontKnow')}
            </button>
            <button className={styles.knowBtn} onClick={() => currentCard && handleKnow(currentCard)}>
              {t('phrase.study.know')}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {settingsBar}
      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statNum}>{totalCount}</span>
          <span className={styles.statLabel}>{t('phrase.stat.total')}</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statNum}>{doneCount}</span>
          <span className={styles.statLabel}>{t('phrase.stat.done')}</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statNum}>{reviewCount}</span>
          <span className={styles.statLabel}>{t('phrase.stat.reviewToday')}</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statNum}>
            {streakDays}
            <span aria-hidden>🔥</span>
          </span>
          <span className={styles.statLabel}>{t('phrase.stat.streak')}</span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filter === 'all' ? styles.filterActive : ''}`}
            onClick={() => setFilter('all')}
          >
            {t('phrase.filter.all')} {items.length}
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'bookmarked' ? styles.filterActive : ''}`}
            onClick={() => setFilter('bookmarked')}
          >
            {t('phrase.filter.bookmark')} {items.filter((i) => i.is_bookmarked).length}
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'review' ? styles.filterActive : ''}`}
            onClick={() => setFilter('review')}
          >
            {t('phrase.filter.review')} {reviewCount}
          </button>
        </div>
        <button className={styles.studyStartBtn} onClick={startStudy} disabled={studyItems.length === 0}>
          {t('phrase.startStudy')}
          {studyItems.length > 0 ? ` (${studyItems.length})` : ''}
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <div className={styles.empty}>
          <p>{t('phrase.empty')}</p>
          <p className={styles.emptySub}>{t('phrase.emptyHint')}</p>
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
                    placeholder={t('phrase.edit.meaningPlaceholder')}
                  />
                  <textarea
                    className={styles.editTextarea}
                    value={editMemo}
                    onChange={(e) => setEditMemo(e.target.value)}
                    placeholder={t('phrase.edit.memoPlaceholder')}
                    rows={2}
                  />
                  <div className={styles.editBtns}>
                    <button className={styles.editSaveBtn} onClick={() => saveEdit(item)}>
                      {t('phrase.edit.save')}
                    </button>
                    <button className={styles.editCancelBtn} onClick={() => setEditingId(null)}>
                      {t('phrase.edit.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.cardTop}>
                    <div className={styles.words}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                          }}
                          aria-label={t('phrase.study.listen')}
                        >
                          🔊
                        </button>
                      </div>
                      {item.meaning_kr && <span className={styles.meaning}>{item.meaning_kr}</span>}
                      {item.memo && <span className={styles.memo}>✏️ {item.memo}</span>}
                    </div>
                    <button
                      className={`${styles.bookmark} ${item.is_bookmarked ? styles.bookmarked : ''}`}
                      onClick={() => updateItem(item, { is_bookmarked: !item.is_bookmarked })}
                      aria-label={
                        item.is_bookmarked ? t('phrase.action.unbookmark') : t('phrase.action.bookmark')
                      }
                    >
                      {item.is_bookmarked ? '🔖' : '🤍'}
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
                      {statusLabel[item.learn_status] || t('phrase.status.new')}
                    </button>
                    <div className={styles.cardActions}>
                      <button className={styles.editBtn} onClick={() => startEdit(item)}>
                        ✏️
                      </button>
                      <button className={styles.deleteBtn} onClick={() => deleteItem(item)}>
                        {t('phrase.action.delete')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
