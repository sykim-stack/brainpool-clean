export async function translate(ctx) {
  if (ctx.payload.translatedText) return ctx;
  const { text, sourceLang, targetLang } = ctx.payload;
  if (!text) return { ...ctx, _error: 'translate: text field required' };
  const target = (targetLang || (sourceLang === 'ko' ? 'VI' : 'KO')).toUpperCase();
  const key = process.env.DEEPL_API_KEY;
  if (!key) {
    return { ...ctx, payload: { ...ctx.payload, translatedText: '[Mock] ' + text, translationSource: 'mock' } };
  }
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
  if (!res || !res.ok) {
    return { ...ctx, payload: { ...ctx.payload, translatedText: '[Mock] ' + text, translationSource: 'mock' } };
  }
  const data = await res.json();
  const translatedText = data.translations[0].text;
  console.log('[Translate] DeepL: "' + text + '" -> "' + translatedText + '"');
  return { ...ctx, payload: { ...ctx.payload, translatedText, translationSource: 'deepl' } };
}