// app/api/debug/route.ts
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  const supabase = getSupabase();
if (!supabase) { return new Response(JSON.stringify({ error: 'Database connection is not available' }), { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } }); }
  const { data, error } = await supabase.from('corenull_interests').select('*').limit(1);

  return Response.json({
    status: error ? 'error' : 'ok',
    db: error ? error.message : 'connected',
    timestamp: new Date().toISOString(),
  });
}