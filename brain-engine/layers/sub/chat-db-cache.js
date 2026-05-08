// ============================================================
// 🧠 BRAINPOOL OS – CoreChatLayer / Sub: DB Cache Layer
// ============================================================
// 역할: 번역 캐싱 + 학습 데이터 저장 + 단어 검색
// ============================================================

let supabaseAdmin = null;
async function getSupabase() {
  if (!supabaseAdmin) {
    const { createClient } = await import('@supabase/supabase-js');
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    console.log('🗄️ [DBCache] Supabase 연결 완료');
  }
  return supabaseAdmin;
}

async function findCachedTranslation(sourceText, direction) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('tb_trans_logs')
    .select('*')
    .eq('source_text', sourceText)
    .eq('direction', direction)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return {
    translated: data.standard_vi,
    southern: data.southern_vi,
    emotionScore: data.emotion_score,
    intent: data.intent,
    intentConf: data.intent_conf,
    riskScore: data.risk_score,
    conflictCount: data.conflict_count,
    detectedDialect: data.detected_dialect,
    keywords: data.keywords,
    source: 'database',
  };
}

async function saveTranslation(sourceText, direction, result) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from('tb_trans_logs')
    .insert({
      source_text: sourceText,
      standard_vi: result.translated,
      southern_vi: result.southern || null,
      direction: direction,
      emotion_score: result.emotionScore || 0.5,
      intent: result.intent || null,
      intent_conf: result.intentConf || null,
      risk_score: result.riskScore || 0,
      conflict_count: result.conflictCount || 0,
      detected_dialect: result.detectedDialect || null,
      keywords: result.keywords || [],
      session_id: result.traceId || null,
      user_id: result.userId || 'anonymous',
    });

  if (error) console.error(`❌ [DBCache] 저장 실패:`, error.message);
  else console.log(`💾 [DBCache] 저장 완료: "${sourceText}"`);
}

async function searchWord(word) {
  const supabase = await getSupabase();
  const [{ data: trans }, { data: conflict }] = await Promise.all([
    supabase.from('tp_translations').select('*').eq('standard_word', word).single(),
    supabase.from('tp_conflicts').select('*').eq('word', word).single(),
  ]);
  return { translation: trans, conflict: conflict };
}

const actionMap = {
  FIND_CACHE: async (ctx) => {
    const { sourceText, direction } = ctx.payload || {};
    ctx.cached = await findCachedTranslation(sourceText, direction);
    return ctx;
  },
  SAVE_TRANSLATION: async (ctx) => {
    const { sourceText, direction, result } = ctx.payload || {};
    await saveTranslation(sourceText, direction, result);
    return ctx;
  },
  SEARCH_WORD: async (ctx) => {
    const { word } = ctx.payload || {};
    ctx.wordData = await searchWord(word);
    return ctx;
  },
};

async function ChatDBCacheLayer(ctx) {
  if (!ctx || ctx._error) return ctx;
  const { type } = ctx;
  const handler = actionMap[type];
  if (!handler) return ctx;
  try { return await handler(ctx); }
  catch (err) { console.error(`❌ [DBCache] 오류:`, err.message); ctx._error = err.message; return ctx; }
}

module.exports = ChatDBCacheLayer;