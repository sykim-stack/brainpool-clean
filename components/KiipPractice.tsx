'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getUiLocale, normalizeUiLocale, type UiLocale } from '@/lib/locale';
import { t, type MessageKey } from '@/lib/i18n/messages';
import { KIIP_SESSION_QUESTION_COUNT } from '@/lib/kiip/constants';
import { speakNow } from '@/lib/tts';
import styles from './KiipPractice.module.css';

type QuestionType = 'meaning' | 'context' | 'response';
type Question = {
  id: string;
  stage: number;
  type: QuestionType;
  topic: string;
  prompt: string;
  context?: string;
  choices: string[];
  vocabulary: string;
};
type AnswerResult = {
  correct: boolean;
  correctIndex: number;
  explanation: string;
  vocabulary: string;
  topic: string;
};

interface KiipPracticeProps {
  deviceId: string;
  locale?: UiLocale | string;
}

class KiipRequestError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'KiipRequestError';
  }
}

const API_ERROR_MESSAGES: Partial<Record<string, MessageKey>> = {
  UNAUTHORIZED: 'kiip.error.unauthorized',
  DATABASE_UNAVAILABLE: 'kiip.error.databaseUnavailable',
  INVALID_ANSWER: 'kiip.error.invalidAnswer',
  INVALID_SESSION: 'kiip.error.invalidRequest',
  UNKNOWN_ACTION: 'kiip.error.unknownAction',
  INVALID_REQUEST: 'kiip.error.invalidRequest',
  REQUEST_FAILED: 'kiip.error.sessionLoad',
};

const TYPE_LABEL: Record<QuestionType, MessageKey> = {
  meaning: 'kiip.questionType.meaning',
  context: 'kiip.questionType.context',
  response: 'kiip.questionType.response',
};

const STAGES = [
  { id: 1, labelKey: 'kiip.stage.1.label', subKey: 'kiip.stage.1.sub', descriptionKey: 'kiip.stage.1.description' },
  { id: 2, labelKey: 'kiip.stage.2.label', subKey: 'kiip.stage.2.sub', descriptionKey: 'kiip.stage.2.description' },
  { id: 3, labelKey: 'kiip.stage.3.label', subKey: 'kiip.stage.3.sub', descriptionKey: 'kiip.stage.3.description' },
  { id: 4, labelKey: 'kiip.stage.4.label', subKey: 'kiip.stage.4.sub', descriptionKey: 'kiip.stage.4.description' },
] as const;

/** KIIP 본문은 생활 한국어 — TTS는 한국어 우선 */
function detectSpeechLang(text: string): string {
  if (/[가-힣]/.test(text)) return 'ko-KR';
  if (/[ĂÂÊÔƠƯăâêôơưĐđÀ-ỹ]/.test(text)) return 'vi-VN';
  return 'ko-KR';
}

function speakKoFirst(text: string) {
  if (!text.trim()) return;
  speakNow(text, detectSpeechLang(text));
}

function normalizeMultiline(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n');
}

export default function KiipPractice({ deviceId, locale: localeProp }: KiipPracticeProps) {
  const [uiLocale, setUiLocaleState] = useState<UiLocale>(() =>
    localeProp ? normalizeUiLocale(localeProp) : 'ko'
  );
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [score, setScore] = useState(0);
  const [wrongTopics, setWrongTopics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState('');

  const current = questions[index];
  const copy = useCallback(
    (key: MessageKey, values?: Record<string, string | number>) => t(key, uiLocale, values),
    [uiLocale],
  );
  const completionPercent = questions.length
    ? isComplete
      ? 100
      : (index / questions.length) * 100
    : 0;

  const stageMeta = useMemo(
    () => STAGES.find((s) => s.id === selectedStage) || STAGES[0],
    [selectedStage]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localeProp) setUiLocaleState(normalizeUiLocale(localeProp));
      else setUiLocaleState(getUiLocale());
    }, 0);
    return () => window.clearTimeout(timer);
  }, [localeProp]);

  const request = useCallback(
    async (body: Record<string, unknown>) => {
      const response = await fetch('/api/kiip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'x-device-id': deviceId,
        },
        body: JSON.stringify({ ...body, locale: uiLocale }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        const code = typeof json?.error?.code === 'string' ? json.error.code : 'REQUEST_FAILED';
        throw new KiipRequestError(code);
      }
      return json.payload;
    },
    [deviceId, uiLocale]
  );

  const startSession = useCallback(
    async (stage: number) => {
      if (!deviceId) return;
      setIsLoading(true);
      setError('');
      try {
        const payload = await request({
          action: 'get-session',
          stage,
          questionCount: KIIP_SESSION_QUESTION_COUNT,
        });
        setSessionId(typeof payload.sessionId === 'string' ? payload.sessionId : null);
        setQuestions(payload.questions || []);
        setIndex(0);
        setSelectedIndex(null);
        setResult(null);
        setScore(0);
        setWrongTopics([]);
        setIsComplete(false);
      } catch (err) {
        const messageKey = err instanceof KiipRequestError
          ? API_ERROR_MESSAGES[err.code] || 'kiip.error.sessionStart'
          : 'kiip.error.sessionStart';
        setError(copy(messageKey));
        setSessionId(null);
        setQuestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [copy, deviceId, request]
  );

  const handleSelectStage = (stage: number) => {
    setSelectedStage(stage);
    setError('');
    startSession(stage);
  };

  const handleChangeStage = () => {
    setSelectedStage(null);
    setSessionId(null);
    setQuestions([]);
    setIndex(0);
    setSelectedIndex(null);
    setResult(null);
    setScore(0);
    setWrongTopics([]);
    setIsComplete(false);
    setError('');
  };

  useEffect(() => {
    if (!deviceId || selectedStage === null) return;
    const timer = window.setTimeout(() => {
      void startSession(selectedStage);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [uiLocale]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitAnswer = async (choiceIndex: number) => {
    if (!current || selectedIndex !== null || isSubmitting) return;
    setSelectedIndex(choiceIndex);
    setIsSubmitting(true);
    try {
      const answer = await request({
        action: 'submit-answer',
        sessionId: sessionId || undefined,
        questionId: current.id,
        selectedIndex: choiceIndex,
      });
      setResult(answer);
      if (answer.correct) setScore((value) => value + 1);
      else
        setWrongTopics((topics) =>
          topics.includes(answer.topic) ? topics : [...topics, answer.topic]
        );
    } catch (err) {
      const messageKey = err instanceof KiipRequestError
        ? API_ERROR_MESSAGES[err.code] || 'kiip.error.answer'
        : 'kiip.error.answer';
      setError(copy(messageKey));
      setSelectedIndex(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeSession = useCallback(async () => {
    if (!sessionId) {
      setIsComplete(true);
      return;
    }
    try {
      const payload = await request({
        action: 'complete-session',
        sessionId,
      });
      if (typeof payload.score === 'number') setScore(payload.score);
      if (Array.isArray(payload.wrongTopics)) {
        setWrongTopics(payload.wrongTopics.filter((t: unknown): t is string => typeof t === 'string'));
      }
    } catch {
      // keep local score
    } finally {
      setIsComplete(true);
    }
  }, [request, sessionId]);

  const nextQuestion = () => {
    if (index >= questions.length - 1) {
      void completeSession();
    } else {
      setIndex((value) => value + 1);
      setSelectedIndex(null);
      setResult(null);
    }
  };

  const scoreMessageKey = useMemo<MessageKey>(() => {
    if (questions.length === 0) return 'kiip.result.scoreLow';
    if (score === questions.length) return 'kiip.result.scorePerfect';
    if (score >= Math.ceil(questions.length * 0.6)) return 'kiip.result.scoreHigh';
    return 'kiip.result.scoreLow';
  }, [questions.length, score]);

  if (!deviceId) {
    return <div className={styles.empty}>{copy('kiip.device.preparing')}</div>;
  }

  if (selectedStage === null) {
    return (
      <section className={styles.stageSelect} aria-label={copy('kiip.stageSelect.aria')}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>KIIP PRACTICE</p>
            <h1>{copy('kiip.stageSelect.title')}</h1>
          </div>
        </header>
        <p className={styles.stageHint}>{copy('kiip.stageSelect.intro')}</p>
        <div className={styles.stageGrid}>
          {STAGES.map((stage) => (
            <button
              key={stage.id}
              className={styles.stageCard}
              onClick={() => handleSelectStage(stage.id)}
              type="button"
            >
              <span className={styles.stageNumber}>{copy(stage.labelKey)}</span>
              <strong className={styles.stageTitle}>{copy(stage.subKey)}</strong>
              <span className={styles.stageDesc}>{copy(stage.descriptionKey)}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (isLoading && !questions.length) {
    return (
      <div className={styles.empty}>
        {copy('kiip.stage.preparing', { stage: copy(stageMeta.labelKey) })}
      </div>
    );
  }

  if (error && !questions.length) {
    return (
      <div className={styles.empty}>
        <p>{error}</p>
        <div className={styles.resultActions}>
          <button className={styles.primaryButton} onClick={() => startSession(selectedStage)}>
            {copy('kiip.button.retry')}
          </button>
          <button className={styles.secondaryButton} onClick={handleChangeStage}>
            {copy('kiip.button.changeStage')}
          </button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <section className={styles.resultWrap} aria-label={copy('kiip.result.aria')}>
        <div className={styles.resultBadge}>
          {copy('kiip.result.completed', { stage: copy(stageMeta.labelKey) })}
        </div>
        <p className={styles.resultScore}>
          {score}
          <span> / {questions.length}</span>
        </p>
        <h2>{copy(scoreMessageKey)}</h2>
        <p className={styles.resultSub}>
          {copy('kiip.result.stagePractice', { stage: copy(stageMeta.subKey) })}
        </p>
        {wrongTopics.length > 0 && (
          <div className={styles.reviewBox}>
            <strong>{copy('kiip.result.wrongTopics')}</strong>
            <span>{wrongTopics.join(' · ')}</span>
          </div>
        )}
        <div className={styles.resultActions}>
          <button className={styles.primaryButton} onClick={() => startSession(selectedStage)}>
            {copy('kiip.result.practiceAgain')}
          </button>
          <button className={styles.secondaryButton} onClick={handleChangeStage}>
            {copy('kiip.button.changeStage')}
          </button>
          <p>{copy('kiip.result.corePhraseHint')}</p>
        </div>
      </section>
    );
  }

  if (!current) {
    return (
      <div className={styles.empty}>
        <p>{copy('kiip.question.unavailable')}</p>
        <button className={styles.secondaryButton} onClick={handleChangeStage}>
          {copy('kiip.button.changeStage')}
        </button>
      </div>
    );
  }

  const promptText = normalizeMultiline(current.prompt);
  const contextText = normalizeMultiline(current.context);
  const explanationText = result ? normalizeMultiline(result.explanation) : '';
  const listenAllText = [promptText, contextText].filter(Boolean).join('\n');

  return (
    <section
      className={styles.wrap}
      aria-label={copy('kiip.practice.aria', { stage: copy(stageMeta.labelKey) })}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {copy('kiip.practice.eyebrow', { stage: selectedStage })}
          </p>
          <h1>{copy(stageMeta.subKey)}</h1>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.counter}>
            {index + 1} / {questions.length}
          </span>
          <button type="button" className={styles.changeStageLink} onClick={handleChangeStage}>
            {copy('kiip.practice.changeStage')}
          </button>
        </div>
      </header>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${completionPercent}%` }} />
      </div>
      <div className={styles.topicRow}>
        <span>{copy(TYPE_LABEL[current.type])}</span>
        <span>{current.topic}</span>
        <button
          type="button"
          className={styles.listenAllBtn}
          onClick={() => speakKoFirst(listenAllText)}
          aria-label={copy('audio.listen')}
        >
          🔊 {copy('kiip.listen.question')}
        </button>
      </div>
      <article className={styles.questionCard}>
        <div className={styles.promptRow}>
          <p className={styles.prompt}>{promptText}</p>
          <button
            type="button"
            className={styles.speakBtn}
            onClick={() => speakKoFirst(promptText)}
            aria-label={copy('audio.listen')}
          >
            🔊
          </button>
        </div>
        {contextText ? (
          <div className={styles.contextRow}>
            <pre className={styles.context}>{contextText}</pre>
            <button
              type="button"
              className={styles.speakBtn}
              onClick={() => speakKoFirst(contextText)}
              aria-label={copy('audio.listen')}
            >
              🔊
            </button>
          </div>
        ) : null}
        <div className={styles.choices} role="radiogroup" aria-label={copy('kiip.answer.select')}>
          {current.choices.map((choice, choiceIndex) => {
            const isSelected = selectedIndex === choiceIndex;
            const isCorrect = result && result.correctIndex === choiceIndex;
            const className = `${styles.choice} ${isSelected ? styles.selected : ''} ${result && isCorrect ? styles.correct : ''} ${result && isSelected && !result.correct ? styles.incorrect : ''}`;
            const choiceText = normalizeMultiline(choice);
            return (
              <div key={`${current.id}-${choiceIndex}`} className={styles.choiceRow}>
                <button
                  className={className}
                  onClick={() => submitAnswer(choiceIndex)}
                  disabled={selectedIndex !== null || isSubmitting}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <span>{String.fromCharCode(65 + choiceIndex)}</span>
                  {choiceText}
                </button>
                <button
                  type="button"
                  className={styles.speakBtnInline}
                  onClick={() => speakKoFirst(choiceText)}
                  aria-label={copy('audio.listen')}
                >
                  🔊
                </button>
              </div>
            );
          })}
        </div>
        {result && (
          <div
            className={`${styles.feedback} ${result.correct ? styles.feedbackCorrect : styles.feedbackIncorrect}`}
          >
            <strong>
              {result.correct ? copy('kiip.feedback.correct') : copy('kiip.feedback.incorrect')}
            </strong>
            <div className={styles.feedbackBody}>
              <p>{explanationText}</p>
              <button
                type="button"
                className={styles.speakBtnInline}
                onClick={() =>
                  speakKoFirst([explanationText, result.vocabulary].filter(Boolean).join('. '))
                }
                aria-label={copy('audio.listen')}
              >
                🔊
              </button>
            </div>
            <small>{copy('kiip.feedback.vocabulary', { vocabulary: result.vocabulary })}</small>
          </div>
        )}
      </article>
      {error && <p className={styles.inlineError}>{error}</p>}
      <footer className={styles.footer}>
        {result ? (
          <button className={styles.primaryButton} onClick={nextQuestion}>
            {index === questions.length - 1
              ? copy('kiip.result.view')
              : copy('kiip.result.nextQuestion')}
          </button>
        ) : (
          <p>{copy('kiip.practice.footerListen')}</p>
        )}
      </footer>
    </section>
  );
}
