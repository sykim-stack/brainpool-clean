import { NextRequest, NextResponse } from 'next/server';
import { getPrincipal } from '@/lib/security/principal';
import { getSupabase } from '@/lib/supabase';

type QuestionType = 'meaning' | 'context' | 'response';
type Option = { id: string; text: string };
type LocaleRow = {
  prompt: string;
  context: string | null;
  options: Option[];
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

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function parseOptions(value: unknown): Option[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Option => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Record<string, unknown>;
    return typeof candidate.id === 'string' && typeof candidate.text === 'string';
  });
}

function toQuestion(row: QuestionRow): { question: PublicQuestion; locale: LocaleRow } | null {
  const rawLocale = row.kiip_question_locales?.[0];
  if (!rawLocale) return null;
  const locale: LocaleRow = {
    prompt: rawLocale.prompt,
    context: rawLocale.context,
    options: parseOptions(rawLocale.options),
    explanation: rawLocale.explanation,
    vocabulary: rawLocale.vocabulary,
  };
  if (locale.options.length !== 4) return null;
  return {
    locale,
    question: {
      id: row.id,
      stage: row.stage,
      type: row.type,
      topic: row.topic_key,
      prompt: locale.prompt,
      ...(locale.context ? { context: locale.context } : {}),
      choices: locale.options.map((option) => option.text),
      vocabulary: locale.vocabulary,
    },
  };
}

function errorResponse(code: string, message: string, traceId: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message }, traceId }, { status });
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
    const locale = typeof body?.locale === 'string' ? body.locale : 'ko';
    const targetLocale = typeof body?.targetLocale === 'string' ? body.targetLocale : null;

    if (action === 'get-session') {
      const requestedCount = Number(body?.questionCount || 5);
      const questionCount = Math.min(Math.max(Number.isFinite(requestedCount) ? requestedCount : 5, 3), 5);
      let questionQuery = supabase
        .from('kiip_questions')
        .select('id, stage, type, topic_key, answer_option_id, status, kiip_question_locales!inner(prompt, context, options, explanation, vocabulary)')
        .eq('stage', stage)
        .eq('status', 'approved')
        .eq('kiip_question_locales.locale', locale)
        .limit(100);
      if (targetLocale) questionQuery = questionQuery.eq('kiip_question_locales.target_locale', targetLocale);
      const { data, error } = await questionQuery;
      if (error) throw error;
      const questions = shuffle(((data || []) as unknown as QuestionRow[])
        .map(toQuestion)
        .filter((item): item is { question: PublicQuestion; locale: LocaleRow } => item !== null))
        .slice(0, questionCount)
        .map((item) => item.question);
      return NextResponse.json({ success: true, payload: { stage, locale, targetLocale, questionCount: questions.length, questions }, traceId });
    }

    if (action === 'submit-answer') {
      const questionId = String(body?.questionId || '');
      const selectedIndex = Number(body?.selectedIndex);
      if (!questionId || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3) {
        return errorResponse('INVALID_ANSWER', '문제 또는 답안이 올바르지 않습니다.', traceId, 400);
      }
      let questionQuery = supabase
        .from('kiip_questions')
        .select('id, stage, type, topic_key, answer_option_id, status, kiip_question_locales!inner(prompt, context, options, explanation, vocabulary)')
        .eq('id', questionId)
        .eq('status', 'approved')
        .eq('kiip_question_locales.locale', locale);
      if (targetLocale) questionQuery = questionQuery.eq('kiip_question_locales.target_locale', targetLocale);
      const { data, error } = await questionQuery.maybeSingle();
      if (error) throw error;
      const row = data as unknown as QuestionRow | null;
      const parsed = row ? toQuestion(row) : null;
      if (!row || !parsed || !parsed.locale.options[selectedIndex]) {
        return errorResponse('INVALID_ANSWER', '문제 또는 답안이 올바르지 않습니다.', traceId, 400);
      }
      const selectedOptionId = parsed.locale.options[selectedIndex].id;
      return NextResponse.json({
        success: true,
        payload: {
          correct: selectedOptionId === row.answer_option_id,
          correctIndex: parsed.locale.options.findIndex((option) => option.id === row.answer_option_id),
          explanation: parsed.locale.explanation,
          vocabulary: parsed.locale.vocabulary,
          topic: row.topic_key,
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
