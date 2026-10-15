/** UI 설정 언어 (해설·안내 문구용). 학습 대상 언어(target)와 분리한다. */

export const UI_LOCALE_KEY = 'corering_ui_locale';
export const LEARNING_SOURCE_KEY = 'corering_learning_source';
export const LEARNING_TARGET_KEY = 'corering_learning_target';

export const SUPPORTED_UI_LOCALES = ['ko', 'vi', 'en'] as const;
export type UiLocale = (typeof SUPPORTED_UI_LOCALES)[number];

/** 학습 출발/목표 언어 (채팅 번역 엔진과 별개 설정) */
export const SUPPORTED_LEARNING_LANGS = ['ko', 'vi'] as const;
export type LearningLang = (typeof SUPPORTED_LEARNING_LANGS)[number];

const DEFAULT_UI_LOCALE: UiLocale = 'ko';
const DEFAULT_LEARNING_SOURCE: LearningLang = 'vi';
const DEFAULT_LEARNING_TARGET: LearningLang = 'ko';

/** BCP-47 / 짧은 코드 / 잘못된 값을 지원 locale로 정규화 */
export function normalizeUiLocale(value: unknown): UiLocale {
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_UI_LOCALE;
  const primary = value.trim().toLowerCase().split(/[-_]/)[0];
  if (primary === 'ko' || primary === 'vi' || primary === 'en') return primary;
  return DEFAULT_UI_LOCALE;
}

export function normalizeLearningLang(value: unknown): LearningLang {
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_LEARNING_SOURCE;
  const primary = value.trim().toLowerCase().split(/[-_]/)[0];
  if (primary === 'ko' || primary === 'vi') return primary;
  return DEFAULT_LEARNING_SOURCE;
}

function detectBrowserLocale(): UiLocale {
  if (typeof navigator === 'undefined') return DEFAULT_UI_LOCALE;
  const candidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ].filter(Boolean);
  for (const raw of candidates) {
    const normalized = normalizeUiLocale(raw);
    if (normalized) return normalized;
  }
  return DEFAULT_UI_LOCALE;
}

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode 등
  }
}

/** localStorage → 브라우저 언어 순으로 UI locale 결정 */
export function getUiLocale(): UiLocale {
  const saved = readStorage(UI_LOCALE_KEY);
  if (saved) return normalizeUiLocale(saved);
  return detectBrowserLocale();
}

export function setUiLocale(locale: string): UiLocale {
  const normalized = normalizeUiLocale(locale);
  writeStorage(UI_LOCALE_KEY, normalized);
  return normalized;
}

/** 학습 출발 언어 (기본: vi) */
export function getLearningSource(): LearningLang {
  const saved = readStorage(LEARNING_SOURCE_KEY);
  if (saved) return normalizeLearningLang(saved);
  return DEFAULT_LEARNING_SOURCE;
}

export function setLearningSource(lang: string): LearningLang {
  const normalized = normalizeLearningLang(lang);
  writeStorage(LEARNING_SOURCE_KEY, normalized);
  return normalized;
}

/** 학습 목표 언어 (기본: ko) */
export function getLearningTarget(): LearningLang {
  const saved = readStorage(LEARNING_TARGET_KEY);
  if (saved) return normalizeLearningLang(saved);
  return DEFAULT_LEARNING_TARGET;
}

export function setLearningTarget(lang: string): LearningLang {
  const normalized = normalizeLearningLang(lang);
  writeStorage(LEARNING_TARGET_KEY, normalized);
  return normalized;
}

/** source/target이 같으면 target을 반대 언어로 보정 */
export function setLearningDirection(source: string, target: string): {
  source: LearningLang;
  target: LearningLang;
} {
  let s = normalizeLearningLang(source);
  let t = normalizeLearningLang(target);
  if (s === t) {
    t = s === 'ko' ? 'vi' : 'ko';
  }
  writeStorage(LEARNING_SOURCE_KEY, s);
  writeStorage(LEARNING_TARGET_KEY, t);
  return { source: s, target: t };
}
