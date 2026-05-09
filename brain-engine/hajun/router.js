// brain-engine/hajun/router.js
// ─────────────────────────────────────────────────────────────
// Hajun Router — 최소 버전
//
// 지금 역할: receive() + route() 만
// 나중에 추가: 우선순위, fallback, 비용 제한
//
// throw 금지 → _error 반환
// ─────────────────────────────────────────────────────────────

import * as TranslationEngine from '../engines/translation/index.js';
import * as EmotionEngine     from '../engines/emotion/index.js';
import { detect }             from '../engines/language/index.js';

const ROUTES = {
  translate: TranslationEngine.run,
  emotion:   EmotionEngine.analyze,
  detect:    detect,
};

/**
 * Hajun이 엔진을 호출하는 단일 진입점
 *
 * @param {string} engine  - 'translate' | 'emotion' | 'detect'
 * @param {object} ctx     - { payload, traceId }
 * @returns {object}       - ctx (with result or _error)
 */
export async function route(engine, ctx) {
  const handler = ROUTES[engine];

  if (!handler) {
    return { ...ctx, _error: `Hajun: 알 수 없는 엔진 "${engine}"` };
  }

  console.log(`[Hajun] route → ${engine} [${ctx.traceId || 'no-trace'}]`);

  return await handler(ctx);
}