import { getStorage } from '../connectors/storage.js';

/**
 * BRAINPOOL Dialect Engine
 * 베트남어 방언 자동 생성 엔진
 */
async function generateDialects(standardWord, meaningKo) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn('[dialect] GEMINI_API_KEY가 설정되지 않음');
    return null;
  }

  const prompt = `베트남어: ${standardWord}
한국어 의미: ${meaningKo}

이 베트남어의 주요 방언 변형을 아래 JSON 형식으로만 반환해 주세요. 다른 설명은 절대 하지 마세요.

{
  "southern": "남부 방언 (호치민 스타일)",
  "mekong": "메콩 델타 방언",
  "hue": "후에 방언",
  "example_northern": "북부 지역 예문",
  "example_southern": "남부 지역 예문"
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 800 }
        })
      }
    );

    if (!res.ok) throw new Error(`Gemini API Error: ${res.status}`);

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // JSON 추출 강화
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('[dialect] generateDialects 실패:', e.message);
    return null;
  }
}

/**
 * 메인 함수 - BRAINPOOL 계약서 준수
 */
export async function run(ctx) {
  if (!ctx || ctx._error) return ctx;

  try {
    const { translated, translatedText, sourceLang, text, sourceText } = ctx.payload || {};

    const viWord = sourceLang === 'ko' 
      ? (translated || translatedText || '') 
      : (text || sourceText || '');

    const koWord = sourceLang === 'ko' 
      ? (text || sourceText || '') 
      : (translated || translatedText || '');

    if (!viWord || !koWord) return ctx;

    const db = await getStorage();
    if (!db) {
      console.warn('[dialect] Storage 연결 실패');
      return ctx;
    }

    // 중복 체크
    const { data: existing } = await db
      .from('tp_translations')
      .select('id')
      .eq('standard_word', viWord)
      .maybeSingle();

    if (existing) {
      console.log('[dialect] 이미 존재함:', viWord);
      return ctx;
    }

    // 방언 생성
    const dialects = await generateDialects(viWord, koWord);

    // 저장
    const { error } = await db.from('tp_translations').insert({
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

    if (error) {
      console.error('[dialect] DB Insert 실패:', error);
      ctx._error = `dialect insert failed: ${error.message}`;
    } else {
      console.log('[dialect] 방언 저장 완료:', viWord);
    }

  } catch (e) {
    console.error('[dialect] run() 오류:', e);
    ctx._error = `dialect engine error: ${e.message}`;
  }

  return ctx;
}