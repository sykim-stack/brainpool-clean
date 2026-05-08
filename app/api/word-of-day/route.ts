import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 오늘의 단어: tp_translations 테이블에서 랜덤 또는 날짜 기반
    const { data, error } = await supabase
      .from('tp_translations')
      .select('standard_vi, meaning_ko')
      .limit(1)
      .order('usage_count', { ascending: false }); // 인기순 예시

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: { word: data[0]?.standard_vi || 'chép bài', meaning: data[0]?.meaning_ko || '필기하다' }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}