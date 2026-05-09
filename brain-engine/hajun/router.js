import * as TranslationEngine from '../engines/translation/index.js';
import { analyze } from '../engines/emotion/index.js';
import { detect } from '../engines/language/index.js';

const ROUTES = {
  translate: TranslationEngine.run,
  emotion: analyze,
  detect: detect
};

export async function route(engine, ctx) {
  const handler = ROUTES[engine];
  if (!handler) {
    return { ...ctx, _error: `Hajun: Unknown engine "${engine}"` };
  }
  return await handler(ctx);
}