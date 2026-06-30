// brain-engine/engines/dialect/detect.js
// -----------------------------------------------------------------
// 방언 감지 -- 사전 우선, 불확실할 때만 Gemini 보완
// (ctx) => ctx 형태 준수, throw 금지
//
// 기존 dialect/index.js(saveDialect)와는 역할이 다름:
//   - saveDialect: 신규 단어를 tp_translations에 저장 (라이브 경로 미연결, 유지)
//   - detect(이 파일): 방언을 실제로 감지해서 ctx.payload에 채움 (신규, 라이브 연결)
// -----------------------------------------------------------------

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// 남부(south) 어휘 사전 -- 아내 실사용 패턴 + 남부 베트남어 일반 특성
const SOUTH_LEXICON = [
  'tui', 'mầy', 'ổng', 'bả', 'ảnh', 'chỉ',
  'hen', 'hén', 'nhen', 'nha', 'dzậy', 'dzô', 'dzề', 'dzo',
  'hổng', 'hông', 'xíu', 'cái nầy', 'nầy',
  'thiệt', 'tía', 'má', 'cưng', 'mắc cỡ', 'kỳ', 'coi',
  'hủ tiếu', 'miền tây',
];

// 북부(north) 어휘 -- 남부와 대조되는 표준/북부 표현
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

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 150, responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) throw new Error(`Gemini dialect error: ${res.status}`);
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Gemini dialect 응답 비어있음');

  const clean = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);

  return {
    detectedDialect: parsed.dialect || 'unknown',
    finalDialect: parsed.reason || null,
    isSouthern: !!parsed.is_southern,
  };
}

// ---------------------------------------------------------------
// 메인 detect (router.js에 등록되어 route('dialect', ctx)로 호출됨)
// ---------------------------------------------------------------
export async function detect(ctx) {
  const { text, translatedText, sourceLang } = ctx.payload || {};
  // ko->vi 방향이면 번역 결과(vi)를 보고, vi->ko 방향이면 원문(vi)을 본다
  const viText = sourceLang === 'ko' ? translatedText : text;

  if (!viText) return ctx;

  const ruleResult = ruleBasedDetect(viText);

  // 사전으로 확정됐으면 바로 반환 (Gemini 호출 안 함 -- 비용/속도 절약)
  if (ruleResult.detectedDialect !== 'neutral') {
    return mergeDialect(ctx, ruleResult);
  }

  // neutral이면 Gemini로 보완
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