// brain-engine/engines/translation/translate.js
// DeepL 번역 전용 함수 (ES Module)

export async function translate(ctx) {
  ctx.payload = ctx.payload || {};
  ctx._error = ctx._error || null;

  const { text, sourceLang, targetLang } = ctx.payload;

  if (!text) {
    ctx._error = 'translate: text field is required';
    return ctx;
  }

  try {
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
        console.log(`[DeepL] "${text}" → "${translatedText}"`);
      }
    }

    if (!translatedText) {
      translatedText = '[Mock] ' + text;
      console.log(`[DeepL] Mock: "${text}"`);
    }

    ctx.payload.translatedText = translatedText;
    ctx.payload.translationSource = translationSource;

    return ctx;

  } catch (err) {
    ctx._error = `DeepL translate error: ${err.message}`;
    console.error(err);
    return ctx;
  }
}