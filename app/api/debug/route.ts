// app/api/debug/route.ts
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('corenull_interests').select('*').limit(1);

  return Response.json({
    status: error ? 'error' : 'ok',
    db: error ? error.message : 'connected',
    timestamp: new Date().toISOString(),
  });
}