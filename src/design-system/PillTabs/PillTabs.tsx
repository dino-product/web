import clsx from 'clsx';
import type { ReactNode } from 'react';

import styles from './PillTabs.module.css';

export interface PillTab<K extends string> {
  key: K;
  label: ReactNode;
  /** 라벨 오른쪽 건수(16/500 Secondary) — 인력관리 '전체 7 / 직원 7 / 기사 7' */
  count?: ReactNode;
}

export interface PillTabsProps<K extends string> {
  tabs: PillTab<K>[];
  value: K;
  onChange: (key: K) => void;
  /** 탭 간격(px). 기본 12 */
  gap?: number;
  className?: string;
  'aria-label'?: string;
}

/**
 * Figma `Tab / Type` 1892:12204 — 알약형 탭(유형 설정 직원유형/기사유형/작업유형)과
 * 인력관리 건수 필터(1951:19283). 높이 45, padding 10/16, radius 51, 18/600, 글자 80% 불투명.
 * 선택: Gray50 배경 + Primary 글자 · 기본: 배경 없음 + Gray600 글자.
 */
export function PillTabs<K extends string>({
  tabs,
  value,
  onChange,
  gap = 12,
  className,
  'aria-label': ariaLabel,
}: PillTabsProps<K>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={clsx(styles.tabs, className)} style={{ gap }}>
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            className={clsx(styles.tab, selected && styles.selected)}
            onClick={() => onChange(tab.key)}
          >
            <span className={styles.label}>{tab.label}</span>
            {tab.count !== undefined && <span className={styles.count}>{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
