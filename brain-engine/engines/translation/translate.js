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

    if (!key) {
      console.warn('[DeepL] DEEPL_API_KEY 환경변수가 비어있음 — Mock으로 대체됨');
    }

    if (key) {
      const params = new URLSearchParams();
      params.append('text', text);
      params.append('target_lang', target);

      let res;
      try {
        res = await fetch('https://api-free.deepl.com/v2/translate', {
          method: 'POST',
          headers: {
            'Authorization': 'DeepL-Auth-Key ' + key,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        });
      } catch (fetchErr) {
        console.error('[DeepL] fetch 자체 실패 (네트워크/도메인 차단 가능성):', fetchErr.message);
        res = null;
      }

      if (res && res.ok) {
        const data = await res.json();
        translatedText = data.translations[0].text;
        translationSource = 'deepl';
        console.log(`[DeepL] "${text}" → "${translatedText}"`);
      } else if (res) {
        // 응답은 왔는데 실패한 경우 -- 원인을 반드시 로그로 남긴다
        const errBody = await res.text().catch(() => '(본문 읽기 실패)');
        console.error(`[DeepL] API 실패 status=${res.status} body=${errBody}`);
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