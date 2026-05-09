// brain-engine/hajun/router.js 수정
import * as TranslationEngine from '../engines/translation/index.js';
import * as EmotionEngine from '../engines/emotion/index.js';
import { detect } from '../engines/language/index.js';

console.log('EmotionEngine exports:', Object.keys(EmotionEngine)); // 디버깅용

const ROUTES = {
  translate: TranslationEngine.run,
  emotion: EmotionEngine.analyze, // EmotionEngine 객체에 analyze 함수가 있어야 함
  detect: detect
};

export async function route(engine, ctx) {
  const handler = ROUTES[engine];
  if (!handler) {
    return { ...ctx, _error: `Hajun: Unknown engine "${engine}"` };
  }
  console.log(`[Hajun] route → ${engine} [${ctx.traceId || 'no-trace'}]`);
  return await handler(ctx);
}