import * as TranslationEngine from '../engines/translation/index.js';
import * as EmotionEngine from '../engines/emotion/index.js';
import { detect } from '../engines/language/detect.js';

const ROUTES = {
    translate: TranslationEngine.run,
    emotion:   EmotionEngine.analyze,
    detect:    detect,
};

export async function route(engine, ctx) {
    const handler = ROUTES[engine];
    if (!handler) {
        return { ...ctx, _error: { code: 'UNKNOWN_ENGINE', message: '알 수 없는 엔진: ' + engine, retryable: false } };
    }
    return await handler(ctx);
}