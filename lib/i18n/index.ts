import { getUiLocale, type UiLocale } from '@/lib/locale';
import { translate, type MessageKey } from './messages';

export type { MessageKey };
export { translate } from './messages';

/** 현재 UI locale 기준 번역. 클라이언트 전용 */
export function t(
  key: MessageKey,
  vars?: Record<string, string | number>,
  locale?: UiLocale,
): string {
  const loc = locale ?? getUiLocale();
  return translate(loc, key, vars);
}
