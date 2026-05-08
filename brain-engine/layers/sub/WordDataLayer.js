// brain-engine/layers/sub/WordDataLayer.js
// 모든 함수는 (ctx) => ctx 형태, throw 금지

async function getWordData(ctx) {
  const { word, lang = 'vi' } = ctx.payload || {};

  if (!word) {
    ctx._error = 'word 필드가 필요합니다';
    return ctx;
  }

  const supabase = ctx.supabase; // ctx를 통해 Supabase 클라이언트 주입

  // 1. 방언 사전(tp_translations)에서 표준어/방언 조회
  const { data: dialect, error: dialectErr } = await supabase
    .from('tp_translations')
    .select('*')
    .eq('standard_vi', word)
    .single();

  if (dialectErr && dialectErr.code !== 'PGRST116') {
    ctx._error = `방언 조회 실패: ${dialectErr.message}`;
    return ctx;
  }

  // 2. 번역 로그(tb_trans_logs)에서 감정/위험/의도 조회
  const { data: log, error: logErr } = await supabase
    .from('tb_trans_logs')
    .select('emotion_score, risk_score, intent, standard_vi')
    .eq('standard_vi', word)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (logErr && logErr.code !== 'PGRST116') {
    ctx._error = `로그 조회 실패: ${logErr.message}`;
    return ctx;
  }

  // 3. 문화 충돌(tp_conflicts)에서 위험 단어 조회
  const { data: conflicts } = await supabase
    .from('tp_conflicts')
    .select('*')
    .eq('word', word);

  // 4. 응답 조립
  ctx.payload = {
    word,
    standard: dialect?.standard_vi || word,
    southern: dialect?.southern_vi || null,
    hue: dialect?.hue_vi || null,
    mekong: dialect?.mekong_vi || null,
    meaning: dialect?.meaning_ko || null,
    usage: log?.intent || null,
    examples: dialect?.examples || [],
    riskScore: log?.risk_score || 0,
    culturalNote: conflicts?.length > 0
      ? conflicts.map(c => c.description).join('; ')
      : '문화적 맥락을 분석 중입니다.',
    emotion: log?.emotion_score !== undefined
      ? (log.emotion_score > 0.3 ? 'positive' : 'neutral')
      : 'neutral',
    relatedWords: dialect?.related_words || [word],
  };

  return ctx;
}

module.exports = { getWordData };