'use client';

import styles from './OpportunityBanner.module.css';

export type OpportunityItem = {
  id: string;
  label: string;
};

type Props = {
  items: OpportunityItem[];
  onDismiss: (id: string) => void;
};

/**
 * CoreHub opportunity 1줄 배지 (Step 6 최소판)
 * CoreNull YardClient ACTION_LABEL 톤과 맞춤.
 * 판단/강요 없음 — 표시 + 닫기만.
 */
export default function OpportunityBanner({ items, onDismiss }: Props) {
  if (!items.length) return null;

  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={styles.row}>
          <span className={styles.label}>{item.label}</span>
          <button
            type="button"
            className={styles.close}
            aria-label="닫기"
            onClick={() => onDismiss(item.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
