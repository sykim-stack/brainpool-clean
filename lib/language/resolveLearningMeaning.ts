/**
 * 학습용 뜻 = 클릭 언어의 반대쪽.
 * 사전이 같은 언어이거나(품질 낮은 영문 매핑 등) 부적절하면 문장 원문으로 폴백.
 * 언어 쌍이 늘어도 sourceLang + original 문맥만 있으면 동작.
 */
export function resolveLearningMeaning(opts: {
  word: string;
  meaning?: string | null;
  standard?: string | null;
  sourceLang?: string;
  original?: string;
}): string | null {
  const word = (opts.word || '').trim();
  const original = (opts.original || '').trim();
  const candidates = [opts.meaning, opts.standard]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean);

  const hasHangul = (s: string) => /[가-힣]/.test(s);
  const hasViDiacritic = (s: string) =>
    /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(s);
  const wordIsKo = hasHangul(word);

  for (const c of candidates) {
    if (!c || c === word) continue;
    const cIsKo = hasHangul(c);
    if (wordIsKo === cIsKo) continue;

    // VI→KO: 사전이 "Hi"처럼 영문만 주고 원문이 베트남어면 원문 우선
    if (
      opts.sourceLang === 'vi' &&
      wordIsKo &&
      original &&
      original !== c &&
      !hasHangul(original) &&
      hasViDiacritic(original) &&
      !hasViDiacritic(c) &&
      /^[A-Za-z][A-Za-z\s'.-]*$/.test(c)
    ) {
      return original;
    }
    return c;
  }

  if (original && original !== word) return original;
  return candidates[0] || null;
}
