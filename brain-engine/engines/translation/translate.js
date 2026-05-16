// engines/translation.js
// BRAINPOOL OS CoreRing - Translation Engine
// (ctx) => ctx 철학 준수 + storage 저장 연동

const { saveTranslation } = require('../connectors/storage');   // CommonJS

export async function translate(ctx) {
  // ctx 기본 구조 보장
  ctx.payload = ctx.payload || {};
  ctx._error = ctx._error || null;
  ctx.device_id = ctx.device_id || ctx.payload.device_id || ctx.payload.user_id;

  const { text, sourceLang, targetLang, marriage_type, partner_device_id, context_category } = ctx.payload;

  if (!text) {
    ctx._error = 'translate: text field is required';
    return ctx;
  }

  try {
    // ==================== 1. DeepL 번역 (기존 로직 그대로 유지) ====================
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
        console.log(`[Translate] DeepL: "${text}" → "${translatedText}"`);
      }
    }

    // DeepL 실패 또는 키 없을 때 Mock
    if (!translatedText) {
      translatedText = '[Mock] ' + text;
      console.log(`[Translate] Mock: "${text}"`);
    }

    // ==================== 2. 인터메리/개인 사용자 메타 정보 추가 ====================
    ctx.payload.translatedText = translatedText;
    ctx.payload.translationSource = translationSource;
    ctx.payload.source_text = text;
    ctx.payload.standard_vi = translatedText;           // 기본 번역

    // 남부 방언 (나중에 고도화 가능)
    ctx.payload.southern_vi = translatedText;           // 현재는 동일하게
    ctx.payload.is_southern = true;

    ctx.payload.marriage_type = marriage_type || null;           // null = 일반 개인 사용자
    ctx.payload.partner_device_id = partner_device_id || null;
    ctx.payload.context_category = context_category || 'daily';
    ctx.payload.is_cultural_adjusted = false;

    // ==================== 3. 학습 자산으로 저장 ====================
    ctx = await saveTranslation(ctx);

    if (ctx._error) {
      console.warn("[Translation] 저장 실패했지만 번역은 성공:", ctx._error);
    } else {
      console.log(`[Translation] 성공 → Asset ID: ${ctx.payload.asset_id}`);
    }

    return ctx;

  } catch (err) {
    ctx._error = `translate engine error: ${err.message}`;
    console.error("[Translation] Critical Error:", err);
    return ctx;
  }
}