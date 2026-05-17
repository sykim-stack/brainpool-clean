# ============================================================
# BRAINPOOL OS — Seed Core 생성 스크립트
# 범위: contracts + connectors + hajun + engines (translation/language/emotion)
# CoreNull 제외 — 별도 레포로 나중에 분리
# 실행: PowerShell에서 그대로 붙여넣기
# ============================================================

$ROOT = "C:\brainpool-os"

Write-Host "🚀 BRAINPOOL OS Seed Core 생성 시작..." -ForegroundColor Cyan

Remove-Item -Path $ROOT -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $ROOT -Force | Out-Null

$dirs = @(
    "$ROOT\contracts",
    "$ROOT\connectors",
    "$ROOT\hajun",
    "$ROOT\engines\translation",
    "$ROOT\engines\language",
    "$ROOT\engines\emotion"
)
foreach ($d in $dirs) { New-Item -ItemType Directory -Path $d -Force | Out-Null }

# ============================================================
# contracts/ctx.js — ctx 규격 (모든 엔진이 따르는 계약)
# ============================================================

@"
// contracts/ctx.js
// ─────────────────────────────────────────────────────────────
// BRAINPOOL ctx 계약
// 모든 엔진/hajun/connector는 이 규격을 따른다
// ─────────────────────────────────────────────────────────────

export function createCtx(payload, traceId = crypto.randomUUID()) {
  return { payload, traceId, _error: null };
}

export function isError(ctx) {
  return ctx._error !== null;
}

export function errorCtx(ctx, code, message, retryable = false) {
  return { ...ctx, _error: { code, message, retryable } };
}
"@ | Out-File -FilePath "$ROOT\contracts\ctx.js" -Encoding utf8

@"
# contracts/ctx.md — 인간용 계약 문서

## ctx 객체 구조
```
{
  payload:  any,     // 요청 파라미터
  traceId:  string,  // UUID, 전파 필수
  _error:   null | { code, message, retryable }
}
```

## 절대 규칙
1. 모든 함수는 (ctx) => ctx 형태
2. throw 절대 금지 — 에러는 _error 필드에 담아 반환
3. traceId는 항상 유지하고 응답에 포함
4. DB 접근은 connectors/storage.js 통해서만
5. 엔진은 작게 유지 — 기능 하나씩

## 금지
- 레이어끼리 HTTP 호출
- 엔진 안에서 Supabase 직접 createClient
- 이벤트 버스 / DI 컨테이너 (아직 이름)
- Hajun에 자동 판단 로직
"@ | Out-File -FilePath "$ROOT\contracts\ctx.md" -Encoding utf8

# ============================================================
# connectors/storage.js — Supabase 단일 접근점
# ============================================================

@"
// connectors/storage.js
// ─────────────────────────────────────────────────────────────
// Supabase 단일 접근점
// 모든 엔진은 직접 createClient 하지 않고 여기서만 가져간다
// ─────────────────────────────────────────────────────────────

let _client = null;

export async function getStorage() {
  if (_client) return _client;

  const { createClient } = await import('@supabase/supabase-js');

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('[Storage] 환경변수 누락: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }

  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('[Storage] Supabase 연결 완료');
  return _client;
}
"@ | Out-File -FilePath "$ROOT\connectors\storage.js" -Encoding utf8

# ============================================================
# engines/language/detect.js — 언어 감지 (범용)
# ============================================================

@"
// engines/language/detect.js
// ─────────────────────────────────────────────────────────────
// 언어 감지 — 범용
// 번역/채팅/게시글 어디서든 재사용
// ─────────────────────────────────────────────────────────────

import { errorCtx } from '../../contracts/ctx.js';

export async function detect(ctx) {
  const text = ctx.payload?.text;
  if (!text) return errorCtx(ctx, 'MISSING_TEXT', 'text 필드가 필요합니다');

  const sourceLang = /[가-힣]/.test(text) ? 'ko' : 'vi';

  return {
    ...ctx,
    payload: { ...ctx.payload, sourceLang }
  };
}
"@ | Out-File -FilePath "$ROOT\engines\language\detect.js" -Encoding utf8

@"
// engines/language/index.js
export { detect } from './detect.js';
"@ | Out-File -FilePath "$ROOT\engines\language\index.js" -Encoding utf8

# ============================================================
# engines/translation/ — 번역 엔진
# 흐름: 캐시 확인 → 번역 → 저장
# ============================================================

@"
// engines/translation/cache.js
// ─────────────────────────────────────────────────────────────
// 번역 캐시 — DB 확인 / 저장
// ─────────────────────────────────────────────────────────────

import { getStorage } from '../../connectors/storage.js';

export async function findCache(ctx) {
  const { text, sourceLang } = ctx.payload;
  if (!text || !sourceLang) return ctx;

  const direction = sourceLang === 'ko' ? 'ko→vi' : 'vi→ko';
  const db = await getStorage();
  if (!db) return ctx;

  const { data, error } = await db
    .from('tb_trans_logs')
    .select('standard_vi, emotion_score, risk_score, intent')
    .eq('source_text', text)
    .eq('direction', direction)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return ctx;

  console.log(`[TranslationCache] 캐시 히트: "${text}"`);

  return {
    ...ctx,
    payload: {
      ...ctx.payload,
      translatedText: data.standard_vi,
      translationSource: 'cache',
      emotionScore: data.emotion_score,
      riskScore: data.risk_score,
      intent: data.intent,
    }
  };
}

export async function saveCache(ctx) {
  const { text, sourceLang, translatedText, translationSource } = ctx.payload;
  if (!text || !translatedText || translationSource === 'cache') return ctx;

  const direction = sourceLang === 'ko' ? 'ko→vi' : 'vi→ko';
  const db = await getStorage();
  if (!db) return ctx;

  const { error } = await db.from('tb_trans_logs').insert({
    source_text:   text,
    standard_vi:   translatedText,
    direction,
    emotion_score: ctx.payload.emotionScore || 0.5,
    risk_score:    ctx.payload.riskScore    || 0,
    intent:        ctx.payload.intent       || null,
    trace_id:      ctx.traceId             || null,
  });

  if (error) console.warn('[TranslationCache] 저장 실패:', error.message);

  return ctx;
}
"@ | Out-File -FilePath "$ROOT\engines\translation\cache.js" -Encoding utf8

@"
// engines/translation/translate.js
// ─────────────────────────────────────────────────────────────
// DeepL 번역 — 캐시 미스 시 호출
// ─────────────────────────────────────────────────────────────

import { errorCtx } from '../../contracts/ctx.js';

export async function translate(ctx) {
  if (ctx.payload.translatedText) return ctx; // 캐시 히트 통과

  const { text, sourceLang } = ctx.payload;
  if (!text) return errorCtx(ctx, 'MISSING_TEXT', 'text 필드가 필요합니다');

  const targetLang = sourceLang === 'ko' ? 'VI' : 'KO';
  const key = process.env.DEEPL_API_KEY;

  if (!key) {
    console.warn('[Translate] DEEPL_API_KEY 없음 → mock 사용');
    return {
      ...ctx,
      payload: { ...ctx.payload, translatedText: `[Mock] ${text}`, translationSource: 'mock' }
    };
  }

  const params = new URLSearchParams();
  params.append('text', text);
  params.append('target_lang', targetLang);

  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  }).catch(err => { console.error('[Translate] fetch 실패:', err.message); return null; });

  if (!res || !res.ok) {
    console.warn('[Translate] DeepL 오류 → mock 사용');
    return {
      ...ctx,
      payload: { ...ctx.payload, translatedText: `[Mock] ${text}`, translationSource: 'mock' }
    };
  }

  const data = await res.json();
  const translatedText = data.translations[0].text;

  console.log(`[Translate] "${text}" → "${translatedText}"`);

  return {
    ...ctx,
    payload: { ...ctx.payload, translatedText, translationSource: 'deepl' }
  };
}
"@ | Out-File -FilePath "$ROOT\engines\translation\translate.js" -Encoding utf8

@"
// engines/translation/index.js
// ─────────────────────────────────────────────────────────────
// TranslationEngine 진입점
// 흐름: 언어감지 → 캐시확인 → 번역 → 저장 → 반환
// ─────────────────────────────────────────────────────────────

import { detect }               from '../language/detect.js';
import { findCache, saveCache } from './cache.js';
import { translate }            from './translate.js';
import { errorCtx }             from '../../contracts/ctx.js';

export async function run(ctx) {
  if (!ctx?.payload?.text)
    return errorCtx(ctx, 'MISSING_TEXT', 'TranslationEngine: text 필드가 필요합니다');

  let c = ctx;
  c = await detect(c);    if (c._error) return c;
  c = await findCache(c); if (c._error) return c;
  c = await translate(c); if (c._error) return c;
  c = await saveCache(c);
  return c;
}
"@ | Out-File -FilePath "$ROOT\engines\translation\index.js" -Encoding utf8

# ============================================================
# engines/emotion/ — 감정 엔진 (번역과 완전 분리)
# ============================================================

@"
// engines/emotion/analyze.js
// ─────────────────────────────────────────────────────────────
// 감정 분석 — TranslationEngine과 완전 분리
// ─────────────────────────────────────────────────────────────

const KO_POSITIVE = ['기쁘','좋','사랑','감사','행복','맛있','잘','예쁘','최고','고마워'];
const KO_NEGATIVE = ['슬프','화나','싫','나쁘','힘들','아프','피곤','짜증','걱정','속상'];
const VI_POSITIVE = ['vui','thích','yêu','cảm ơn','tốt','đẹp','hạnh phúc','tuyệt vời','ngon','khỏe'];
const VI_NEGATIVE = ['buồn','giận','ghét','tệ','xấu','mệt','bệnh','đau','chán','lo lắng'];

export async function analyze(ctx) {
  const text = ctx.payload?.translatedText || ctx.payload?.text;
  if (!text) return ctx;

  const lower = text.toLowerCase();
  let score = 0.5;
  let label = 'neutral';

  for (const w of [...VI_POSITIVE, ...KO_POSITIVE]) {
    if (lower.includes(w)) { score = Math.min(1, score + 0.2); label = 'joy'; break; }
  }
  for (const w of [...VI_NEGATIVE, ...KO_NEGATIVE]) {
    if (lower.includes(w)) { score = Math.max(0, score - 0.3); label = 'sad'; break; }
  }

  return {
    ...ctx,
    payload: { ...ctx.payload, emotion: label, emotionScore: score }
  };
}
"@ | Out-File -FilePath "$ROOT\engines\emotion\analyze.js" -Encoding utf8

@"
// engines/emotion/index.js
export { analyze } from './analyze.js';
"@ | Out-File -FilePath "$ROOT\engines\emotion\index.js" -Encoding utf8

# ============================================================
# hajun/router.js — 최소 라우터 (receive + route만)
# ============================================================

@"
// hajun/router.js
// ─────────────────────────────────────────────────────────────
// Hajun Router — 최소 버전
// 역할: route(engine, ctx) 만
// 나중에 추가: chat 엔진
// ─────────────────────────────────────────────────────────────

import * as TranslationEngine from '../engines/translation/index.js';
import * as EmotionEngine     from '../engines/emotion/index.js';
import { detect }             from '../engines/language/index.js';
import { errorCtx }           from '../contracts/ctx.js';

const ROUTES = {
  translate: TranslationEngine.run,
  emotion:   EmotionEngine.analyze,
  detect,
};

export async function route(engine, ctx) {
  const handler = ROUTES[engine];
  if (!handler) return errorCtx(ctx, 'UNKNOWN_ENGINE', `알 수 없는 엔진: "${engine}"`);

  console.log(`[Hajun] → ${engine} [${ctx.traceId || 'no-trace'}]`);
  return await handler(ctx);
}
"@ | Out-File -FilePath "$ROOT\hajun\router.js" -Encoding utf8

# ============================================================
# package.json
# ============================================================

@"
{
  "name": "brainpool-os",
  "version": "0.1.0",
  "type": "module",
  "description": "BRAINPOOL Core Engine — framework agnostic",
  "main": "hajun/router.js",
  "exports": {
    "./hajun":            "./hajun/router.js",
    "./contracts":        "./contracts/ctx.js",
    "./connectors":       "./connectors/storage.js",
    "./engines/translation": "./engines/translation/index.js",
    "./engines/language":    "./engines/language/index.js",
    "./engines/emotion":     "./engines/emotion/index.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  },
  "engines": {
    "node": ">=18"
  },
  "license": "MIT"
}
"@ | Out-File -FilePath "$ROOT\package.json" -Encoding utf8

# ============================================================
# README.md
# ============================================================

@"
# BRAINPOOL OS — Core Engine

Framework-agnostic engine core.
모든 모듈은 contracts/ctx.md의 규격을 따릅니다.

## 구조
```
contracts/    ctx 규격 (계약서)
connectors/   Supabase 단일 접근점
hajun/        엔진 라우터 (route만, 판단 없음)
engines/
  translation/  캐시확인 → 번역 → 저장
  language/     언어 감지 (범용)
  emotion/      감정 분석 (번역과 분리)
```

## Next.js에서 사용 (예시)
```ts
import { route }     from 'brainpool-os/hajun';
import { createCtx } from 'brainpool-os/contracts';

export async function POST(req: Request) {
  const body = JSON.parse(await req.text());
  let ctx = createCtx({ text: body.text });
  ctx = await route('translate', ctx);
  ctx = await route('emotion', ctx);
  return Response.json({ payload: ctx.payload, traceId: ctx.traceId });
}
```

## 환경변수
```
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DEEPL_API_KEY=...
```

## 다음에 추가될 엔진
- engines/chat/   (brainpool-clean 정리 후 이식)

## 포함하지 않는 것
- CoreNull (별도 레포로 분리 예정)
- UI 컴포넌트
- Next.js 라우트
"@ | Out-File -FilePath "$ROOT\README.md" -Encoding utf8

Write-Host ""
Write-Host "✅ BRAINPOOL OS Seed Core 생성 완료!" -ForegroundColor Green
Write-Host "📍 위치: $ROOT" -ForegroundColor Yellow
Write-Host ""
Write-Host "다음 명령어:" -ForegroundColor Cyan
Write-Host "  cd $ROOT"
Write-Host "  npm install"
Write-Host ""
Write-Host "brainpool-clean에서 연결할 때:" -ForegroundColor Cyan
Write-Host '  npm install file:C:\brainpool-os'
