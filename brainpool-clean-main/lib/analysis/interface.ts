/**
 * CoreRing Analysis Interface
 * 분석 엔진 추상 레이어 — 특정 AI 모델에 종속되지 않는다
 *
 * 설계 원칙:
 *   1. 책임을 먼저 정의한다 (API 선택은 나중)
 *   2. Gemini는 현재 구현체일 뿐 — 언제든 교체 가능
 *   3. 규칙 기반 / AI / Hybrid 혼용 가능
 */

// ─────────────────────────────────────────────
// 공통 타입
// ─────────────────────────────────────────────

export type DialectType = 'north' | 'south' | 'neutral' | 'unknown';

export type IntentType =
  | 'NEUTRAL'
  | 'COMPLAINT'
  | 'THREAT'
  | 'AFFECTION'
  | 'REQUEST';

export type TranslationDirection = 'ko-vi' | 'vi-ko';

// ─────────────────────────────────────────────
// 입력 컨텍스트
// ─────────────────────────────────────────────

/**
 * 분석 파이프라인에 전달되는 전체 컨텍스트
 * 원문 + 번역 결과 + 메타 정보
 */
export interface AnalysisContext {
  /** 사용자가 입력한 원문 */
  sourceText: string;
  /** 번역된 결과 (DeepL 등) */
  translatedText: string;
  /** 번역 방향 */
  direction: TranslationDirection;
  /** 남부 방언 번역 (존재 시) */
  southernText?: string;
  /** 세션 ID (선택) */
  sessionId?: string;
}

// ─────────────────────────────────────────────
// 각 분석 항목 책임 정의
// ─────────────────────────────────────────────

/**
 * [1순위] 의미 전달률
 *
 * 정의: 원문의 의미가 번역 결과에 얼마나 보존되는가
 *       단순 단어 일치가 아니라 뉘앙스/맥락 보존 측정
 *
 * 입력: sourceText, translatedText, direction
 * 출력: 0.0 ~ 1.0 (1.0 = 완전 전달)
 * 방식: AI (Gemini) — 의미 비교는 규칙 기반으로 불가능
 */
export interface MeaningAnalysisResult {
  /** 의미 전달률 0.0 ~ 1.0 */
  score: number;
  /** 전달 실패 원인 (점수 낮을 때만) */
  lossReason?: string;
}

/**
 * [2순위] 위험 지수
 *
 * 정의: 이 메시지가 오해나 갈등을 유발할 가능성
 *       문화적 오해, 감정 표현 방식 차이가 주요 원인
 *
 * 입력: sourceText, translatedText, direction
 * 출력: risk_score 0.0~1.0, conflict_count (키워드 수), emotion
 * 방식: Hybrid — 위험 키워드는 규칙 기반, 문맥 판단은 AI
 */
export interface RiskAnalysisResult {
  /** 위험 지수 0.0 ~ 1.0 */
  riskScore: number;
  /** 감지된 위험 키워드/표현 개수 */
  conflictCount: number;
  /** 감정 레이블 */
  emotion: string;
  /** 감정 점수 0.0 ~ 1.0 (부정=0, 중립=0.5, 긍정=1) */
  emotionScore: number;
}

/**
 * [3순위] 방언 감지
 *
 * 정의: 베트남어 원문/번역에서 남부 방언 특성 감지
 *       남부 특유의 어휘/발음 패턴 식별
 *
 * 입력: sourceText (vi), southernText (선택)
 * 출력: detected_dialect enum, final_dialect 텍스트, is_southern bool
 * 방식: 규칙 기반 우선 (사전 매칭) → 불확실 시 AI 보완
 */
export interface DialectAnalysisResult {
  /** 감지된 방언 타입 */
  detectedDialect: DialectType;
  /** 최종 방언 설명 텍스트 */
  finalDialect: string;
  /** 남부 방언 여부 */
  isSouthern: boolean;
}

/**
 * [4순위] 의도 분류
 *
 * 정의: 메시지의 발화 의도를 분류
 *       갈등 상황에서 의도 파악이 오해 해소에 중요
 *
 * 입력: sourceText, translatedText
 * 출력: intent enum, intent_conf (확신도)
 * 방식: AI
 */
export interface IntentAnalysisResult {
  intent: IntentType;
  /** 확신도: 'high' | 'medium' | 'inferred' */
  confidence: 'high' | 'medium' | 'inferred';
}

/**
 * [5순위] 문화적 맥락
 *
 * 정의: 한국-베트남 문화 차이에서 오는 오해 가능성 메모
 *
 * 입력: sourceText, translatedText, direction
 * 출력: is_cultural_adjusted bool, cultural_notes jsonb
 * 방식: AI
 */
export interface CulturalAnalysisResult {
  isCultural: boolean;
  notes: {
    ko?: string;
    vi?: string;
    warning?: string;
  } | null;
}

// ─────────────────────────────────────────────
// 통합 분석 결과
// ─────────────────────────────────────────────

export interface AnalysisResult {
  meaning: MeaningAnalysisResult;
  risk: RiskAnalysisResult;
  dialect: DialectAnalysisResult;
  intent: IntentAnalysisResult;
  cultural: CulturalAnalysisResult;
}

// ─────────────────────────────────────────────
// 분석 엔진 인터페이스 (구현체가 따라야 할 계약)
// ─────────────────────────────────────────────

export interface AnalysisProvider {
  /**
   * 전체 분석 실행
   * 구현체가 내부적으로 AI / 규칙 / 혼합 방식을 결정
   */
  analyze(ctx: AnalysisContext): Promise<AnalysisResult>;
}

// ─────────────────────────────────────────────
// tb_trans_logs 저장용 매핑 타입
// ─────────────────────────────────────────────

/**
 * AnalysisResult → tb_trans_logs 컬럼 매핑
 *
 * meaning.score        → meaning_score (신규 컬럼)
 * risk.riskScore       → risk_score
 * risk.conflictCount   → conflict_count
 * risk.emotion         → emotion
 * risk.emotionScore    → emotion_score
 * dialect.detectedDialect → detected_dialect
 * dialect.finalDialect → final_dialect
 * dialect.isSouthern   → is_southern
 * intent.intent        → intent
 * intent.confidence    → intent_conf
 * cultural.isCultural  → is_cultural_adjusted
 * cultural.notes       → cultural_notes
 */
export interface TransLogAnalysisPayload {
  meaning_score: number;
  risk_score: number;
  conflict_count: number;
  emotion: string;
  emotion_score: number;
  detected_dialect: DialectType;
  final_dialect: string;
  is_southern: boolean;
  intent: IntentType;
  intent_conf: string;
  is_cultural_adjusted: boolean;
  cultural_notes: object | null;
}

/**
 * AnalysisResult를 DB 저장 payload로 변환
 */
export function toTransLogPayload(
  result: AnalysisResult
): TransLogAnalysisPayload {
  return {
    meaning_score: result.meaning.score,
    risk_score: result.risk.riskScore,
    conflict_count: result.risk.conflictCount,
    emotion: result.risk.emotion,
    emotion_score: result.risk.emotionScore,
    detected_dialect: result.dialect.detectedDialect,
    final_dialect: result.dialect.finalDialect,
    is_southern: result.dialect.isSouthern,
    intent: result.intent.intent,
    intent_conf: result.intent.confidence,
    is_cultural_adjusted: result.cultural.isCultural,
    cultural_notes: result.cultural.notes,
  };
}
