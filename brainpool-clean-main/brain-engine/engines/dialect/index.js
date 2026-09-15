// brain-engine/engines/dialect/index.js
import { getStorage } from '../../connectors/storage.js';

export async function saveDialect(ctx) {
  try {
    const { text, sourceLang, translatedText } = ctx.payload || {};
    if (!text || !translatedText || !sourceLang) return ctx;

    const viWord = sourceLang === 'ko' ? translatedText : text;
    const koWord = sourceLang === 'ko' ? text : translatedText;

    if (!viWord || !koWord) return ctx;

    const db = await getStorage();
    if (!db) return ctx;

    const { data: existing } = await db
      .from('tp_translations')
      .select('id')
      .eq('standard_word', viWord)
      .maybeSingle();

    if (existing) return ctx;

    await db.from('tp_translations').insert({
      standard_word: viWord,
      meaning_ko:    koWord,
      part_of_speech: '자동생성',
      status:         'auto',
      source:         'chat-pipeline',
    });

    console.log(`[dialect] 저장: ${viWord} = ${koWord}`);
  } catch (e) {
    console.warn('[dialect] 저장 실패 (무시):', e.message);
  }
  return ctx;
}
