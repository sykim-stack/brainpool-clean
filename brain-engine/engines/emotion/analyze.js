// brain-engine/engines/emotion/analyze.js
// -----------------------------------------------------------------
// 감정/위험/의미/의도/문화 분석 -- Gemini 기반으로 진화
// (ctx) => ctx 형태 준수, throw 금지 (구조는 유지, 의미만 진화)
//
// Brainpool 원칙: Structure is Fixed. Meaning Evolves.
//   - route('emotion', ctx) 호출 시그니처: 변경 없음
//   - ctx.payload 입력: translatedText, text, sourceLang 등 그대로 읽음
//   - ctx.payload 출력: emotion, emotionScore는 기존 그대로 채움
//                       + riskScore, intent, meaningScore, culturalNote 신규 채움
//   - 실패 시: 기존 키워드 사전 로직으로 자동 fallback (서비스 끊김 없음)
// -----------------------------------------------------------------

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// ---------------------------------------------------------------
// Fallback: 기존 키워드 사전 (Gemini 실패/키 없을 때 안전망)
// ---------------------------------------------------------------
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
    emotion: label,
    emotionScore: score,
    riskScore: 0,
    intent: 'NEUTRAL',
    intentConf: 'inferred',
    meaningScore: null,
    culturalNote: null,
    isCulturalAdjusted: false,
  };
}

// ---------------------------------------------------------------
// Gemini 분석 프롬프트
// ---------------------------------------------------------------
function buildPrompt(text, translatedText, sourceLang) {
  const directionLabel = sourceLang === 'ko' ? '한국어 -> 베트남어' : '베트남어 -> 한국어';

  return `당신은 한국-베트남 부부의 언어/문화 분석 전문가입니다.
번역 방향: ${directionLabel}
원문: "${text}"
번역: "${translatedText || ''}"

아래 JSON 형식으로만 응답하세요. 설명/마크다운 없이 JSON만 출력:

{
  "meaning_score": <0.0~1.0, 원문 의미가 번역에 얼마나 보존됐는가>,
  "risk_score": <0.0~1.0, 이 메시지가 부부 갈등/오해를 유발할 가능성>,
  "conflict_count": <위험 표현 개수, 정수>,
  "emotion": <"joy"|"sad"|"angry"|"neutral"|"loving"|"anxious" 중 하나>,
  "emotion_score": <0.0~1.0, 0=완전부정 0.5=중립 1.0=완전긍정>,
  "intent": <"NEUTRAL"|"COMPLAINT"|"THREAT"|"AFFECTION"|"REQUEST" 중 하나>,
  "intent_confidence": <"high"|"medium"|"inferred">,
  "is_cultural": <문화적 오해 가능성이 있으면 true, 없으면 false>,
  "cultural_note": <문화 맥락 설명 한 문장, 없으면 null>
}`;
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
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '(본문 읽기 실패)');
    throw new Error(`Gemini API error: ${res.status} body=${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  const finishReason = data?.candidates?.[0]?.finishReason;
  if (!raw) {
    throw new Error(`Gemini 응답 비어있음 finishReason=${finishReason} raw=${JSON.stringify(data).slice(0, 300)}`);
  }

  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

function clamp(val, min, max, fallback) {
  if (typeof val !== 'number' || Number.isNaN(val)) return fallback;
  return Math.min(max, Math.max(min, val));
}

// ---------------------------------------------------------------
// 메인 analyze (route('emotion', ctx)에서 호출됨)
// ---------------------------------------------------------------
export async function analyze(ctx) {
  const text = ctx.payload?.translatedText || ctx.payload?.text;
  if (!text) return ctx;

  const apiKey = process.env.GEMINI_API_KEY;

  // Gemini 키 없으면 기존 키워드 사전으로 즉시 fallback
  if (!apiKey) {
    const fb = keywordFallback(text);
    return mergePayload(ctx, fb);
  }

  try {
    const prompt = buildPrompt(
      ctx.payload?.text,
      ctx.payload?.translatedText,
      ctx.payload?.sourceLang
    );
    const gemini = await callGemini(prompt, apiKey);

    const result = {
      emotion: gemini.emotion || 'neutral',
      emotionScore: clamp(gemini.emotion_score, 0, 1, 0.5),
      riskScore: clamp(gemini.risk_score, 0, 1, 0),
      conflictCount: Math.max(0, Number(gemini.conflict_count) || 0),
      intent: gemini.intent || 'NEUTRAL',
      intentConf: gemini.intent_confidence || 'inferred',
      meaningScore: clamp(gemini.meaning_score, 0, 1, null),
      culturalNote: gemini.is_cultural ? (gemini.cultural_note || null) : null,
      isCulturalAdjusted: !!gemini.is_cultural,
    };

    return mergePayload(ctx, result);
  } catch (e) {
    console.warn('[emotion] Gemini 분석 실패, 키워드 사전으로 대체:', e.message);
    const fb = keywordFallback(text);
    return mergePayload(ctx, fb);
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
      culturalNote: result.culturalNote,
      isCulturalAdjusted: result.isCulturalAdjusted,
    },
  };
}