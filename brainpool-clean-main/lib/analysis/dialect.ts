/**
 * CoreRing Dialect Detector
 * 베트남 남부 방언 감지 — 규칙 기반 (사전 매칭)
 *
 * 방식: 규칙 기반 우선
 *   1. 남부 특유 어휘 사전 매칭
 *   2. 매칭 점수로 south/north/neutral 결정
 *   3. 불확실할 때 AI 보완 (gemini provider에서 처리)
 *
 * 근거: 남부 방언은 어휘/발음 규칙이 명확해 사전으로 충분히 커버됨
 *       특히 아내가 사용하는 메콩델타/남부 어휘 패턴 반영
 */

import type { DialectAnalysisResult } from './interface';

// ─────────────────────────────────────────────
// 남부 방언 어휘 사전
// ─────────────────────────────────────────────

/**
 * 남부(south) 전용 어휘
 * { 남부표현: 북부표준어 }
 * 아내의 실제 사용 패턴 + 남부 베트남어 일반 특성 기반
 */
const SOUTH_LEXICON: Record<string, string> = {
  // 대명사
  'tui': 'tôi',          // 나 (남부)
  'mầy': 'mày',          // 너 (남부)
  'tao': 'tao',          // 나 (구어, 남부 더 빈번)
  'ổng': 'ông ấy',       // 그분 (남부)
  'bả': 'bà ấy',         // 그 여자분 (남부)
  'ảnh': 'anh ấy',       // 그 형/오빠 (남부)
  'chỉ': 'chị ấy',       // 그 언니/누나 (남부)

  // 어미/접속사
  'hen': 'nhé',          // ~할게요 (남부 약속 어미)
  'hén': 'nhé',
  'nhen': 'nhé',
  'nha': 'nhé',          // ~할게 (남부 구어)
  'vậy hen': 'vậy nhé',
  'dzậy': 'vậy',         // 그렇게 (남부 발음)
  'dzô': 'vào',          // 들어가다 (남부)
  'dzề': 'về',           // 돌아가다 (남부)
  'dzo': 'vào',

  // 부사
  'hổng': 'không',       // 아니오 (남부)
  'hổng có': 'không có', // 없다 (남부)
  'hông': 'không',
  'hổng biết': 'không biết',
  'chút xíu': 'một chút', // 조금 (남부)
  'xíu': 'chút',
  'cái nầy': 'cái này',  // 이것 (남부)
  'cái đó': 'cái đó',
  'nầy': 'này',          // 이 (남부 철자)

  // 일상 어휘
  'mệt': 'mệt',          // 피곤해 (공통이지만 남부 빈도 높음)
  'thiệt': 'thật',       // 정말 (남부)
  'thiệt không': 'thật không',
  'tía': 'bố',           // 아버지 (남부)
  'má': 'mẹ',            // 어머니 (남부)
  'cưng': 'yêu',         // 사랑하다/애칭 (남부)
  'bộ': 'à',             // 그래? / 설마 (남부 의문)
  'thôi': 'thôi',        // 그만/됐어 (공통이지만 남부 어감 다름)

  // 감정 표현
  'mắc cỡ': 'xấu hổ',   // 부끄럽다 (남부)
  'kỳ': 'lạ',            // 이상하다 (남부)
  'coi': 'xem',          // 보다 (남부)
  'ăn cơm chưa': 'đã ăn chưa', // 밥 먹었어? (남부 안부 표현)
  'chồng': 'chồng',      // 남편 (공통, 남부 사용 맥락 체크용)

  // 음식/생활
  'hủ tiếu': 'hủ tiếu',  // 남부 쌀국수 (북부엔 없음)
  'bánh mì': 'bánh mì',
  'cà phê sữa đá': 'cà phê sữa đá', // 남부식 아이스커피

  // 메콩델타 특유
  'dưới quê': '고향 (메콩 지역)',
  'miền tây': '서부 (메콩델타)',
};

/**
 * 북부(north) 전용 어휘 — 감지 시 north 가중치
 */
const NORTH_LEXICON: Set<string> = new Set([
  'nhé',      // 남부에선 nha/nhen 사용
  'thật',     // 남부에선 thiệt
  'bố',       // 남부에선 tía
  'mẹ',       // 남부에선 má (단, má는 중부도 사용)
  'không',    // 남부에선 hổng/hông
  'này',      // 남부에선 nầy
  'vào',      // 남부에선 dzô/dzo
  'về',       // 남부에선 dzề
  'xem',      // 남부에선 coi
  'xấu hổ',  // 남부에선 mắc cỡ
  'lạ',       // 남부에선 kỳ
]);

// ─────────────────────────────────────────────
// 감지 로직
// ─────────────────────────────────────────────

export interface DialectScore {
  southScore: number;
  northScore: number;
  matchedSouthTerms: string[];
  matchedNorthTerms: string[];
}

/**
 * 텍스트에서 방언 점수 계산
 * 규칙 기반 — O(n) 사전 매칭
 */
export function scoreDialect(text: string): DialectScore {
  const lower = text.toLowerCase().trim();
  const matchedSouthTerms: string[] = [];
  const matchedNorthTerms: string[] = [];

  // 남부 어휘 매칭
  for (const term of Object.keys(SOUTH_LEXICON)) {
    if (lower.includes(term)) {
      matchedSouthTerms.push(term);
    }
  }

  // 북부 어휘 매칭
  for (const term of NORTH_LEXICON) {
    if (lower.includes(term)) {
      matchedNorthTerms.push(term);
    }
  }

  return {
    southScore: matchedSouthTerms.length,
    northScore: matchedNorthTerms.length,
    matchedSouthTerms,
    matchedNorthTerms,
  };
}

/**
 * 방언 점수 → DialectAnalysisResult 변환
 *
 * 판단 기준:
 *   south ≥ 2           → 'south' (남부 확정)
 *   south ≥ 1, north=0  → 'south' (남부 추정)
 *   north > south       → 'north'
 *   둘 다 0 또는 같음   → 'neutral' (AI 보완 대상)
 */
export function detectDialect(text: string): DialectAnalysisResult {
  // 베트남어 텍스트가 아니면 감지 불필요
  if (!text || text.trim().length === 0) {
    return {
      detectedDialect: 'unknown',
      finalDialect: '감지 불가 (빈 텍스트)',
      isSouthern: false,
    };
  }

  const { southScore, northScore, matchedSouthTerms, matchedNorthTerms } =
    scoreDialect(text);

  // 남부 확정
  if (southScore >= 2 || (southScore >= 1 && northScore === 0)) {
    return {
      detectedDialect: 'south',
      finalDialect: `남부 베트남어 (감지 어휘: ${matchedSouthTerms.join(', ')})`,
      isSouthern: true,
    };
  }

  // 북부 감지
  if (northScore > southScore) {
    return {
      detectedDialect: 'north',
      finalDialect: `북부 베트남어 (감지 어휘: ${matchedNorthTerms.join(', ')})`,
      isSouthern: false,
    };
  }

  // 판단 불가 → neutral (AI 보완 필요)
  return {
    detectedDialect: 'neutral',
    finalDialect: '방언 불명확 (AI 분석 필요)',
    isSouthern: false,
  };
}

/**
 * 한국어→베트남어 방향일 때는 translated 텍스트로 방언 감지
 * 베트남어→한국어 방향일 때는 source 텍스트로 방언 감지
 */
export function detectDialectFromContext(
  sourceText: string,
  translatedText: string,
  direction: 'ko-vi' | 'vi-ko'
): DialectAnalysisResult {
  const targetText = direction === 'ko-vi' ? translatedText : sourceText;
  return detectDialect(targetText);
}
