export type LearningLanguage = 'ko' | 'vi' | 'en' | 'unknown';

export interface LearningToken {
  text: string;
  lookupText: string;
  clickable: boolean;
  /** high: 학습 우선 후보, low: 기능어 등 낮은 우선순위 */
  priority?: 'high' | 'low';
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

/**
 * 베트남어 학습 단위로 안전하게 묶을 수 있는 알려진 복합어만 등록.
 * 사전에 없는 인접 음절을 임의로 합치지 않는다. 긴 것 우선 매칭.
 */
const VI_KNOWN_COMPOUNDS = [
  'xin chào',
  'tin nhắn',
  'thử nghiệm',
  'cảm ơn',
  'xin lỗi',
  'tạm biệt',
  'hẹn gặp lại',
  'không sao',
  'làm ơn',
].sort((a, b) => b.length - a.length);

function stripPunctuation(token: string): string {
  return token
    .replace(/^[\s.,!?;:'"“”‘’()[\]{}<>«»…]+|[\s.,!?;:'"“”‘’()[\]{}<>«»…]+$/g, '')
    .trim();
}

function isNumberOrSymbol(token: string): boolean {
  // ASCII \W 는 한글 등을 기호로 오인한다. 문자가 하나라도 있으면 단어로 본다.
  if (/[\p{L}\p{M}]/u.test(token)) return false;
  return /^[\d\s\p{P}\p{S}_]+$/u.test(token);
}

function normalizeVi(text: string): string {
  return text.toLocaleLowerCase('vi-VN').normalize('NFC');
}

function isFunctionWord(token: string, language: LearningLanguage): boolean {
  const normalized = language === 'vi'
    ? normalizeVi(token)
    : token.toLocaleLowerCase();
  if (language === 'vi') return VI_FUNCTION_WORDS.has(normalized);
  if (language === 'ko') return KO_FUNCTION_WORDS.has(normalized);
  if (language === 'en') return EN_FUNCTION_WORDS.has(normalized);
  return false;
}

type RawPart = { kind: 'word' | 'sep'; text: string };

/** 원문 띄어쓰기·문장부호를 보존한 채 word / separator 로 분리 */
function splitPreservingSeparators(text: string): RawPart[] {
  const parts: RawPart[] = [];
  const re = /([\p{L}\p{M}0-9]+)|([^\p{L}\p{M}0-9]+)/gu;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match[1]) parts.push({ kind: 'word', text: match[1] });
    else if (match[2]) parts.push({ kind: 'sep', text: match[2] });
  }
  return parts;
}

/**
 * 알려진 복합어만 좌→우 최장 매칭으로 묶는다.
 * 단어 사이에 공백만 있는 경우에만 병합하고, 문장부호가 끼면 끊는다.
 */
function mergeKnownViCompounds(parts: RawPart[]): RawPart[] {
  const out: RawPart[] = [];
  let i = 0;

  while (i < parts.length) {
    const part = parts[i];
    if (part.kind !== 'word') {
      out.push(part);
      i += 1;
      continue;
    }

    let merged = false;
    for (const compound of VI_KNOWN_COMPOUNDS) {
      const syllables = compound.split(' ');
      let ok = true;
      let cursor = i;
      const surfacePieces: string[] = [];

      for (let s = 0; s < syllables.length; s += 1) {
        const wordPart = parts[cursor];
        if (!wordPart || wordPart.kind !== 'word') {
          ok = false;
          break;
        }
        if (normalizeVi(wordPart.text) !== syllables[s]) {
          ok = false;
          break;
        }
        surfacePieces.push(wordPart.text);
        cursor += 1;

        if (s < syllables.length - 1) {
          const sep = parts[cursor];
          // 복합어 내부는 공백만 허용. 문장부호가 끼면 병합하지 않음.
          if (!sep || sep.kind !== 'sep' || !/^\s+$/.test(sep.text)) {
            ok = false;
            break;
          }
          surfacePieces.push(sep.text);
          cursor += 1;
        }
      }

      if (ok && syllables.length > 1) {
        out.push({ kind: 'word', text: surfacePieces.join('') });
        i = cursor;
        merged = true;
        break;
      }
    }

    if (!merged) {
      out.push(part);
      i += 1;
    }
  }

  return out;
}

function toLearningToken(
  surface: string,
  language: LearningLanguage,
): LearningToken {
  const cleaned = stripPunctuation(surface);
  const isFunc = cleaned ? isFunctionWord(cleaned, language) : false;
  const isJunk = !cleaned || isNumberOrSymbol(cleaned);
  const minLen = 2;

  // 기능어는 스트림에서 제거하지 않고, 클릭 우선순위만 낮춘다.
  // (학습 후보 목록/우선 클릭 대상에서는 제외)
  const clickable = !isJunk && !isFunc && cleaned.length >= minLen;

  return {
    text: surface,
    lookupText: cleaned || surface,
    clickable,
    priority: isFunc ? 'low' : clickable ? 'high' : 'low',
  };
}

export function tokenizeForLearning(text: string, language?: string): LearningToken[] {
  const lang: LearningLanguage = language === 'ko' || language === 'vi' || language === 'en'
    ? language
    : 'unknown';

  if (!text) return [];

  let parts = splitPreservingSeparators(text);
  if (lang === 'vi') {
    parts = mergeKnownViCompounds(parts);
  }

  // word와 바로 뒤따르는 문장부호(공백 제외)를 하나의 surface 로 붙인다.
  // 예: "chào" + "," → "chào,"  — 원문 문장부호 보존.
  const tokens: LearningToken[] = [];
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];

    if (part.kind === 'sep') {
      // 단독 구분자는 클릭 불가 토큰으로 보존 (띄어쓰기·문장부호)
      if (part.text.length > 0) {
        tokens.push({
          text: part.text,
          lookupText: '',
          clickable: false,
          priority: 'low',
        });
      }
      i += 1;
      continue;
    }

    let surface = part.text;
    i += 1;

    // 단어 직후 공백 아닌 문장부호는 surface 에 부착
    if (i < parts.length && parts[i].kind === 'sep' && !/^\s+$/.test(parts[i].text)) {
      const sepText = parts[i].text;
      // 문장부호 + 뒤 공백이 한 sep 에 붙어 있을 수 있음 → 문장부호만 부착, 공백은 다음 토큰
      const punctMatch = sepText.match(/^([^\s]+)(\s.*)?$/);
      if (punctMatch) {
        surface += punctMatch[1];
        if (punctMatch[2]) {
          tokens.push(toLearningToken(surface, lang));
          tokens.push({
            text: punctMatch[2],
            lookupText: '',
            clickable: false,
            priority: 'low',
          });
          i += 1;
          continue;
        }
        i += 1;
      }
    }

    tokens.push(toLearningToken(surface, lang));
  }

  return tokens;
}
