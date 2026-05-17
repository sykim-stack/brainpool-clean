import { detect } from '../language/detect.js';
import { findCache, saveCache } from './cache.js';
import { translate } from './translate.js';

export async function run(ctx) {
    if (!ctx?.payload?.text) {
        return { ...ctx, _error: { code: 'MISSING_TEXT', message: 'text 필드 필요', retryable: false } };
    }
    let c = ctx;
    c = await detect(c);      if (c._error) return c;
    c = await findCache(c);   if (c._error) return c;
    c = await translate(c);   if (c._error) return c;
    c = await saveCache(c);
    return c;
}