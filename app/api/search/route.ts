// app/api/search/route.ts
// (ctx) => ctx 패턴, throw 금지
export async function GET(req: Request) {
  const traceId = crypto.randomUUID();
  const url = new URL(req.url);
  const query = url.searchParams.get('q') || '';
  const lang = url.searchParams.get('lang') || 'all';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

  if (!query || query.length < 2) {
    return Response.json(
      { payload: { results: [], total: 0 }, _error: '검색어는 2글자 이상이어야 합니다', traceId },
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = getSupabase();
if (!supabase) { return new Response(JSON.stringify({ error: 'Database connection is not available' }), { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } }); }

  // PGroonga &@~ 연산자는 LIKE와 달리 대소문자 구분 없이 어떤 텍스트라도 포함 검색 가능
  let messageQuery = supabase
    .from('chat_messages')
    .select('id, message, translated_ko, translated_vi, room_id, created_at');
  
  if (lang === 'ko') {
    messageQuery = messageQuery.or(`message.ilike.%${query}%,translated_ko.ilike.%${query}%`);
  } else if (lang === 'vi') {
    messageQuery = messageQuery.or(`message.ilike.%${query}%,translated_vi.ilike.%${query}%`);
  } else {
    messageQuery = messageQuery.or(
      `message.ilike.%${query}%,translated_ko.ilike.%${query}%,translated_vi.ilike.%${query}%`
    );
  }

  const { data: messages, error: msgError } = await messageQuery.limit(limit);

  if (msgError) {
    return Response.json(
      { payload: { results: [], total: 0 }, _error: msgError.message, traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  // 번역 로그에서도 검색
  const { data: transLogs, error: logError } = await supabase
    .from('tb_trans_logs')
    .select('id, source_text, standard_vi, meaning_ko')
    .or(`source_text.ilike.%${query}%,standard_vi.ilike.%${query}%`)
    .limit(limit);

  const results = [
    ...(messages || []).map((m: any) => ({
      type: 'message',
      id: m.id,
      title: m.message?.substring(0, 80),
      snippet: m.translated_ko || m.translated_vi || '',
      roomId: m.room_id,
      createdAt: m.created_at,
    })),
    ...(transLogs || []).map((t: any) => ({
      type: 'translation',
      id: t.id,
      title: t.source_text?.substring(0, 80),
      snippet: t.standard_vi || '',
      meaning: t.meaning_ko || '',
    })),
  ].slice(0, limit);

  return Response.json(
    { payload: { results, total: results.length }, _error: null, traceId },
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}