import { detect } from '../language/detect.js';
import { findCache, saveCache } from './cache.js';
import { translate as deepLTranslate } from './translate.js';

export const TranslationEngine = {
  run: async (ctx) => {
    const { sourceText, targetLang = 'vi' } = ctx.payload;
    const traceId = ctx.traceId || 'unknown';
    console.log('[TranslationEngine] run start: "' + sourceText + '" -> ' + targetLang + ', traceId=' + traceId);

    let sourceLang = ctx.payload.sourceLang;
    if (!sourceLang) {
      const detectCtx = await detect({ payload: { text: sourceText }, traceId });
      sourceLang = detectCtx.payload?.language || 'auto';
      console.log('[TranslationEngine] detected lang: ' + sourceLang);
    }

    const cacheCtx = await findCache({ payload: { sourceText, targetLang }, traceId });
    if (cacheCtx.payload?.translated) {
      console.log('[TranslationEngine] cache hit');
      return { ...ctx, payload: { ...ctx.payload, translated: cacheCtx.payload.translated, fromCache: true } };
    }

    console.log('[TranslationEngine] cache miss, calling DeepL');
    const translateCtx = await deepLTranslate({
      payload: { text: sourceText, sourceLang, targetLang: targetLang.toUpperCase() },
      traceId,
    });
    if (translateCtx._error) {
      console.error('[TranslationEngine] DeepL error: ' + translateCtx._error);
      return { ...ctx, _error: translateCtx._error };
    }

    const translated = translateCtx.payload.translatedText;
    await saveCache({ payload: { sourceText, targetLang, translated }, traceId });
    return { ...ctx, payload: { ...ctx.payload, translated, fromCache: false } };
  },
};