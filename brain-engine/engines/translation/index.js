// brain-engine/engines/translation/index.js
// ─────────────────────────────────────────────────────────────
// TranslationEngine 진입점
//
// 흐름: 캐시 확인 → 번역 → 저장 → 반환
// 끝.
//
// (ctx) => ctx 형태 준수, throw 금지
// ─────────────────────────────────────────────────────────────

import { detect }              from '../language/detect.js';
import { findCache, saveCache } from './cache.js';
import { translate }           from './translate.js';

export async function run(ctx) {
  if (!ctx?.payload?.text) {
    return { ...ctx, _error: 'TranslationEngine: text 필드가 필요합니다' };
  }

  let c = ctx;

  // 1. 언어 감지
  c = await detect(c);
  if (c._error) return c;

  // 2. 캐시 확인
  c = await findCache(c);
  if (c._error) return c;

  // 3. 번역 (캐시 히트면 통과)
  c = await translate(c);
  if (c._error) return c;

  // 4. 결과 저장
  c = await saveCache(c);

  return c;
}