// brain-engine/engines/dialect/detect.js
// -----------------------------------------------------------------
// 방언 감지 -- 사전 우선, 불확실할 때만 Gemini 보완
// (ctx) => ctx 형태 준수, throw 금지
// 2026-11-01: remove thinkingConfig.thinkingBudget (Gemini 3.x 호환)
// 2026-11-03: GEMINI_GENERATE_URL from shared geminiConfig
// -----------------------------------------------------------------

import { GEMINI_GENERATE_URL } from '../../connectors/geminiConfig.js';

const SOUTH_LEXICON = [
  'tui', 'mầy', 'ổng', 'bả', 'ảnh', 'chỉ',
  'hen', 'hén', 'nhen', 'nha', 'dzậy', 'dzô', 'dzề', 'dzo',
  'hổng', 'hông', 'xíu', 'cái nầy', 'nầy',
  'thiệt', 'tía', 'má', 'cưng', 'mắc cỡ', 'kỳ', 'coi',
  'hủ tiếu', 'miền tây',
];

const NORTH_LEXICON = [
  'nhé', 'thật', 'bố', 'không', 'này', 'vào', 'về', 'xem', 'xấu hổ', 'lạ',
];

function scoreDialect(text) {
  const lower = (text || '').toLowerCase();
  const south = SOUTH_LEXICON.filter((t) => lower.includes(t));
  const north = NORTH_LEXICON.filter((t) => lower.includes(t));
  return { south, north };
}

function ruleBasedDetect(text) {
  if (!text || !text.trim()) {
    return { detectedDialect: 'unknown', finalDialect: '감지 불가 (빈 텍스트)', isSouthern: false };
  }

  const { south, north } = scoreDialect(text);

  if (south.length >= 2 || (south.length >= 1 && north.length === 0)) {
    return {
      detectedDialect: 'south',
      finalDialect: `남부 베트남어 (감지: ${south.join(', ')})`,
      isSouthern: true,
    };
  }

  if (north.length > south.length) {
    return {
      detectedDialect: 'north',
      finalDialect: `북부 베트남어 (감지: ${north.join(', ')})`,
      isSouthern: false,
    };
  }

  return { detectedDialect: 'neutral', finalDialect: null, isSouthern: false };
}

async function geminiDetect(text, apiKey) {
  const prompt = `다음 베트남어 문장의 방언을 분석하세요: "${text}"
JSON으로만 응답: {"dialect": "south"|"north"|"neutral"|"unknown", "reason": "한 문장 설명", "is_southern": true|false}`;

  const res = await fetch(`${GEMINI_GENERATE_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 400,
        responseMimeType: 'application/json',
        // No thinkingConfig: Gemini 3.x rejects thinkingBudget (2.5-only).
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '(본문 읽기 실패)');
    throw new Error(`Gemini dialect error: ${res.status} body=${errBody.slice(0, 300)}`);
  }
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  const finishReason = data?.candidates?.[0]?.finishReason;
  if (!raw) {
    throw new Error(`Gemini dialect 응답 비어있음 finishReason=${finishReason}`);
  }

  const clean = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);

  return {
    detectedDialect: parsed.dialect || 'unknown',
    finalDialect: parsed.reason || null,
    isSouthern: !!parsed.is_southern,
  };
}

export async function detect(ctx) {
  const { text, translatedText, sourceLang } = ctx.payload || {};
  const viText = sourceLang === 'ko' ? translatedText : text;

  if (!viText) return ctx;

  const ruleResult = ruleBasedDetect(viText);

  if (ruleResult.detectedDialect !== 'neutral') {
    return mergeDialect(ctx, ruleResult);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return mergeDialect(ctx, { ...ruleResult, finalDialect: '방언 불명확 (Gemini 키 없음)' });
  }

  try {
    const aiResult = await geminiDetect(viText, apiKey);
    return mergeDialect(ctx, aiResult);
  } catch (e) {
    console.warn('[dialect] Gemini 보완 실패, 사전 결과 유지:', e.message);
    return mergeDialect(ctx, { ...ruleResult, finalDialect: '방언 불명확 (분석 실패)' });
  }
}

function mergeDialect(ctx, result) {
  return {
    ...ctx,
    payload: {
      ...ctx.payload,
      detectedDialect: result.detectedDialect,
      finalDialect: result.finalDialect,
      isSouthern: result.isSouthern,
    },
  };
}
