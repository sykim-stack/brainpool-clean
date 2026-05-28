const fs = require('fs');
fs.mkdirSync('C:/brainpool-clean/brainpool-clean/app/api/voice/upload', { recursive: true });

const route = `import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;
    const fileName = formData.get('fileName') as string;

    if (!file || !fileName) {
      return Response.json({ error: 'file and fileName required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; }, set: () => {}, remove: () => {} } }
    );

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from('voice-recordings')
      .upload(fileName, buffer, {
        contentType: 'audio/webm',
        upsert: true,
      });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const { data: urlData } = supabase.storage
      .from('voice-recordings')
      .getPublicUrl(fileName);

    return Response.json({ success: true, url: urlData.publicUrl });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}`;

fs.writeFileSync('C:/brainpool-clean/brainpool-clean/app/api/voice/upload/route.ts', route, 'utf8');
console.log('완료');
