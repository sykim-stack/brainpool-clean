// brain-engine/engines/translation/translate.js
// ─────────────────────────────────────────────────────────────
// DeepL 번역 — 캐시 미스 시 호출
// (ctx) => ctx 형태 준수, throw 금지
// ─────────────────────────────────────────────────────────────

export async function translate(ctx) {
  // 이미 번역된 경우(캐시 히트) 통과
  if (ctx.payload.translatedText) return ctx;

  const { text, sourceLang } = ctx.payload;
  if (!text) return { ...ctx, _error: 'translate: text 필드가 필요합니다' };

  const targetLang = sourceLang === 'ko' ? 'VI' : 'KO';
  const key = process.env.DEEPL_API_KEY;

  if (!key) {
    console.warn('[Translate] DEEPL_API_KEY 없음 → mock 사용');
    return {
      ...ctx,
      payload: {
        ...ctx.payload,
        translatedText: `[Mock] ${text}`,
        translationSource: 'mock',
      }
    };
  }

  const params = new URLSearchParams();
  params.append('text', text);
  params.append('target_lang', targetLang);

  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  }).catch(err => {
    console.error('[Translate] DeepL fetch 실패:', err.message);
    return null;
  });

  if (!res || !res.ok) {
    console.warn(`[Translate] DeepL 오류 → mock 사용`);
    return {
      ...ctx,
      payload: {
        ...ctx.payload,
        translatedText: `[Mock] ${text}`,
        translationSource: 'mock',
      }
    };
  }

  const data = await res.json();
  const translatedText = data.translations[0].text;

  console.log(`[Translate] DeepL: "${text}" → "${translatedText}"`);

  return {
    ...ctx,
    payload: {
      ...ctx.payload,
      translatedText,
      translationSource: 'deepl',
    }
  };
}