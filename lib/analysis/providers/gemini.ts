/**
 * CoreRing Gemini Analysis Provider
 * AI 기반 분석 구현체
 *
 * 담당 항목:
 *   - 의미 전달률 (1순위) — AI만 가능
 *   - 위험 지수 (2순위) — AI + 규칙 기반 hybrid
 *   - 방언 보완 (3순위) — 규칙 기반 결과가 neutral일 때만
 *   - 의도 분류 (4순위) — AI
 *   - 문화적 맥락 (5순위) — AI
 *
 * 설계 원칙:
 *   - 단일 Gemini 호출로 모든 분석을 한 번에 처리 (비용/속도 최적화)
 *   - 응답은 JSON strict mode
 *   - 실패 시 fallback 값으로 안전하게 처리
 */

import type {
  AnalysisContext,
  AnalysisProvider,
  AnalysisResult,
  DialectType,
  IntentType,
} from '../interface';
import {
  detectDialectFromContext,
} from '../dialect';

// ─────────────────────────────────────────────
// Gemini API 설정
// ─────────────────────────────────────────────

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// ─────────────────────────────────────────────
// 분석 프롬프트 생성
// ─────────────────────────────────────────────

function buildPrompt(ctx: AnalysisContext, ruleDialect: string): string {
  const directionLabel =
    ctx.direction === 'ko-vi' ? '한국어 → 베트남어' : '베트남어 → 한국어';

  return `당신은 한국-베트남 언어/문화 분석 전문가입니다.
다음은 부부 사이의 메시지 번역입니다. (한국인 남편 ↔ 베트남 남부 출신 아내)

번역 방향: ${directionLabel}
원문: "${ctx.sourceText}"
번역: "${ctx.translatedText}"
${ctx.southernText ? `남부 방언 번역: "${ctx.southernText}"` : ''}
규칙 기반 방언 감지 결과: ${ruleDialect}

아래 JSON 형식으로만 응답하세요. 설명이나 마크다운 없이 JSON만:

{
  "meaning_score": <0.0~1.0, 원문 의미가 번역에 얼마나 보존됐는가>,
  "meaning_loss_reason": <점수가 0.7 미만일 때만 손실 원인 한 문장, 아니면 null>,
  "risk_score": <0.0~1.0, 오해/갈등 유발 가능성>,
  "conflict_count": <위험 표현/키워드 개수>,
  "emotion": <"positive"|"neutral"|"negative"|"angry"|"sad"|"loving">,
  "emotion_score": <0.0~1.0, 0=완전부정 0.5=중립 1.0=완전긍정>,
  "intent": <"NEUTRAL"|"COMPLAINT"|"THREAT"|"AFFECTION"|"REQUEST">,
  "intent_confidence": <"high"|"medium"|"inferred">,
  "dialect": <"north"|"south"|"neutral"|"unknown", 규칙 기반 결과가 neutral일 때만 AI 판단>,
  "dialect_final": <방언 설명 한 줄>,
  "is_southern": <true|false>,
  "is_cultural": <문화적 오해 가능성이 있으면 true>,
  "cultural_note_ko": <한국인 남편에게 줄 문화 맥락 설명, 없으면 null>,
  "cultural_note_vi": <베트남 아내에게 줄 문화 맥락 설명, 없으면 null>,
  "cultural_warning": <즉각적 오해 경고, 없으면 null>
}

판단 기준:
- 의미 전달률: 감정/뉘앙스/맥락이 번역에서 왜곡/소실됐는지 평가
- 위험 지수: 부부 사이에서 이 표현이 싸움으로 이어질 가능성
- 남부 방언: 베트남 남부 (메콩델타, 호치민) 특유 어휘/표현 기준
- 문화 차이: 한국의 직접적 표현 vs 베트남의 간접적 표현 차이 등`;
}

// ─────────────────────────────────────────────
// Gemini API 호출
// ─────────────────────────────────────────────

interface GeminiResponse {
  meaning_score: number;
  meaning_loss_reason: string | null;
  risk_score: number;
  conflict_count: number;
  emotion: string;
  emotion_score: number;
  intent: IntentType;
  intent_confidence: 'high' | 'medium' | 'inferred';
  dialect: DialectType;
  dialect_final: string;
  is_southern: boolean;
  is_cultural: boolean;
  cultural_note_ko: string | null;
  cultural_note_vi: string | null;
  cultural_warning: string | null;
}

async function callGemini(prompt: string, apiKey: string): Promise<GeminiResponse> {
  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,        // 분석 태스크 → 낮은 온도
        maxOutputTokens: 1000,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini 응답 비어있음');
  }

  // JSON 파싱 (마크다운 fence 제거)
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as GeminiResponse;
}

// ─────────────────────────────────────────────
// Fallback 값 (Gemini 실패 시)
// ─────────────────────────────────────────────

function fallbackResult(ctx: AnalysisContext): AnalysisResult {
  const dialect = detectDialectFromContext(
    ctx.sourceText,
    ctx.translatedText,
    ctx.direction
  );

  return {
    meaning: { score: 0.5, lossReason: '분석 실패 (fallback)' },
    risk: {
      riskScore: 0,
      conflictCount: 0,
      emotion: 'neutral',
      emotionScore: 0.5,
    },
    dialect,
    intent: { intent: 'NEUTRAL', confidence: 'inferred' },
    cultural: { isCultural: false, notes: null },
  };
}

// ─────────────────────────────────────────────
// GeminiAnalysisProvider 구현
// ─────────────────────────────────────────────

export class GeminiAnalysisProvider implements AnalysisProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('GEMINI_API_KEY 필요');
    this.apiKey = apiKey;
  }

  async analyze(ctx: AnalysisContext): Promise<AnalysisResult> {
    // Step 1: 규칙 기반 방언 감지 (항상 먼저)
    const ruleDialect = detectDialectFromContext(
      ctx.sourceText,
      ctx.translatedText,
      ctx.direction
    );

    // Step 2: Gemini 호출
    let gemini: GeminiResponse;
    try {
      const prompt = buildPrompt(ctx, ruleDialect.detectedDialect);
      gemini = await callGemini(prompt, this.apiKey);
    } catch (err) {
      console.error('[CoreRing Analysis] Gemini 실패, fallback 사용:', err);
      return fallbackResult(ctx);
    }

    // Step 3: 방언 결과 병합
    // 규칙 기반이 south/north로 확정됐으면 AI 결과보다 우선
    const finalDialect =
      ruleDialect.detectedDialect !== 'neutral'
        ? ruleDialect
        : {
            detectedDialect: gemini.dialect,
            finalDialect: gemini.dialect_final,
            isSouthern: gemini.is_southern,
          };

    return {
      meaning: {
        score: clamp(gemini.meaning_score, 0, 1),
        lossReason: gemini.meaning_loss_reason ?? undefined,
      },
      risk: {
        riskScore: clamp(gemini.risk_score, 0, 1),
        conflictCount: Math.max(0, gemini.conflict_count),
        emotion: gemini.emotion || 'neutral',
        emotionScore: clamp(gemini.emotion_score, 0, 1),
      },
      dialect: finalDialect,
      intent: {
        intent: gemini.intent || 'NEUTRAL',
        confidence: gemini.intent_confidence || 'inferred',
      },
      cultural: {
        isCultural: gemini.is_cultural,
        notes: gemini.is_cultural
          ? {
              ko: gemini.cultural_note_ko ?? undefined,
              vi: gemini.cultural_note_vi ?? undefined,
              warning: gemini.cultural_warning ?? undefined,
            }
          : null,
      },
    };
  }
}

// ─────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val ?? min));
}