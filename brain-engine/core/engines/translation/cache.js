import { getSupabase } from '../../connectors/storage.js';

export async function findCache(ctx) {
  const { text, sourceLang } = ctx.payload;
  if (!text || !sourceLang) return ctx;

  const db = getSupabase();
  if (!db) return ctx;

  const direction = sourceLang === 'ko' ? 'ko->vi' : 'vi->ko';
  const { data } = await db
    .from('tb_trans_logs')
    .select('standard_vi, emotion_score')
    .eq('source_text', text)
    .eq('direction', direction)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return ctx;

  return {
    ...ctx,
    payload: {
      ...ctx.payload,
      translatedText: data.standard_vi,
      translationSource: 'cache',
      emotionScore: data.emotion_score,
    }
  };
}

export async function saveCache(ctx) {
  const { text, sourceLang, translatedText, translationSource } = ctx.payload;
  if (!text || !translatedText || translationSource === 'cache') return ctx;

  const db = getSupabase();
  if (!db) return ctx;

  const direction = sourceLang === 'ko' ? 'ko->vi' : 'vi->ko';
  await db.from('tb_trans_logs').insert({
    source_text: text,
    standard_vi: translatedText,
    direction,
    emotion_score: ctx.payload.emotionScore || 0.5,
    trace_id: ctx.traceId || null,
  });

  return ctx;
}
