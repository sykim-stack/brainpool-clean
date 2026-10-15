/** UI 설정 언어 (해설·안내 문구용). 학습 대상 언어(target)와 분리한다. */

export const UI_LOCALE_KEY = 'corering_ui_locale';
export const LEARNING_SOURCE_KEY = 'corering_learning_source';
export const LEARNING_TARGET_KEY = 'corering_learning_target';

export const SUPPORTED_UI_LOCALES = ['ko', 'vi', 'en'] as const;
export type UiLocale = (typeof SUPPORTED_UI_LOCALES)[number];
export type LearningLanguage = 'ko' | 'vi';

const DEFAULT_UI_LOCALE: UiLocale = 'ko';

/** BCP-47 / 짧은 코드 / 잘못된 값을 지원 locale로 정규화 */
export function normalizeUiLocale(value: unknown): UiLocale {
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_UI_LOCALE;
  const primary = value.trim().toLowerCase().split(/[-_]/)[0];
  if (primary === 'ko' || primary === 'vi' || primary === 'en') return primary;
  return DEFAULT_UI_LOCALE;
}

function detectBrowserLocale(): UiLocale {
  if (typeof navigator === 'undefined') return DEFAULT_UI_LOCALE;
  const candidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ].filter(Boolean);
  for (const raw of candidates) {
    const normalized = normalizeUiLocale(raw);
    // navigator가 en-US만 있어도 en으로 인정
    if (normalized) return normalized;
  }
  return DEFAULT_UI_LOCALE;
}

/** localStorage → 브라우저 언어 순으로 UI locale 결정 */
export function getUiLocale(): UiLocale {
  if (typeof window === 'undefined') return DEFAULT_UI_LOCALE;
  try {
    const saved = localStorage.getItem(UI_LOCALE_KEY);
    if (saved) return normalizeUiLocale(saved);
  } catch {
    // private mode 등
  }
  return detectBrowserLocale();
}

export function setUiLocale(locale: string): UiLocale {
  const normalized = normalizeUiLocale(locale);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(UI_LOCALE_KEY, normalized);
    } catch {
      // ignore
    }
  }
  return normalized;
}

function normalizeLearningLanguage(value: unknown, fallback: LearningLanguage): LearningLanguage {
  return value === 'ko' || value === 'vi' ? value : fallback;
}

function readLearningPreference(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** UI 표시 언어와 독립적으로 저장하는 학습 방향. 기본값은 한국어 → 베트남어다. */
export function getLearningDirection(): { source: LearningLanguage; target: LearningLanguage } {
  const source = normalizeLearningLanguage(readLearningPreference(LEARNING_SOURCE_KEY), 'ko');
  const target = normalizeLearningLanguage(
    readLearningPreference(LEARNING_TARGET_KEY),
    source === 'ko' ? 'vi' : 'ko',
  );
  return target === source ? { source, target: source === 'ko' ? 'vi' : 'ko' } : { source, target };
}

export function setLearningDirection(
  source: LearningLanguage,
  target: LearningLanguage,
): { source: LearningLanguage; target: LearningLanguage } {
  const normalizedSource = normalizeLearningLanguage(source, 'ko');
  const normalizedTarget = normalizeLearningLanguage(
    target,
    normalizedSource === 'ko' ? 'vi' : 'ko',
  );
  const direction: { source: LearningLanguage; target: LearningLanguage } = normalizedTarget === normalizedSource
    ? { source: normalizedSource, target: normalizedSource === 'ko' ? 'vi' : 'ko' }
    : { source: normalizedSource, target: normalizedTarget };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LEARNING_SOURCE_KEY, direction.source);
      localStorage.setItem(LEARNING_TARGET_KEY, direction.target);
    } catch {
      // 저장소 사용 불가 환경에서는 현재 화면 상태만 유지한다.
    }
  }
  return direction;
}
