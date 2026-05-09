// 기존 import * as EmotionEngine 방식을 named import로 변경합니다.
import * as TranslationEngine from '../engines/translation/index.js';
import { analyze } from '../engines/emotion/index.js';      // 변경
import { detect } from '../engines/language/index.js';      // 변경

// ROUTES도 이에 맞춰 수정합니다.
const ROUTES = {
  translate: TranslationEngine.run,  // 이쪽은 그대로
  emotion: analyze,                   // EmotionEngine.analyze → analyze
  detect: detect
};

// 아래 route 함수는 그대로 유지
export async function route(engine, ctx) {
  const handler = ROUTES[engine];
  if (!handler) {
    return { ...ctx, _error: `Hajun: Unknown engine "${engine}"` };
  }
  return await handler(ctx);
}