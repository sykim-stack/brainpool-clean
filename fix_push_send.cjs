const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/api/push/send/route.ts';

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
    const { user_id, room_id, sender_id, title, body, url } = await request.json();

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; }, set: () => {}, remove: () => {} } }
    );

    let query = supabase.from('push_subscriptions').select('*');

    if (room_id) {
      // 룸 참여자 가져오기
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('device_id')
        .eq('room_id', room_id);

      const deviceIds = (participants || [])
        .map((p: any) => p.device_id)
        .filter((id: string) => id !== sender_id);

      if (!deviceIds.length) return Response.json({ success: false, message: 'No other participants' });
      query = query.in('user_id', deviceIds);
    } else if (user_id) {
      query = query.eq('user_id', user_id);
    } else {
      return Response.json({ error: 'user_id or room_id required' }, { status: 400 });
    }

    const { data: subs } = await query;
    if (!subs?.length) return Response.json({ success: false, message: 'No subscriptions' });

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

fs.writeFileSync(path, sendRoute, 'utf8');
console.log('완료');
