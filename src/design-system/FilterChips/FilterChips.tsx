import clsx from 'clsx';
import type { ReactNode } from 'react';

import styles from './FilterChips.module.css';

export interface FilterChipItem<K extends string> {
  key: K;
  label: ReactNode;
}

export interface FilterChipsProps<K extends string> {
  items: FilterChipItem<K>[];
  value: K;
  onChange: (key: K) => void;
  /** 칩 너비(px). 기본 98 — 알림창 '전체' / '안 읽음 2' */
  width?: number;
  gap?: number;
  className?: string;
  'aria-label'?: string;
}

/**
 * 알림창 전체·안 읽음 필터(2053:9745). 98x40, padding 8/12, radius 29, 16/500.
 * 선택: Primary 배경 + 흰 글자 · 기본: Primary 1px 테두리 + Primary 글자.
 */
export function FilterChips<K extends string>({
  items,
  value,
  onChange,
  width = 98,
  gap = 12,
  className,
  'aria-label': ariaLabel,
}: FilterChipsProps<K>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={clsx(styles.group, className)} style={{ gap }}>
      {items.map((item) => {
        const selected = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={selected}
            className={clsx(styles.chip, selected && styles.selected)}
            style={{ width }}
            onClick={() => onChange(item.key)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
