// brain-engine/engines/translation/cache.js
// ─────────────────────────────────────────────────────────────
// 번역 캐시 — DB 확인 / 저장
// (ctx) => ctx 형태 준수, throw 금지
// ─────────────────────────────────────────────────────────────

import { getStorage } from '../../connectors/storage.js';

export async function findCache(ctx) {
  const { text, sourceLang } = ctx.payload;
  if (!text || !sourceLang) return ctx;

  const direction = sourceLang === 'ko' ? 'ko→vi' : 'vi→ko';

  const db = await getStorage();
  if (!db) return ctx; // DB 없으면 캐시 없이 통과

  const { data, error } = await db
    .from('tb_trans_logs')
    .select('standard_vi, emotion_score, risk_score, intent')
    .eq('source_text', text)
    .eq('direction', direction)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return ctx; // 캐시 미스 → 통과

  console.log(`[TranslationCache] 캐시 히트: "${text}"`);

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

  // 이미 캐시에서 온 것은 다시 저장하지 않음
  if (!text || !translatedText || translationSource === 'cache') return ctx;

  const direction = sourceLang === 'ko' ? 'ko→vi' : 'vi→ko';

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
    console.warn('[TranslationCache] 저장 실패:', error.message);
  }

  return ctx;
}