// brain-engine/engines/translation/index.js

import { detect } from '../language/detect.js';
import { findCache, saveCache } from './cache.js';
import { translate as deepLTranslate } from './translate.js';
import { saveTranslation } from '../../connectors/storage.js';   // ← 경로 확인

export const TranslationEngine = {
  run: async (ctx) => {
    const { sourceText, targetLang = 'vi', marriage_type, partner_device_id, context_category } = ctx.payload || {};
    const traceId = ctx.traceId || 'trace_' + Date.now();

    console.log(`[TranslationEngine] run start: "${sourceText}" -> ${targetLang}`);

    if (!sourceText) {
      ctx._error = 'sourceText is required';
      return ctx;
    }

    try {
      let sourceLang = ctx.payload.sourceLang;
      if (!sourceLang) {
        const detectCtx = await detect({ payload: { text: sourceText }, traceId });
        sourceLang = detectCtx.payload?.language || 'auto';
      }

      // 캐시 체크
      const cacheCtx = await findCache({ payload: { sourceText, targetLang }, traceId });
      if (cacheCtx.payload?.translated) {
        ctx.payload.translated = cacheCtx.payload.translated;
        ctx.payload.fromCache = true;
        ctx = await saveAsLearningAsset(ctx);
        return ctx;
      }

      // DeepL 번역
      const translateCtx = await deepLTranslate({
        payload: { text: sourceText, sourceLang, targetLang: targetLang.toUpperCase() },
        traceId,
      });

      if (translateCtx._error) {
        ctx._error = translateCtx._error;
        return ctx;
      }

      const translated = translateCtx.payload.translatedText;

      await saveCache({ payload: { sourceText, targetLang, translated }, traceId });

      ctx.payload.translated = translated;
      ctx.payload.fromCache = false;
      ctx.payload.source_text = sourceText;
      ctx.payload.standard_vi = translated;
      ctx.payload.southern_vi = translated;
      ctx.payload.is_southern = true;

      ctx.payload.marriage_type = marriage_type || null;
      ctx.payload.partner_device_id = partner_device_id || null;
      ctx.payload.context_category = context_category || 'daily';

      // 학습 자산 저장
      ctx = await saveAsLearningAsset(ctx);

      return ctx;

    } catch (err) {
      ctx._error = `TranslationEngine error: ${err.message}`;
      console.error(err);
      return ctx;
    }
  }
};

async function saveAsLearningAsset(ctx) {
  try {
    ctx = await saveTranslation(ctx);
  } catch (e) {
    console.warn('[saveAsLearningAsset] failed:', e.message);
  }
  return ctx;
}