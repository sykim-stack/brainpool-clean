import { detect } from '../language/detect.js';
import { findCache, saveCache } from './cache.js';
import { translate as deepLTranslate } from './translate.js';

export const TranslationEngine = {
  run: async (ctx) => {
    const { sourceText, targetLang = 'ko' } = ctx.payload;
    const traceId = ctx.traceId || 'unknown';

    console.log(`[TranslationEngine] run 시작: "${sourceText}" -> ${targetLang}, traceId=${traceId}`);

    // 1. 언어 감지 (선택, DeepL이 자체 감지하므로 생략 가능)
    let sourceLang = ctx.payload.sourceLang;
    if (!sourceLang) {
      const detectCtx = await detect({ payload: { text: sourceText }, traceId });
      sourceLang = detectCtx.payload?.language || 'auto';
      console.log(`[TranslationEngine] 감지된 언어: ${sourceLang}`);
    }

    // 2. 캐시 확인
    const cacheCtx = await findCache({ payload: { sourceText, targetLang }, traceId });
    if (cacheCtx.payload?.translated) {
      console.log(`[TranslationEngine] 캐시 히트`);
      return { ...ctx, payload: { translated: cacheCtx.payload.translated, fromCache: true } };
    }

    // 3. DeepL 번역
    console.log(`[TranslationEngine] 캐시 미스, DeepL 호출`);
    const translateCtx = await deepLTranslate({
      payload: { sourceText, targetLang, sourceLang },
      traceId,
    });

    if (translateCtx._error) {
      console.error(`[TranslationEngine] DeepL 오류: ${translateCtx._error}`);
      return { ...ctx, _error: translateCtx._error };
    }

    const translated = translateCtx.payload.translated;

    // 4. 캐시 저장
    await saveCache({ payload: { sourceText, targetLang, translated }, traceId });

    return { ...ctx, payload: { translated, fromCache: false } };
  },
};