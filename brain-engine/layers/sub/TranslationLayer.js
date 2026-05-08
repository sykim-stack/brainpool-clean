// brain-engine/layers/sub/TranslationLayer.js
export class TranslationLayer {
  constructor() {
    this.cache = new Map();
  }

  async process(ctx) {
    let { text, targetLang, sourceLang } = ctx.payload;

    // targetLang이 없으면 sourceLang의 반대 방향으로 자동 결정
    if (!targetLang && sourceLang) {
      targetLang = sourceLang === 'ko' ? 'vi' : 'ko';
      console.log(`[TranslationLayer] 자동 결정: sourceLang=${sourceLang} → targetLang=${targetLang}`);
    }
    const finalTargetLang = (targetLang || 'VI').toUpperCase();

    const cacheKey = `${text}:${finalTargetLang}`;
    if (this.cache.has(cacheKey)) {
      return {
        ...ctx,
        payload: {
          ...ctx.payload,
          translatedText: this.cache.get(cacheKey),
          translationSource: 'cache'
        }
      };
    }

    const key = process.env.DEEPL_API_KEY;
    let translatedText = `[Mock] ${text}`;
    let translationSource = 'mock';

    if (key) {
      try {
        const params = new URLSearchParams();
        params.append('text', text);
        params.append('target_lang', finalTargetLang);
        const res = await fetch('https://api-free.deepl.com/v2/translate', {
          method: 'POST',
          headers: {
            Authorization: `DeepL-Auth-Key ${key}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params
        });
        if (res.ok) {
          const data = await res.json();
          translatedText = data.translations[0].text;
          translationSource = 'deepl';
          this.cache.set(cacheKey, translatedText);
        }
      } catch (err) {
        console.warn('DeepL error, fallback to mock');
      }
    }

    return {
      ...ctx,
      payload: {
        ...ctx.payload,
        translatedText,
        translationSource
      }
    };
  }
}