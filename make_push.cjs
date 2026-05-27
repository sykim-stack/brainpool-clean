const fs = require('fs');
fs.mkdirSync('C:/brainpool-clean/brainpool-clean/app/api/push/subscribe', { recursive: true });
fs.mkdirSync('C:/brainpool-clean/brainpool-clean/app/api/push/send', { recursive: true });

const subscribeRoute = `import type { NextRequest } from 'next/server';
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
}`;

const sendRoute = `import type { NextRequest } from 'next/server';
import webpush from 'web-push';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { user_id, title, body, url } = await request.json();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name) { return cookieStore.get(name)?.value; }, set: () => {}, remove: () => {} } }
    );

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (!subs?.length) return Response.json({ success: false, message: 'No subscriptions' });

    const payload = JSON.stringify({ title: title || 'CoreRing', body: body || '새 메시지!', url: url || '/' });

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );

    return Response.json({ success: true, sent: results.filter(r => r.status === 'fulfilled').length });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}`;

fs.writeFileSync('C:/brainpool-clean/brainpool-clean/app/api/push/subscribe/route.ts', subscribeRoute, 'utf8');
fs.writeFileSync('C:/brainpool-clean/brainpool-clean/app/api/push/send/route.ts', sendRoute, 'utf8');
console.log('완료');
