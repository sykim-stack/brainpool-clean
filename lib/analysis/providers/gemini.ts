/**
 * CoreRing Gemini Analysis Provider
 * 2026-10-30: gemini-2.5-flash → gemini-3.8-flash (P0)
 */
import type {
  AnalysisContext,
  AnalysisProvider,
  AnalysisResult,
  DialectType,
  IntentType,
} from '../interface';
import { detectDialectFromContext } from '../dialect';

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

function buildPrompt(ctx: AnalysisContext, ruleDialect: string): string {
  const directionLabel =
    ctx.direction === 'ko-vi' ? '한국어 → 베트남어' : '베트남어 → 한국어';
  return `당신은 한국-베트남 언어/문화 분석 전문가입니다.
번역 방향: ${directionLabel}
원문: "${ctx.sourceText}"
번역: "${ctx.translatedText}"
${ctx.southernText ? `남부 방언 번역: "${ctx.southernText}"` : ''}
규칙 기반 방언 감지 결과: ${ruleDialect}
아래 JSON만 응답:
{"meaning_score":0.0,"meaning_loss_reason":null,"risk_score":0.0,"conflict_count":0,"emotion":"neutral","emotion_score":0.5,"intent":"NEUTRAL","intent_confidence":"inferred","dialect":"neutral","dialect_final":"","is_southern":false,"is_cultural":false,"cultural_note_ko":null,"cultural_note_vi":null,"cultural_warning":null}`;
}

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
        temperature: 0.2,
        maxOutputTokens: 1000,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 응답 비어있음');
  return JSON.parse(text.replace(/```json|```/g, '').trim()) as GeminiResponse;
}

function fallbackResult(ctx: AnalysisContext): AnalysisResult {
  const dialect = detectDialectFromContext(ctx.sourceText, ctx.translatedText, ctx.direction);
  return {
    meaning: { score: 0.5, lossReason: '분석 실패 (fallback)' },
    risk: { riskScore: 0, conflictCount: 0, emotion: 'neutral', emotionScore: 0.5 },
    dialect,
    intent: { intent: 'NEUTRAL', confidence: 'inferred' },
    cultural: { isCultural: false, notes: null },
  };
}

export class GeminiAnalysisProvider implements AnalysisProvider {
  private apiKey: string;
  constructor(apiKey: string) {
    if (!apiKey) throw new Error('GEMINI_API_KEY 필요');
    this.apiKey = apiKey;
  }
  async analyze(ctx: AnalysisContext): Promise<AnalysisResult> {
    const ruleDialect = detectDialectFromContext(ctx.sourceText, ctx.translatedText, ctx.direction);
    let gemini: GeminiResponse;
    try {
      gemini = await callGemini(buildPrompt(ctx, ruleDialect.detectedDialect), this.apiKey);
    } catch (err) {
      console.error('[CoreRing Analysis] Gemini 실패, fallback 사용:', err);
      return fallbackResult(ctx);
    }
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

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val ?? min));
}
