// brain-engine/engines/translation/cache.js
// -----------------------------------------------------------------
// 번역 캐시 + DB 확인 / 저장
// (ctx) => ctx 형태 준수, throw 금지
// -----------------------------------------------------------------

import { getStorage } from '../../connectors/storage.js';

export async function findCache(ctx) {
  const { text, sourceLang } = ctx.payload;
  if (!text || !sourceLang) return ctx;

  const direction = sourceLang === 'ko' ? 'KO_VI' : 'VI_KO';

  const db = await getStorage();
  if (!db) return ctx; // DB 없으면 캐시 없이 통과

  const { data, error } = await db
    .from('tb_trans_logs')
    .select('standard_vi, emotion_score, risk_score, intent, meaning_score, detected_dialect, final_dialect, is_southern, cultural_notes')
    .eq('source_text', text)
    .eq('direction', direction)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return ctx; // 캐시 미스도 통과

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
      meaningScore: data.meaning_score,
      detectedDialect: data.detected_dialect,
      finalDialect: data.final_dialect,
      isSouthern: data.is_southern,
      culturalNote: data.cultural_notes?.warning || data.cultural_notes?.ko || null,
    }
  };
}

export async function saveCache(ctx) {
  const { text, sourceLang, translatedText, translationSource } = ctx.payload;

  // 이미 캐시에서 온 것은 다시 저장하지 않음
  if (!text || !translatedText || translationSource === 'cache') return ctx;

  const direction = sourceLang === 'ko' ? 'KO_VI' : 'VI_KO';

  const db = await getStorage();
  if (!db) return ctx;

  const { data, error } = await db.from('tb_trans_logs').insert({
    source_text: text,
    standard_vi: translatedText,
    direction,
    emotion_score: ctx.payload.emotionScore ?? 0.5,
    risk_score: ctx.payload.riskScore ?? 0,
    conflict_count: ctx.payload.conflictCount ?? 0,
    intent: ctx.payload.intent || null,
    intent_conf: ctx.payload.intentConf || null,
    meaning_score: ctx.payload.meaningScore ?? null,
    detected_dialect: ctx.payload.detectedDialect || 'unknown',
    final_dialect: ctx.payload.finalDialect || null,
    is_southern: ctx.payload.isSouthern ?? false,
    cultural_notes: ctx.payload.culturalNote ? { warning: ctx.payload.culturalNote } : null,
    is_cultural_adjusted: !!ctx.payload.culturalNote,
    trace_id: ctx.traceId || null,
  }).select('id').single();

  if (error) {
    console.warn('[TranslationCache] 저장 실패:', error.message);
  } else if (data?.id) {
    // 백그라운드 분석이 완료된 후 이 id로 UPDATE할 수 있도록 ctx에 보존
    ctx.payload.logId = data.id;
    console.log(`[TranslationCache] 저장 완료 id=${data.id}`);
  }

  return ctx;
}