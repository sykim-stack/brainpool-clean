// brain-engine/hajun/router.js
// BRAINPOOL OS Hajun Router - (ctx) => ctx

import { TranslationEngine } from '../engines/translation/index.js';

const ROUTES = {
  translate: TranslationEngine.run,
  // emotion: analyze,
  // detect: detect,
  // 나중에 다른 엔진 추가
};

export async function route(engine, ctx) {
  ctx = ctx || {};
  ctx.payload = ctx.payload || {};
  ctx._error = ctx._error || null;
  ctx.traceId = ctx.traceId || 'trace_' + Date.now();

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