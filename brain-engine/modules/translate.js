export async function translate(ctx) {
  const { text, targetLang = 'VI' } = ctx.payload;
  const key = process.env.DEEPL_API_KEY;

  if (!key) {
    console.warn('DEEPL_API_KEY is missing');
    return { ...ctx, payload: { ...ctx.payload, translatedText: `[Mock] ${text}`, source: 'mock' } };
  }

  try {
    // URLSearchParams는 반드시 new URLSearchParams()로 생성
    const params = new URLSearchParams();
    params.append('text', text);
    params.append('target_lang', targetLang.toUpperCase());

    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${key}`,
        // Content-Type을 명시적으로 지정 (URLSearchParams는 자동으로 설정하기도 하지만 명시해도 됨)
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,  // URLSearchParams 객체 자체를 그대로 전달
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`DeepL responded with ${response.status}: ${errorText}`);
      throw new Error(`DeepL error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.translations[0].text;
    console.log(`✅ DeepL: "${text}" -> "${translatedText}"`);
    return { ...ctx, payload: { ...ctx.payload, translatedText, source: 'deepl' } };
  } catch (err) {
    console.error('DeepL fetch failed:', err.message);
    // fallback
    return { ...ctx, payload: { ...ctx.payload, translatedText: `[Mock] ${text}`, source: 'mock' } };
  }
}