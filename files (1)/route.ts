/**
 * /api/translate/route.ts
 *
 * CoreRing 번역 + 분석 파이프라인
 *
 * 흐름:
 *   원문 입력
 *   ↓
 *   번역 (DeepL)
 *   ↓
 *   [분석 파이프라인] — 병렬로 실행
 *     의미 전달률 → 위험 지수 → 방언 → 의도 → 문화 맥락
 *   ↓
 *   결과 저장 (tb_trans_logs)
 *   ↓
 *   응답 반환
 *
 * 분석 실패 시: fallback 값으로 저장, 번역 결과는 항상 반환
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GeminiAnalysisProvider } from '@/lib/analysis/providers/gemini';
import { toTransLogPayload } from '@/lib/analysis/interface';
import type { TranslationDirection } from '@/lib/analysis/interface';

// ─────────────────────────────────────────────
// Supabase / 환경변수
// ─────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─────────────────────────────────────────────
// DeepL 번역 (기존 로직 — 수정 없음)
// ─────────────────────────────────────────────

async function translateWithDeepL(
  text: string,
  targetLang: string
): Promise<string> {
  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      target_lang: targetLang,
    }),
  });

  if (!res.ok) throw new Error(`DeepL error: ${res.status}`);
  const data = await res.json();
  return data.translations?.[0]?.text ?? '';
}

// ─────────────────────────────────────────────
// 방향 결정 헬퍼
// ─────────────────────────────────────────────

function resolveDirection(
  rawDirection: string | undefined,
  sourceLang: string | undefined
): { direction: TranslationDirection; targetLang: string; dbDirection: string } {
  // 기존 코드에서 사용하던 direction 파라미터 형식 처리
  if (rawDirection === 'ko-vi' || sourceLang === 'ko') {
    return { direction: 'ko-vi', targetLang: 'VI', dbDirection: 'KO_VI' };
  }
  return { direction: 'vi-ko', targetLang: 'KO', dbDirection: 'VI_KO' };
}

// ─────────────────────────────────────────────
// POST /api/translate
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  let body: {
    text?: string;
    direction?: string;
    source_lang?: string;
    session_id?: string;
    user_id?: string;
    partner_device_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 });
  }

  const { text, direction: rawDir, source_lang, session_id, user_id, partner_device_id } = body;

  if (!text?.trim()) {
    return NextResponse.json({ error: '텍스트를 입력하세요' }, { status: 400 });
  }

  // ── 1. 방향 결정
  const { direction, targetLang, dbDirection } = resolveDirection(rawDir, source_lang);

  // ── 2. 번역 (DeepL)
  let translated = '';
  let southernTranslated: string | undefined;

  try {
    translated = await translateWithDeepL(text, targetLang);

    // 남부 방언 번역 (ko→vi 방향만, GEMINI_API_KEY 있을 때)
    // 실제 남부 방언 번역은 Gemini prompt에서 처리하므로
    // 여기서는 standard 번역만 사용
    southernTranslated = undefined;
  } catch (err) {
    console.error('[translate] DeepL 실패:', err);
    return NextResponse.json({ error: '번역 실패' }, { status: 500 });
  }

  // ── 3. 분석 파이프라인
  const geminiKey = process.env.GEMINI_API_KEY;
  let analysisPayload = {};

  if (geminiKey) {
    try {
      const provider = new GeminiAnalysisProvider(geminiKey);
      const result = await provider.analyze({
        sourceText: text,
        translatedText: translated,
        direction,
        southernText: southernTranslated,
        sessionId: session_id,
      });

      analysisPayload = toTransLogPayload(result);

      console.log(
        `[CoreRing Analysis] 완료 ${Date.now() - startTime}ms`,
        `의미전달률=${result.meaning.score}`,
        `위험=${result.risk.riskScore}`,
        `방언=${result.dialect.detectedDialect}`,
        `의도=${result.intent.intent}`
      );
    } catch (err) {
      console.error('[CoreRing Analysis] 분석 실패 (번역은 계속):', err);
      // 분석 실패해도 번역 결과는 반환
      analysisPayload = {};
    }
  } else {
    console.warn('[CoreRing Analysis] GEMINI_API_KEY 없음 — 분석 건너뜀');
  }

  // ── 4. tb_trans_logs 저장
  const logPayload = {
    source_text: text,
    standard_vi: direction === 'ko-vi' ? translated : text,
    direction: dbDirection,
    session_id: session_id ?? null,
    user_id: user_id ?? null,
    partner_device_id: partner_device_id ?? null,
    marriage_type: 'vn-kr',
    // 분석 결과 (없으면 기본값 유지)
    ...analysisPayload,
  };

  const { data: logData, error: logError } = await supabase
    .from('tb_trans_logs')
    .insert(logPayload)
    .select('id')
    .single();

  if (logError) {
    console.error('[translate] 로그 저장 실패:', logError);
    // 저장 실패해도 번역 결과는 반환
  }

  // ── 5. 응답
  return NextResponse.json({
    success: true,
    translated,
    log_id: logData?.id ?? null,
    // 분석 결과도 프론트에 전달 (UI 표시용)
    analysis: Object.keys(analysisPayload).length > 0 ? analysisPayload : null,
  });
}
