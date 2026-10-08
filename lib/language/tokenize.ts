export type LearningLanguage = 'ko' | 'vi' | 'en' | 'unknown';

export interface LearningToken {
  text: string;
  lookupText: string;
  clickable: boolean;
}

// 1차 후보 필터입니다. 완전한 형태소 분석기가 아니라 명백한 기능어 오탐을 줄이는 안전망입니다.
const VI_FUNCTION_WORDS = new Set([
  'à', 'bị', 'bởi', 'cho', 'có', 'của', 'đã', 'đang', 'để', 'đến', 'được',
  'hay', 'khi', 'không', 'là', 'mà', 'những', 'ra', 'rất', 'sẽ', 'tại',
  'thì', 'theo', 'trên', 'từ', 'và', 'vào', 'với', 'các', 'này', 'đó', 'ấy',
]);

const KO_FUNCTION_WORDS = new Set([
  '은', '는', '이', '가', '을', '를', '에', '의', '와', '과', '도', '만',
  '부터', '까지', '에서', '으로', '로', '에게', '한테', '께', '랑', '이랑',
  '요', '죠', '지', '네', '야', '아', '어', '더', '또', '및', '등',
]);

const EN_FUNCTION_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in',
  'is', 'it', 'of', 'on', 'or', 'the', 'to', 'was', 'were', 'with',
]);

function stripPunctuation(token: string): string {
  return token
    .replace(/^[\s.,!?;:'"“”‘’()[\]{}<>«»]+|[\s.,!?;:'"“”‘’()[\]{}<>«»]+$/g, '')
    .trim();
}

function isNumberOrSymbol(token: string): boolean {
  return /^[\d\W_]+$/u.test(token);
}

function isFunctionWord(token: string, language: LearningLanguage): boolean {
  const normalized = token.toLocaleLowerCase(language === 'vi' ? 'vi-VN' : undefined);
  if (language === 'vi') return VI_FUNCTION_WORDS.has(normalized);
  if (language === 'ko') return KO_FUNCTION_WORDS.has(normalized);
  if (language === 'en') return EN_FUNCTION_WORDS.has(normalized);
  return false;
}

export function tokenizeForLearning(text: string, language?: string): LearningToken[] {
  const lang: LearningLanguage = language === 'ko' || language === 'vi' || language === 'en'
    ? language
    : 'unknown';

  return text.split(/\s+/).map((raw) => {
    const cleaned = stripPunctuation(raw);
    const clickable = Boolean(cleaned)
      && !isNumberOrSymbol(cleaned)
      && !isFunctionWord(cleaned, lang)
      && cleaned.length >= (lang === 'ko' ? 2 : 2);

    return {
      text: cleaned || raw,
      lookupText: cleaned || raw,
      clickable,
    };
  });
}
