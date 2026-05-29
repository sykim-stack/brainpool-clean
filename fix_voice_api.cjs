const fs = require('fs');

const route = `import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { base64, fileName, mimeType } = await request.json();

    if (!base64 || !fileName) {
      return Response.json({ error: 'base64 and fileName required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; }, set: () => {}, remove: () => {} } }
    );

    const buffer = Buffer.from(base64, 'base64');
    console.log('[voice/upload] buffer size:', buffer.length, 'mimeType:', mimeType);

    const { data, error } = await supabase.storage
      .from('voice-recordings')
      .upload(fileName, buffer, {
        contentType: mimeType || 'audio/webm',
        upsert: true,
      });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const { data: urlData } = supabase.storage
      .from('voice-recordings')
      .getPublicUrl(fileName);

    console.log('[voice/upload] 완료:', urlData.publicUrl);
    return Response.json({ success: true, url: urlData.publicUrl });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}`;

fs.writeFileSync('C:/brainpool-clean/brainpool-clean/app/api/voice/upload/route.ts', route, 'utf8');
console.log('완료');
