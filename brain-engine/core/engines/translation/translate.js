export async function translate(ctx) {
    if (ctx.payload.translatedText) return ctx;

    const { text, sourceLang } = ctx.payload;
    if (!text) return { ...ctx, _error: { code: 'MISSING_TEXT', message: 'text 필드 필요', retryable: false } };

    const targetLang = sourceLang === 'ko' ? 'VI' : 'KO';
    const key = process.env.DEEPL_API_KEY;

    if (!key) {
        return { ...ctx, payload: { ...ctx.payload, translatedText: '[Mock] ' + text, translationSource: 'mock' } };
    }

    const params = new URLSearchParams();
    params.append('text', text);
    params.append('target_lang', targetLang);

    const res = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
            'Authorization': 'DeepL-Auth-Key ' + key,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    }).catch(() => null);

    if (!res || !res.ok) {
        return { ...ctx, payload: { ...ctx.payload, translatedText: '[Mock] ' + text, translationSource: 'mock' } };
    }

    const data = await res.json();
    return {
        ...ctx,
        payload: { ...ctx.payload, translatedText: data.translations[0].text, translationSource: 'deepl' }
    };
}