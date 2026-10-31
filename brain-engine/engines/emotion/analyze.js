// brain-engine/engines/emotion/analyze.js
// 2026-10-31: gemini-3.8-flash → gemini-3.5-flash-lite, drop thinkingConfig
const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';

const KO_POSITIVE = ['기쁘', '좋', '사랑', '감사', '행복', '맛있', '잘', '예쁘', '최고', '고마워'];
const KO_NEGATIVE = ['슬프', '화나', '싫', '나쁘', '힘들', '아프', '피곤', '짜증', '걱정', '속상'];
const VI_POSITIVE = ['vui', 'thích', 'yêu', 'cảm ơn', 'tốt', 'đẹp', 'hạnh phúc', 'tuyệt vời', 'ngon', 'khỏe'];
const VI_NEGATIVE = ['buồn', 'giận', 'ghét', 'tệ', 'xấu', 'mệt', 'bệnh', 'đau', 'chán', 'lo lắng'];

function keywordFallback(text) {
  const lower = (text || '').toLowerCase();
  let score = 0.5;
  let label = 'neutral';
  for (const word of [...VI_POSITIVE, ...KO_POSITIVE]) {
    if (lower.includes(word)) { score = Math.min(1, score + 0.2); label = 'joy'; break; }
  }
  for (const word of [...VI_NEGATIVE, ...KO_NEGATIVE]) {
    if (lower.includes(word)) { score = Math.max(0, score - 0.3); label = 'sad'; break; }
  }
  return {
    emotion: label, emotionScore: score, riskScore: 0, intent: 'NEUTRAL', intentConf: 'inferred',
    meaningScore: null, culturalNote: null, isCulturalAdjusted: false, contextType: null, keywords: [],
  };
}

function buildPrompt(text, translatedText, sourceLang) {
  const directionLabel = sourceLang === 'ko' ? '한국어 -> 베트남어' : '베트남어 -> 한국어';
  return `당신은 한국-베트남 부부의 언어/문화 분석 전문가입니다.
번역 방향: ${directionLabel}
원문: "${text}"
번역: "${translatedText || ''}"

판단 기준:
- risk_score: 오해/갈등 가능성 (0~1). 일상 인사는 0에 가깝게, 비난·명령·모호한 감정은 높게
- emotion: positive|neutral|negative|angry|sad|loving|joy
- intent: NEUTRAL|COMPLAINT|THREAT|AFFECTION|REQUEST
- is_cultural: 문화적 오해 가능성이 있으면 true

JSON만 출력:
{"meaning_score":0.0,"meaning_reason":null,"risk_score":0.0,"risk_reason":null,"conflict_count":0,"emotion":"neutral","emotion_score":0.5,"intent":"NEUTRAL","intent_confidence":"inferred","is_cultural":false,"cultural_note":null,"context_type":"neutral","keywords":[]}`;
}

async function callGemini(prompt, apiKey) {
  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Gemini API error: ${res.status} body=${errBody.slice(0, 300)}`);
  }
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Gemini 응답 비어있음');
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

function clamp(val, min, max, fallback) {
  if (typeof val !== 'number' || Number.isNaN(val)) return fallback;
  return Math.min(max, Math.max(min, val));
}

export async function analyze(ctx) {
  const text = ctx.payload?.translatedText || ctx.payload?.text;
  if (!text) return ctx;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return mergePayload(ctx, keywordFallback(text));
  try {
    const gemini = await callGemini(
      buildPrompt(ctx.payload?.text, ctx.payload?.translatedText, ctx.payload?.sourceLang),
      apiKey,
    );
    return mergePayload(ctx, {
      emotion: gemini.emotion || 'neutral',
      emotionScore: clamp(gemini.emotion_score, 0, 1, 0.5),
      riskScore: clamp(gemini.risk_score, 0, 1, 0),
      conflictCount: Math.max(0, Number(gemini.conflict_count) || 0),
      intent: gemini.intent || 'NEUTRAL',
      intentConf: gemini.intent_confidence || 'inferred',
      meaningScore: clamp(gemini.meaning_score, 0, 1, null),
      meaningReason: gemini.meaning_reason || null,
      riskReason: Array.isArray(gemini.risk_reason)
        ? gemini.risk_reason
        : typeof gemini.risk_reason === 'string'
          ? [gemini.risk_reason]
          : null,
      culturalNote: gemini.is_cultural ? (gemini.cultural_note || null) : null,
      isCulturalAdjusted: !!gemini.is_cultural,
      contextType: gemini.context_type || null,
      keywords: Array.isArray(gemini.keywords) ? gemini.keywords : [],
    });
  } catch (e) {
    console.warn('[emotion] Gemini 분석 실패, 키워드 사전으로 대체:', e.message);
    return mergePayload(ctx, keywordFallback(text));
  }
}

function mergePayload(ctx, result) {
  return {
    ...ctx,
    payload: {
      ...ctx.payload,
      emotion: result.emotion,
      emotionScore: result.emotionScore,
      riskScore: result.riskScore,
      conflictCount: result.conflictCount ?? 0,
      intent: result.intent,
      intentConf: result.intentConf,
      meaningScore: result.meaningScore,
      meaningReason: result.meaningReason ?? null,
      riskReason: result.riskReason ?? null,
      culturalNote: result.culturalNote,
      isCulturalAdjusted: result.isCulturalAdjusted,
      contextType: result.contextType ?? null,
      keywords: result.keywords ?? [],
    },
  };
}
