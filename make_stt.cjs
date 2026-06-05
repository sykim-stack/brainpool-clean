const fs = require('fs');
fs.mkdirSync('C:/brainpool-clean/brainpool-clean/app/api/voice/stt', { recursive: true });

const route = `import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const lang = formData.get('lang') as string || 'vi';

    if (!file) return Response.json({ error: 'file required' }, { status: 400 });

    console.log('[STT] file size:', file.size, 'lang:', lang);

    // Whisper API 호출
    const whisperForm = new FormData();
    whisperForm.append('file', file, 'audio.webm');
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('language', lang);

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${process.env.OPENAI_API_KEY}\`,
      },
      body: whisperForm,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[STT] Whisper 오류:', err);
      return Response.json({ error: err }, { status: 500 });
    }

    const data = await res.json();
    console.log('[STT] 결과:', data.text);
    return Response.json({ success: true, text: data.text });
  } catch (err: any) {
    console.error('[STT] catch:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}`;

fs.writeFileSync('C:/brainpool-clean/brainpool-clean/app/api/voice/stt/route.ts', route, 'utf8');
console.log('완료');
