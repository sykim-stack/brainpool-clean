import { TranslationEngine } from '../engines/translation/index.js';   // named import
import { analyze } from '../engines/emotion/index.js';
import { detect } from '../engines/language/index.js';

const ROUTES = {
  translate: TranslationEngine.run,   // 이제 run을 찾을 수 있음
  emotion: analyze,
  detect: detect,
};

export async function route(engine, ctx) {
  const handler = ROUTES[engine];
  if (!handler) {
    console.error(`[Hajun] 알 수 없는 엔진: ${engine}`);
    return { ...ctx, _error: `Unknown engine: ${engine}` };
  }
  console.log(`[Hajun] route -> ${engine}, traceId=${ctx.traceId}`);
  try {
    return await handler(ctx);
  } catch (err) {
    console.error(`[Hajun] ${engine} 실행 중 오류:`, err);
    return { ...ctx, _error: err.message };
  }
}