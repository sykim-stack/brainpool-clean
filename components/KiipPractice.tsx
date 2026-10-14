'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getUiLocale, normalizeUiLocale, type UiLocale } from '@/lib/locale';
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
  /** UI 설정 언어. 없으면 localStorage → 브라우저 언어 */
  locale?: UiLocale | string;
}

const TYPE_LABEL: Record<QuestionType, string> = {
  meaning: '뜻 고르기',
  context: '문맥 빈칸',
  response: '상황 응답',
};

const STAGES = [
  { id: 1, label: '1단계', sub: '초급 1 · 생활 인사', desc: '인사, 자기소개, 기본 표현' },
  { id: 2, label: '2단계', sub: '초급 2 · 일상 대화', desc: '쇼핑, 교통, 약속 잡기' },
  { id: 3, label: '3단계', sub: '중급 1 · 사회생활', desc: '직장, 병원, 공공기관' },
  { id: 4, label: '4단계', sub: '중급 2 · 심화 표현', desc: '의견, 감정, 복잡한 상황' },
] as const;

/** DB/시드에 이스케이프된 \\n 문자열이 들어와도 실제 줄바꿈으로 표시 */
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
    if (localeProp) setUiLocaleState(normalizeUiLocale(localeProp));
    else setUiLocaleState(getUiLocale());
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
        throw new Error(json?.error?.message || 'KIIP 연습을 불러오지 못했어요.');
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
          questionCount: 5,
        });
        setQuestions(payload.questions || []);
        setIndex(0);
        setSelectedIndex(null);
        setResult(null);
        setScore(0);
        setWrongTopics([]);
        setIsComplete(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : '연습을 시작할 수 없어요.');
        setQuestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [deviceId, request]
  );

  const handleSelectStage = (stage: number) => {
    setSelectedStage(stage);
    setError('');
    startSession(stage);
  };

  const handleChangeStage = () => {
    setSelectedStage(null);
    setQuestions([]);
    setIndex(0);
    setSelectedIndex(null);
    setResult(null);
    setScore(0);
    setWrongTopics([]);
    setIsComplete(false);
    setError('');
  };

  // locale 변경 시 현재 단계가 있으면 다시 로드
  useEffect(() => {
    if (deviceId && selectedStage !== null) {
      startSession(selectedStage);
    }
  }, [uiLocale]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitAnswer = async (choiceIndex: number) => {
    if (!current || selectedIndex !== null || isSubmitting) return;
    setSelectedIndex(choiceIndex);
    setIsSubmitting(true);
    try {
      const answer = await request({
        action: 'submit-answer',
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
      setError(err instanceof Error ? err.message : '답안을 확인하지 못했어요.');
      setSelectedIndex(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextQuestion = () => {
    if (index >= questions.length - 1) setIsComplete(true);
    else {
      setIndex((value) => value + 1);
      setSelectedIndex(null);
      setResult(null);
    }
  };

  const scoreMessage = useMemo(() => {
    if (score === questions.length) return '좋아요. 오늘 표현을 잘 익혔어요.';
    if (score >= 3) return '기초가 잘 잡혀 있어요. 틀린 표현만 한 번 더 볼까요?';
    return '괜찮아요. 실제 대화에서 다시 만나면 더 쉽게 기억할 수 있어요.';
  }, [questions.length, score]);

  if (!deviceId) {
    return <div className={styles.empty}>학습 공간을 준비하고 있어요...</div>;
  }

  // ─── 단계 선택 화면 ───────────────────────────────────────────
  if (selectedStage === null) {
    return (
      <section className={styles.stageSelect} aria-label="KIIP 단계 선택">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>KIIP PRACTICE</p>
            <h1>단계를 선택하세요</h1>
          </div>
        </header>
        <p className={styles.stageHint}>
          사회통합프로그램(KIIP) 단계에 맞춰 생활 한국어를 연습해요.
        </p>
        <div className={styles.stageGrid}>
          {STAGES.map((stage) => (
            <button
              key={stage.id}
              className={styles.stageCard}
              onClick={() => handleSelectStage(stage.id)}
              type="button"
            >
              <span className={styles.stageNumber}>{stage.label}</span>
              <strong className={styles.stageTitle}>{stage.sub}</strong>
              <span className={styles.stageDesc}>{stage.desc}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (isLoading && !questions.length) {
    return (
      <div className={styles.empty}>
        {stageMeta.label} 연습을 준비하고 있어요...
      </div>
    );
  }

  if (error && !questions.length) {
    return (
      <div className={styles.empty}>
        <p>{error}</p>
        <div className={styles.resultActions}>
          <button className={styles.primaryButton} onClick={() => startSession(selectedStage)}>
            다시 시도
          </button>
          <button className={styles.secondaryButton} onClick={handleChangeStage}>
            단계 변경
          </button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <section className={styles.resultWrap} aria-label="KIIP 연습 결과">
        <div className={styles.resultBadge}>{stageMeta.label} 완료</div>
        <p className={styles.resultScore}>
          {score}
          <span> / {questions.length}</span>
        </p>
        <h2>{scoreMessage}</h2>
        <p className={styles.resultSub}>{stageMeta.sub} 표현을 연습했어요.</p>
        {wrongTopics.length > 0 && (
          <div className={styles.reviewBox}>
            <strong>다시 볼 주제</strong>
            <span>{wrongTopics.join(' · ')}</span>
          </div>
        )}
        <div className={styles.resultActions}>
          <button
            className={styles.primaryButton}
            onClick={() => startSession(selectedStage)}
          >
            다시 연습
          </button>
          <button className={styles.secondaryButton} onClick={handleChangeStage}>
            단계 변경
          </button>
          <p>오답 표현은 다음 단계에서 CorePhrase 단어장 연결로 확장할 수 있어요.</p>
        </div>
      </section>
    );
  }

  if (!current) {
    return (
      <div className={styles.empty}>
        <p>문제를 준비하지 못했어요.</p>
        <button className={styles.secondaryButton} onClick={handleChangeStage}>
          단계 변경
        </button>
      </div>
    );
  }

  const promptText = normalizeMultiline(current.prompt);
  const contextText = normalizeMultiline(current.context);
  const explanationText = result ? normalizeMultiline(result.explanation) : '';

  return (
    <section className={styles.wrap} aria-label={`KIIP ${stageMeta.label} 연습`}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            KIIP PRACTICE · STAGE {selectedStage}
          </p>
          <h1>{stageMeta.sub}</h1>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.counter}>
            {index + 1} / {questions.length}
          </span>
          <button
            type="button"
            className={styles.changeStageLink}
            onClick={handleChangeStage}
          >
            단계 변경
          </button>
        </div>
      </header>
      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{ width: `${completionPercent}%` }}
        />
      </div>
      <div className={styles.topicRow}>
        <span>{TYPE_LABEL[current.type]}</span>
        <span>{current.topic}</span>
      </div>
      <article className={styles.questionCard}>
        <p className={styles.prompt}>{promptText}</p>
        {contextText ? <pre className={styles.context}>{contextText}</pre> : null}
        <div className={styles.choices} role="radiogroup" aria-label="답 선택">
          {current.choices.map((choice, choiceIndex) => {
            const isSelected = selectedIndex === choiceIndex;
            const isCorrect = result && result.correctIndex === choiceIndex;
            const className = `${styles.choice} ${isSelected ? styles.selected : ''} ${result && isCorrect ? styles.correct : ''} ${result && isSelected && !result.correct ? styles.incorrect : ''}`;
            return (
              <button
                key={`${current.id}-${choiceIndex}`}
                className={className}
                onClick={() => submitAnswer(choiceIndex)}
                disabled={selectedIndex !== null || isSubmitting}
                role="radio"
                aria-checked={isSelected}
              >
                <span>{String.fromCharCode(65 + choiceIndex)}</span>
                {normalizeMultiline(choice)}
              </button>
            );
          })}
        </div>
        {result && (
          <div
            className={`${styles.feedback} ${result.correct ? styles.feedbackCorrect : styles.feedbackIncorrect}`}
          >
            <strong>{result.correct ? '정답이에요.' : '다시 생각해 볼까요?'}</strong>
            <p>{explanationText}</p>
            <small>핵심 표현 · {result.vocabulary}</small>
          </div>
        )}
      </article>
      {error && <p className={styles.inlineError}>{error}</p>}
      <footer className={styles.footer}>
        {result ? (
          <button className={styles.primaryButton} onClick={nextQuestion}>
            {index === questions.length - 1 ? '결과 보기' : '다음 문제'}
          </button>
        ) : (
          <p>실제 대화에서 자주 쓰는 표현을 골라 보세요.</p>
        )}
      </footer>
    </section>
  );
}
