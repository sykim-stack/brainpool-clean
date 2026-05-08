// app/api/word-of-day/route.ts
import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return new Response(
      JSON.stringify({ error: 'Database connection is not available' }),
      { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  try {
    const { data, error } = await supabase
      .from('tp_translations')
      .select('standard_vi, meaning_ko')
      .limit(1)
      .order('usage_count', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }

    // TypeScript 타입 추론을 위한 any[] 처리
    const result: any[] = data as any[] || [];

    return NextResponse.json({
      success: true,
      data: {
        word: result.length > 0 ? result[0].standard_vi : 'chép bài',
        meaning: result.length > 0 ? result[0].meaning_ko : '필기하다'
      }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}