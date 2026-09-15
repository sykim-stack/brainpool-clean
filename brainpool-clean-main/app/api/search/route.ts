// app/api/search/route.ts
import { getSupabase } from '@/lib/supabase';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
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

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json(
      { payload: null, _error: 'Database connection is not available', traceId },
      { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  let messageQuery = supabase
    .from('chat_messages')
    .select('id, message, translated_ko, translated_vi, room_id, created_at')
    .limit(limit);

  if (lang === 'ko') {
    messageQuery = messageQuery.or(`message.ilike.%${query}%,translated_ko.ilike.%${query}%`);
  } else if (lang === 'vi') {
    messageQuery = messageQuery.or(`message.ilike.%${query}%,translated_vi.ilike.%${query}%`);
  } else {
    messageQuery = messageQuery.or(
      `message.ilike.%${query}%,translated_ko.ilike.%${query}%,translated_vi.ilike.%${query}%`
    );
  }

  const { data: messages, error: msgError } = await messageQuery;

  if (msgError) {
    return Response.json(
      { payload: { results: [], total: 0 }, _error: msgError.message, traceId },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

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
