// brain-engine/engines/translation/cache.js
// 번역 캐시 조회/저장 — tb_trans_logs

import { getStorage } from '../../lib/storage.js';

export async function loadCache(ctx) {
  const { text, sourceLang } = ctx.payload || {};
  if (!text) return ctx;

  const direction = sourceLang === 'ko' ? 'KO_VI' : 'VI_KO';
  const db = await getStorage();
  if (!db) return ctx;

  try {
    const { data, error } = await db
      .from('tb_trans_logs')
      .select('id, standard_vi, emotion_score, risk_score, conflict_count, intent, intent_conf, meaning_score, detected_dialect, final_dialect, is_southern, cultural_notes')
      .eq('source_text', text)
      .eq('direction', direction)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[TranslationCache] 조회 실패:', error.message);
      return ctx;
    }

    if (data?.standard_vi) {
      // 오염된 Mock 캐시는 히트로 쓰지 않음
      if (typeof data.standard_vi === 'string' && data.standard_vi.startsWith('[Mock]')) {
        console.warn('[TranslationCache] [Mock] 캐시 히트 무시 id=', data.id);
        return ctx;
      }
      ctx.payload.translatedText = data.standard_vi;
      ctx.payload.translationSource = 'cache';
      ctx.payload.logId = data.id;
      if (data.emotion_score != null) ctx.payload.emotionScore = data.emotion_score;
      if (data.risk_score != null) ctx.payload.riskScore = data.risk_score;
      if (data.conflict_count != null) ctx.payload.conflictCount = data.conflict_count;
      if (data.intent) ctx.payload.intent = data.intent;
      if (data.intent_conf) ctx.payload.intentConf = data.intent_conf;
      if (data.meaning_score != null) ctx.payload.meaningScore = data.meaning_score;
      if (data.detected_dialect) ctx.payload.detectedDialect = data.detected_dialect;
      if (data.final_dialect) ctx.payload.finalDialect = data.final_dialect;
      if (data.is_southern != null) ctx.payload.isSouthern = data.is_southern;
      if (data.cultural_notes) ctx.payload.culturalNote = data.cultural_notes?.warning || null;
      console.log(`[TranslationCache] 히트 id=${data.id}`);
    }
  } catch (e) {
    console.warn('[TranslationCache] 조회 예외:', e.message);
  }

  return ctx;
}

export async function saveCache(ctx) {
  const { text, sourceLang, translatedText, translationSource } = ctx.payload || {};

  // 이미 캐시에서 온 것은 다시 저장하지 않음
  // Mock([Mock] 원문)은 영구 캐시에 넣지 않음 — DeepL 실패 시 오염 방지 (P0-5)
  if (!text || !translatedText || translationSource === 'cache') return ctx;
  if (translationSource === 'mock') {
    console.warn('[TranslationCache] mock 결과 저장 스킵');
    return ctx;
  }
  if (typeof translatedText === 'string' && translatedText.startsWith('[Mock]')) {
    console.warn('[TranslationCache] [Mock] 접두 텍스트 저장 스킵');
    return ctx;
  }

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
    ctx.payload.logId = data.id;
    console.log(`[TranslationCache] 저장 완료 id=${data.id}`);
  }

  return ctx;
}
