const fs = require('fs');

const route = `import type { NextRequest } from 'next/server';
import webpush from 'web-push';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  // 런타임에 VAPID 설정 (빌드타임 오류 방지)
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  try {
    const { user_id, room_id, sender_id, title, body, url } = await request.json();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; }, set: () => {}, remove: () => {} } }
    );

    let subs: any[] = [];

    if (room_id && sender_id) {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('*')
        .neq('user_id', sender_id);
      subs = data || [];
    } else if (user_id) {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user_id);
      subs = data || [];
    } else {
      return Response.json({ error: 'user_id or room_id required' }, { status: 400 });
    }

    if (!subs.length) return Response.json({ success: false, message: 'No subscriptions' });

    const payload = JSON.stringify({
      title: title || 'CoreRing',
      body: body || '새 메시지!',
      url: url || '/'
    });

    const results = await Promise.allSettled(
      subs.map((sub: any) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    console.log('[Push] 발송 완료:', sent + '/' + subs.length);
    return Response.json({ success: true, sent });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}`;

fs.writeFileSync('C:/brainpool-clean/brainpool-clean/app/api/push/send/route.ts', route, 'utf8');
console.log('완료');
