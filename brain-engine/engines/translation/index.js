// engines/translation/index.js
// BRAINPOOL OS TranslationEngine - Hajun Router 호환 + 학습 자산 저장

import { detect } from '../language/detect.js';
import { findCache, saveCache } from './cache.js';
import { translate as deepLTranslate } from './translate.js';
import { saveTranslation } from '../../connectors/storage.js';   // ← 저장 함수 import

export const TranslationEngine = {
  run: async (ctx) => {
    const { sourceText, targetLang = 'vi', marriage_type, partner_device_id, context_category } = ctx.payload || {};
    const traceId = ctx.traceId || 'trace_' + Date.now();

    console.log(`[TranslationEngine] run start: "${sourceText}" -> ${targetLang}, traceId=${traceId}`);

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
        console.log(`[TranslationEngine] detected lang: ${sourceLang}`);
      }

      // 2. 캐시 확인
      const cacheCtx = await findCache({ payload: { sourceText, targetLang }, traceId });
      if (cacheCtx.payload?.translated) {
        console.log('[TranslationEngine] cache hit');

        ctx.payload.translated = cacheCtx.payload.translated;
        ctx.payload.fromCache = true;

        // 캐시 히트일 때도 학습 자산으로 저장 (반복 학습 강화)
        ctx = await saveAsLearningAsset(ctx);
        return ctx;
      }

      console.log('[TranslationEngine] cache miss, calling DeepL');

      // 3. DeepL 번역
      const translateCtx = await deepLTranslate({
        payload: { 
          text: sourceText, 
          sourceLang, 
          targetLang: targetLang.toUpperCase() 
        },
        traceId,
      });

      if (translateCtx._error) {
        console.error('[TranslationEngine] DeepL error:', translateCtx._error);
        ctx._error = translateCtx._error;
        return ctx;
      }

      const translated = translateCtx.payload.translatedText;

      // 4. 캐시 저장
      await saveCache({ 
        payload: { sourceText, targetLang, translated }, 
        traceId 
      });

      // 5. 최종 결과 설정
      ctx.payload.translated = translated;
      ctx.payload.fromCache = false;
      ctx.payload.source_text = sourceText;
      ctx.payload.standard_vi = translated;
      ctx.payload.southern_vi = translated;        // 필요시 나중에 분리
      ctx.payload.is_southern = true;

      // 인터메리 + 개인 사용자 메타정보
      ctx.payload.marriage_type = marriage_type || null;
      ctx.payload.partner_device_id = partner_device_id || null;
      ctx.payload.context_category = context_category || 'daily';
      ctx.payload.is_cultural_adjusted = false;

      // 6. 학습 자산으로 영구 저장 (가장 중요)
      ctx = await saveAsLearningAsset(ctx);

      console.log(`[TranslationEngine] 완료 - translated: "${translated}"`);
      return ctx;

    } catch (err) {
      ctx._error = `TranslationEngine error: ${err.message}`;
      console.error("[TranslationEngine] Critical Error:", err);
      return ctx;
    }
  }
};

// 내부 헬퍼 함수
async function saveAsLearningAsset(ctx) {
  try {
    ctx = await saveTranslation(ctx);
    if (!ctx._error) {
      console.log(`[TranslationEngine] 학습 자산 저장 완료 - Asset ID: ${ctx.payload?.asset_id}`);
    }
  } catch (err) {
    console.warn('[TranslationEngine] 학습 자산 저장 실패 (번역은 성공):', err.message);
    // 저장 실패해도 번역 결과는 유지
  }
  return ctx;
}