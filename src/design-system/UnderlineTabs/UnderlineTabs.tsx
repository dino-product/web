import clsx from 'clsx';
import type { ReactNode } from 'react';

import styles from './UnderlineTabs.module.css';

export interface UnderlineTab<K extends string> {
  key: K;
  label: ReactNode;
  /** 라벨 오른쪽 건수(16/500 Secondary). 없으면 표시하지 않는다(조직 설정 탭) */
  count?: ReactNode;
  /**
   * Figma 47px 탭 인스턴스(조직 설정 Component 11·12, 진행 보드 Component 15~17). 47px 줄의 y=0에 놓여
   * 라벨이 기본 탭(45px, y=1)보다 1px 위, 막대는 1px 아래(줄 맨 아래)에 그려진다.
   */
  tall?: boolean;
}

export interface UnderlineTabsProps<K extends string> {
  tabs: UnderlineTab<K>[];
  value: K;
  onChange: (key: K) => void;
  /** 탭 너비(px). 기본 128 — 조직 설정 4탭 512px, 진행 보드 5탭 640px */
  tabWidth?: number;
  className?: string;
  'aria-label'?: string;
}

/**
 * Figma `Tab Bar` 878:4101/878:4344 — 밑줄 탭.
 * 라벨 20/500(비활성 #4c4c4c — 조직 설정·진행 보드 화면 인스턴스 값, 활성 #000), 건수 16/500 Secondary(padding 2/8),
 * 라벨 아래 14px에 3px 막대(활성 Secondary). `tall` 탭은 라벨 아래 16px.
 * 진행 보드 탭은 새 표기(전체·배정됨·작업전·작업중·완료)를 넘긴다.
 */
export function UnderlineTabs<K extends string>({
  tabs,
  value,
  onChange,
  tabWidth = 128,
  className,
  'aria-label': ariaLabel,
}: UnderlineTabsProps<K>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={clsx(styles.tabs, className)}>
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={clsx(styles.tab, tab.tall && styles.tall, active && styles.active)}
            style={{ width: tabWidth }}
            onClick={() => onChange(tab.key)}
          >
            <span className={styles.labelRow}>
              <span className={styles.label}>{tab.label}</span>
              {tab.count !== undefined && <span className={styles.count}>{tab.count}</span>}
            </span>
            <span className={styles.bar} />
          </button>
        );
      })}
    </div>
  );
}
