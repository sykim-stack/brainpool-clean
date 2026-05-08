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

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        word: data[0]?.standard_vi || 'chép bài',
        meaning: data[0]?.meaning_ko || '필기하다'
      }
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}