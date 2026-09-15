import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();
  try {
    const { user_id, subscription } = await request.json();
    if (!user_id || !subscription) {
      return Response.json({ error: 'user_id and subscription required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name) { return cookieStore.get(name)?.value; }, set: () => {}, remove: () => {} } }
    );

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    }, { onConflict: 'user_id,endpoint' });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true, traceId });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}