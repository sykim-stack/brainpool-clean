import { run as translateEngine } from '../engines/translation/index.js';
import { analyze as emotionEngine } from '../engines/emotion/index.js';
import { detect as languageEngine } from '../engines/language/detect.js';

const ROUTES = {
  translate: translateEngine,
  emotion:   emotionEngine,
  detect:    languageEngine,
};

export async function route(engine, ctx) {
  const handler = ROUTES[engine];
  if (!handler) return { ...ctx, _error: { code: 'UNKNOWN_ENGINE', message: `알 수 없는 엔진: ${engine}`, retryable: false } };
  return await handler(ctx);
}
