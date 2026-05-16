// brain-engine/engines/translation/index.js
// BRAINPOOL OS TranslationEngine - Hajun Router 호환 (최종 정리)

import { detect } from '../language/detect.js';
import { findCache, saveCache } from './cache.js';
import { translate as deepLTranslate } from './translate.js';
import { saveTranslation } from '../../connectors/storage.js';

export const TranslationEngine = {
  run: async (ctx) => {
    const { sourceText, targetLang = 'vi', marriage_type, partner_device_id, context_category } = ctx.payload || {};
    const traceId = ctx.traceId || 'trace_' + Date.now();

    console.log(`[TranslationEngine] run start: "${sourceText?.slice(0, 50)}..." -> ${targetLang}`);

    if (!sourceText) {
      ctx._error = 'sourceText is required';
      return ctx;
    }

    try {
      // 1. 언어 감지
      let sourceLang = ctx.payload.sourceLang;
      if (!sourceLang) {
        const detectCtx = await detect({ payload: { text: sourceText }, traceId });
        sourceLang = detectCtx.payload?.language || 'auto';
      }

      // 2. 캐시 체크
      const cacheCtx = await findCache({ payload: { sourceText, targetLang }, traceId });
      if (cacheCtx.payload?.translated) {
        console.log('[TranslationEngine] cache hit');
        ctx.payload.translated = cacheCtx.payload.translated;
        ctx.payload.fromCache = true;
        ctx = await saveAsLearningAsset(ctx);
        return ctx;
      }

      // 3. DeepL 번역
      console.log('[TranslationEngine] cache miss → DeepL 호출');
      const translateCtx = await deepLTranslate({
        payload: { 
          text: sourceText, 
          sourceLang, 
          targetLang: targetLang.toUpperCase() 
        },
        traceId,
      });

      if (translateCtx._error) {
        ctx._error = translateCtx._error;
        return ctx;
      }

      const translated = translateCtx.payload.translatedText;

      // 4. 캐시 저장
      await saveCache({ payload: { sourceText, targetLang, translated }, traceId });

      // 5. 결과 설정
      ctx.payload.translated = translated;
      ctx.payload.fromCache = false;
      ctx.payload.source_text = sourceText;
      ctx.payload.standard_vi = translated;
      ctx.payload.southern_vi = translated;
      ctx.payload.is_southern = true;

      // 인터메리 + 개인 사용자 지원
      ctx.payload.marriage_type = marriage_type || null;
      ctx.payload.partner_device_id = partner_device_id || null;
      ctx.payload.context_category = context_category || 'daily';

      // 6. 학습 자산 영구 저장
      ctx = await saveAsLearningAsset(ctx);

      console.log(`[TranslationEngine] 완료 → translated length: ${translated?.length}`);
      return ctx;

    } catch (err) {
      ctx._error = `TranslationEngine error: ${err.message}`;
      console.error('[TranslationEngine]', err);
      return ctx;
    }
  }
};

// 학습 자산 저장 헬퍼
async function saveAsLearningAsset(ctx) {
  try {
    ctx = await saveTranslation(ctx);   // storage.js의 메인 함수
    if (ctx._error) {
      console.warn('[saveAsLearningAsset] 저장 실패:', ctx._error);
    }
  } catch (e) {
    console.warn('[saveAsLearningAsset] exception:', e.message);
  }
  return ctx;
}