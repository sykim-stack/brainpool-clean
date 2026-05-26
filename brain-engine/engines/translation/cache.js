// brain-engine/engines/translation/cache.js
// ?????????????????????????????????????????????????????????????
// 踰덉뿭 罹먯떆 ??DB ?뺤씤 / ???
// (ctx) => ctx ?뺥깭 以?? throw 湲덉?
// ?????????????????????????????????????????????????????????????

import { getStorage } from '../../connectors/storage.js';

export async function findCache(ctx) {
  const { text, sourceLang } = ctx.payload;
  if (!text || !sourceLang) return ctx;

  const direction = sourceLang === 'ko' ? 'KO_VI' : 'VI_KO';

  const db = await getStorage();
  if (!db) return ctx; // DB ?놁쑝硫?罹먯떆 ?놁씠 ?듦낵

  const { data, error } = await db
    .from('tb_trans_logs')
    .select('standard_vi, emotion_score, risk_score, intent')
    .eq('source_text', text)
    .eq('direction', direction)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return ctx; // 罹먯떆 誘몄뒪 ???듦낵

  console.log(`[TranslationCache] 罹먯떆 ?덊듃: "${text}"`);

  return {
    ...ctx,
    payload: {
      ...ctx.payload,
      translatedText: data.standard_vi,
      translationSource: 'cache',
      emotionScore: data.emotion_score,
      riskScore: data.risk_score,
      intent: data.intent,
    }
  };
}

export async function saveCache(ctx) {
  const { text, sourceLang, translatedText, translationSource } = ctx.payload;

  // ?대? 罹먯떆?먯꽌 ??寃껋? ?ㅼ떆 ??ν븯吏 ?딆쓬
  if (!text || !translatedText || translationSource === 'cache') return ctx;

  const direction = sourceLang === 'ko' ? 'KO_VI' : 'VI_KO';

  const db = await getStorage();
  if (!db) return ctx;

  const { error } = await db.from('tb_trans_logs').insert({
    source_text: text,
    standard_vi: translatedText,
    direction,
    emotion_score: ctx.payload.emotionScore || 0.5,
    risk_score: ctx.payload.riskScore || 0,
    intent: ctx.payload.intent || null,
    trace_id: ctx.traceId || null,
  });

  if (error) {
    console.warn('[TranslationCache] ????ㅽ뙣:', error.message);
  }

  return ctx;
}
