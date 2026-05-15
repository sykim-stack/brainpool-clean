import { getStorage } from './connectors/storage.js';

async function generateDialects(standardWord, meaningKo) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const prompt = 베트남어 단어/문장: 
한국어 뜻: 

이 베트남어의 방언 변형을 JSON으로 반환해주세요:
{
  southern: 남부 방언 (호치민),
  mekong: 메콩 델타 방언,
  hue: 후에 방언,
  example_northern: 북부 예문,
  example_southern: 남부 예문
}
JSON만 반환하고 다른 텍스트는 없이.;

  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/\\\json|\\\/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

export async function run(ctx) {
  if (!ctx || ctx._error) return ctx;

  const { translated, translatedText, sourceLang, text, sourceText } = ctx.payload;
  const viWord = sourceLang === 'ko' ? (translated || translatedText) : (text || sourceText);
  const koWord = sourceLang === 'ko' ? (text || sourceText) : (translated || translatedText);

  if (!viWord || !koWord) return ctx;

  // 중복 체크
  const db = await getStorage();
  if (!db) return ctx;

  const { data: existing } = await db
    .from('tp_translations')
    .select('id')
    .eq('standard_word', viWord)
    .maybeSingle();

  if (existing) return ctx; // 이미 있으면 스킵

  // Gemini로 방언 생성
  const dialects = await generateDialects(viWord, koWord);

  // DB 저장
  await db.from('tp_translations').insert({
    standard_word: viWord,
    southern_word: dialects?.southern || null,
    hue_word: dialects?.hue || null,
    mekong_word: dialects?.mekong || null,
    meaning_ko: koWord,
    example_northern: dialects?.example_northern || null,
    example_southern: dialects?.example_southern || null,
    part_of_speech: '자동생성',
    status: 'auto',
    source: 'chat-pipeline',
  });

  console.log('[dialect] 저장 완료:', viWord, '->', koWord);
  return ctx;
}