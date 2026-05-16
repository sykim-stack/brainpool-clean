// engines/translation/index.js
// BRAINPOOL OS - Translation Engine (Hajun Router 호환)

import { saveTranslation } from '../../connectors/storage.js';

export const TranslationEngine = {
  async run(ctx) {
    // ctx 기본 구조 보장
    ctx.payload = ctx.payload || {};
    ctx._error = ctx._error || null;
    ctx.device_id = ctx.device_id || ctx.payload.device_id || ctx.payload.user_id;
    ctx.traceId = ctx.traceId || 'trace_' + Date.now();

    const { text, sourceLang, targetLang, marriage_type, partner_device_id, context_category } = ctx.payload;

    if (!text) {
      ctx._error = 'translate: text field is required';
      return ctx;
    }

    try {
      // ==================== DeepL 번역 (기존 로직 완전 유지) ====================
      let translatedText = '';
      let translationSource = 'mock';

      const target = (targetLang || (sourceLang === 'ko' ? 'VI' : 'KO')).toUpperCase();
      const key = process.env.DEEPL_API_KEY;

      if (key) {
        const params = new URLSearchParams();
        params.append('text', text);
        params.append('target_lang', target);

        const res = await fetch('https://api-free.deepl.com/v2/translate', {
          method: 'POST',
          headers: {
            'Authorization': 'DeepL-Auth-Key ' + key,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json();
          translatedText = data.translations[0].text;
          translationSource = 'deepl';
        }
      }

      if (!translatedText) {
        translatedText = '[Mock] ' + text;
      }

      console.log(`[Translation] ${translationSource}: "${text}" → "${translatedText}"`);

      // ==================== 출력 및 메타 정보 ====================
      ctx.payload.translatedText = translatedText;
      ctx.payload.translationSource = translationSource;
      ctx.payload.source_text = text;
      ctx.payload.standard_vi = translatedText;
      ctx.payload.southern_vi = translatedText;        // 현재는 동일
      ctx.payload.is_southern = true;

      // 인터메리 + 개인 사용자 모두 지원
      ctx.payload.marriage_type = marriage_type || null;
      ctx.payload.partner_device_id = partner_device_id || null;
      ctx.payload.context_category = context_category || 'daily';
      ctx.payload.is_cultural_adjusted = false;

      // ==================== 학습 자산 저장 ====================
      ctx = await saveTranslation(ctx);

      if (ctx._error) {
        console.warn(`[Translation] 저장 실패 (${ctx._error})`);
      } else {
        console.log(`[Translation] 저장 완료 - Asset ID: ${ctx.payload.asset_id}`);
      }

      return ctx;

    } catch (err) {
      ctx._error = `TranslationEngine error: ${err.message}`;
      console.error("[TranslationEngine] Critical Error:", err);
      return ctx;
    }
  }
};