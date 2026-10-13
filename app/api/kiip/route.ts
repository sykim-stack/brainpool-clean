import { NextRequest, NextResponse } from 'next/server';
import { getPrincipal } from '@/lib/security/principal';
import { getSupabase } from '@/lib/supabase';
import { normalizeUiLocale, type UiLocale } from '@/lib/locale';

type QuestionType = 'meaning' | 'context' | 'response';
type Option = { id: string; text: string };
type LocaleRow = {
  prompt: string;
  context: string | null;
  options: Option[] | unknown;
  explanation: string;
  vocabulary: string;
};
type QuestionRow = {
  id: string;
  stage: number;
  type: QuestionType;
  topic_key: string;
  answer_option_id: string;
  status: string;
  kiip_question_locales: LocaleRow[];
};
type PublicQuestion = {
  id: string;
  stage: number;
  type: QuestionType;
  topic: string;
  prompt: string;
  context?: string;
  choices: string[];
  vocabulary: string;
};

/** 문제 본문·선택지는 학습 콘텐츠 언어(한국어) 고정. 해설만 UI 언어. */
const CONTENT_LOCALE: UiLocale = 'ko';

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalizeMultiline(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n');
}

function parseOptions(value: unknown): Option[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Option => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Record<string, unknown>;
      return typeof candidate.id === 'string' && typeof candidate.text === 'string';
    })
    .map((option) => ({
      id: option.id,
      text: normalizeMultiline(option.text),
    }));
}

function toQuestion(row: QuestionRow): { question: PublicQuestion; locale: LocaleRow & { options: Option[] } } | null {
  const rawLocale = row.kiip_question_locales?.[0];
  if (!rawLocale) return null;
  const options = parseOptions(rawLocale.options);
  if (options.length !== 4) return null;
  const locale = {
    prompt: normalizeMultiline(rawLocale.prompt),
    context: rawLocale.context ? normalizeMultiline(rawLocale.context) : null,
    options,
    explanation: normalizeMultiline(rawLocale.explanation),
    vocabulary: rawLocale.vocabulary,
  };
  return {
    locale,
    question: {
      id: row.id,
      stage: row.stage,
      type: row.type,
      topic: row.topic_key,
      prompt: locale.prompt,
      ...(locale.context ? { context: locale.context } : {}),
      choices: options.map((option) => option.text),
      vocabulary: locale.vocabulary,
    },
  };
}

function errorResponse(code: string, message: string, traceId: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message }, traceId }, { status });
}

type SupabaseClient = NonNullable<ReturnType<typeof getSupabase>>;

async function fetchContentSessionRows(supabase: SupabaseClient, stage: number) {
  return supabase
    .from('kiip_questions')
    .select(
      'id, stage, type, topic_key, answer_option_id, status, kiip_question_locales!inner(prompt, context, options, explanation, vocabulary)'
    )
    .eq('stage', stage)
    .eq('status', 'approved')
    .eq('kiip_question_locales.locale', CONTENT_LOCALE)
    .limit(100);
}

async function fetchContentAnswerRow(supabase: SupabaseClient, questionId: string) {
  return supabase
    .from('kiip_questions')
    .select(
      'id, stage, type, topic_key, answer_option_id, status, kiip_question_locales!inner(prompt, context, options, explanation, vocabulary)'
    )
    .eq('id', questionId)
    .eq('status', 'approved')
    .eq('kiip_question_locales.locale', CONTENT_LOCALE)
    .limit(1)
    .maybeSingle();
}

/** UI 언어 해설만 조회. 없으면 null → 콘텐츠 locale 해설 사용 */
async function fetchUiExplanation(
  supabase: SupabaseClient,
  questionId: string,
  uiLocale: UiLocale
): Promise<{ explanation: string; vocabulary: string } | null> {
  if (uiLocale === CONTENT_LOCALE) return null;
  const { data, error } = await supabase
    .from('kiip_question_locales')
    .select('explanation, vocabulary')
    .eq('question_id', questionId)
    .eq('locale', uiLocale)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    explanation: normalizeMultiline(data.explanation),
    vocabulary: String(data.vocabulary || ''),
  };
}

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();
  const principalResult = getPrincipal(request);
  if (!principalResult.principal) {
    return errorResponse('UNAUTHORIZED', principalResult.error?.message || '인증이 필요합니다.', traceId, 401);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return errorResponse('DATABASE_UNAVAILABLE', 'KIIP 문제 저장소를 사용할 수 없습니다.', traceId, 503);
  }

  try {
    const body = await request.json();
    const action = String(body?.action || '');
    const stageValue = Number(body?.stage || 1);
    const stage = Number.isInteger(stageValue) && stageValue >= 1 && stageValue <= 6 ? stageValue : 1;
    const uiLocale = normalizeUiLocale(body?.locale);

    if (action === 'get-session') {
      const requestedCount = Number(body?.questionCount || 5);
      const questionCount = Math.min(Math.max(Number.isFinite(requestedCount) ? requestedCount : 5, 3), 5);

      // 문제·선택지는 항상 한국어 콘텐츠 locale에서 로드
      const { data, error } = await fetchContentSessionRows(supabase, stage);
      if (error) throw error;

      const questions = shuffle(((data || []) as unknown as QuestionRow[])
        .map(toQuestion)
        .filter((item): item is NonNullable<typeof item> => item !== null))
        .slice(0, questionCount)
        .map((item) => item.question);

      return NextResponse.json({
        success: true,
        payload: {
          stage,
          contentLocale: CONTENT_LOCALE,
          uiLocale,
          questionCount: questions.length,
          questions,
        },
        traceId,
      });
    }

    if (action === 'submit-answer') {
      const questionId = String(body?.questionId || '');
      const selectedIndex = Number(body?.selectedIndex);
      if (!questionId || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3) {
        return errorResponse('INVALID_ANSWER', '문제 또는 답안이 올바르지 않습니다.', traceId, 400);
      }

      // 채점은 한국어 콘텐츠 행 기준 (선택지 순서·정답 ID 일치)
      const { data, error } = await fetchContentAnswerRow(supabase, questionId);
      if (error) throw error;

      const row = data as unknown as QuestionRow | null;
      const parsed = row ? toQuestion(row) : null;
      if (!row || !parsed || !parsed.locale.options[selectedIndex]) {
        return errorResponse('INVALID_ANSWER', '문제 또는 답안이 올바르지 않습니다.', traceId, 400);
      }

      const selectedOptionId = parsed.locale.options[selectedIndex].id;
      const uiText = await fetchUiExplanation(supabase, questionId, uiLocale);

      return NextResponse.json({
        success: true,
        payload: {
          correct: selectedOptionId === row.answer_option_id,
          correctIndex: parsed.locale.options.findIndex((option) => option.id === row.answer_option_id),
          explanation: uiText?.explanation || parsed.locale.explanation,
          vocabulary: uiText?.vocabulary || parsed.locale.vocabulary,
          topic: row.topic_key,
          contentLocale: CONTENT_LOCALE,
          uiLocale,
        },
        traceId,
      });
    }

    return errorResponse('UNKNOWN_ACTION', '지원하지 않는 KIIP action입니다.', traceId, 400);
  } catch (error) {
    console.error('[kiip] unhandled', error);
    return errorResponse('INVALID_REQUEST', '요청을 처리할 수 없습니다.', traceId, 400);
  }
}
