import { NextRequest, NextResponse } from 'next/server';
import { getPrincipal } from '@/lib/security/principal';

type QuestionType = 'meaning' | 'context' | 'response';

type KiipQuestion = {
  id: string;
  stage: 1;
  type: QuestionType;
  topic: string;
  prompt: string;
  context?: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  vocabulary: string;
};

const QUESTIONS: KiipQuestion[] = [
  { id: 'kiip1-greeting-01', stage: 1, type: 'meaning', topic: '인사', prompt: '“안녕하세요”와 가장 가까운 베트남어 표현은 무엇인가요?', choices: ['Cảm ơn', 'Xin chào', 'Tạm biệt', 'Xin lỗi'], answerIndex: 1, explanation: 'Xin chào는 처음 만났거나 인사할 때 쓰는 표현이에요.', vocabulary: '안녕하세요 · Xin chào' },
  { id: 'kiip1-greeting-02', stage: 1, type: 'response', topic: '인사', prompt: '처음 만난 사람에게 가장 자연스러운 인사는 무엇인가요?', context: 'A: 처음 뵙겠습니다.\nB: _____.', choices: ['안녕하세요', '괜찮아요', '잘 먹겠습니다', '어서 오세요'], answerIndex: 0, explanation: '처음 만난 사람에게는 안녕하세요 또는 처음 뵙겠습니다라고 인사해요.', vocabulary: '처음 뵙겠습니다' },
  { id: 'kiip1-thanks-01', stage: 1, type: 'meaning', topic: '감사', prompt: '“감사합니다”의 베트남어 표현은 무엇인가요?', choices: ['Không sao', 'Tạm biệt', 'Cảm ơn', 'Xin chào'], answerIndex: 2, explanation: 'Cảm ơn은 고마움을 표현할 때 사용하는 말이에요.', vocabulary: '감사합니다 · Cảm ơn' },
  { id: 'kiip1-apology-01', stage: 1, type: 'response', topic: '사과', prompt: '길에서 다른 사람과 부딪혔을 때 가장 자연스러운 말은 무엇인가요?', choices: ['미안합니다', '맛있게 드세요', '축하합니다', '다녀오세요'], answerIndex: 0, explanation: '실수로 다른 사람에게 불편을 주었을 때 미안합니다라고 말해요.', vocabulary: '미안합니다 · Xin lỗi' },
  { id: 'kiip1-shopping-01', stage: 1, type: 'context', topic: '쇼핑', prompt: '빈칸에 들어갈 표현을 고르세요.', context: 'A: 이 사과는 한 개에 얼마예요?\nB: _____원이에요.', choices: ['삼천', '어디', '누구', '언제'], answerIndex: 0, explanation: '가격을 말할 때는 한자어 수사와 원을 함께 사용해요. “삼천 원이에요”처럼 말할 수 있어요.', vocabulary: '얼마예요? · Bao nhiêu tiền?' },
  { id: 'kiip1-location-01', stage: 1, type: 'meaning', topic: '장소', prompt: '“화장실이 어디예요?”는 언제 사용하는 표현인가요?', choices: ['가격을 물을 때', '장소를 물을 때', '시간을 물을 때', '이름을 물을 때'], answerIndex: 1, explanation: '어디예요?는 장소나 위치를 물을 때 사용하는 표현이에요.', vocabulary: '어디예요? · Ở đâu?' },
  { id: 'kiip1-time-01', stage: 1, type: 'context', topic: '시간', prompt: '빈칸에 들어갈 표현을 고르세요.', context: 'A: 몇 시에 만날까요?\nB: _____ 만나요.', choices: ['세 시에', '학교에서', '친구를', '맛있게'], answerIndex: 0, explanation: '몇 시에?라는 질문에는 “세 시에”처럼 시간으로 대답해요.', vocabulary: '몇 시에 만날까요?' },
  { id: 'kiip1-food-01', stage: 1, type: 'response', topic: '식사', prompt: '식사를 시작하기 전에 하는 말은 무엇인가요?', choices: ['잘 먹겠습니다', '안녕히 가세요', '괜찮습니다', '어서 오세요'], answerIndex: 0, explanation: '식사 전에 잘 먹겠습니다라고 말하고, 식사 후에는 잘 먹었습니다라고 말해요.', vocabulary: '잘 먹겠습니다' },
  { id: 'kiip1-transport-01', stage: 1, type: 'meaning', topic: '교통', prompt: '“버스 정류장이 어디예요?”의 핵심 질문은 무엇인가요?', choices: ['버스의 가격', '버스의 시간', '버스 정류장의 위치', '버스의 색깔'], answerIndex: 2, explanation: '어디예요?가 들어간 문장은 보통 위치나 장소를 묻는 말이에요.', vocabulary: '정류장 · Trạm xe buýt' },
  { id: 'kiip1-home-01', stage: 1, type: 'context', topic: '일상', prompt: '빈칸에 들어갈 가장 자연스러운 표현을 고르세요.', context: 'A: 오늘 날씨가 어때요?\nB: _____ 좋아요.', choices: ['날씨가', '이름이', '주소가', '전화번호가'], answerIndex: 0, explanation: '날씨에 대해 말할 때는 “날씨가 좋아요”라고 해요.', vocabulary: '날씨가 좋아요' },
];

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function publicQuestion(question: KiipQuestion) {
  const { answerIndex, ...safeQuestion } = question;
  void answerIndex;
  return safeQuestion;
}

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();
  const principalResult = getPrincipal(request);
  if (!principalResult.principal) {
    return NextResponse.json({ success: false, error: principalResult.error, traceId }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = String(body?.action || '');

    if (action === 'get-session') {
      const requestedCount = Number(body?.questionCount || 5);
      const questionCount = Math.min(Math.max(Number.isFinite(requestedCount) ? requestedCount : 5, 3), 5);
      const questions = shuffle(QUESTIONS).slice(0, questionCount).map(publicQuestion);
      return NextResponse.json({ success: true, payload: { stage: 1, questionCount, questions }, traceId });
    }

    if (action === 'submit-answer') {
      const questionId = String(body?.questionId || '');
      const selectedIndex = Number(body?.selectedIndex);
      const question = QUESTIONS.find((item) => item.id === questionId);
      if (!question || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= question.choices.length) {
        return NextResponse.json({ success: false, error: { code: 'INVALID_ANSWER', message: '문제 또는 답안이 올바르지 않습니다.' }, traceId }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        payload: {
          correct: selectedIndex === question.answerIndex,
          correctIndex: question.answerIndex,
          explanation: question.explanation,
          vocabulary: question.vocabulary,
          topic: question.topic,
        },
        traceId,
      });
    }

    return NextResponse.json({ success: false, error: { code: 'UNKNOWN_ACTION', message: '지원하지 않는 KIIP action입니다.' }, traceId }, { status: 400 });
  } catch (error) {
    console.error('[kiip] unhandled', error);
    return NextResponse.json({ success: false, error: { code: 'INVALID_REQUEST', message: '요청을 처리할 수 없습니다.' }, traceId }, { status: 400 });
  }
}
