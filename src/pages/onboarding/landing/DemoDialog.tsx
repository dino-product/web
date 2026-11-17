import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/design-system';

import styles from './DemoDialog.module.css';

export interface DemoDialogProps {
  /** 제목 앞 아이콘(28px) */
  icon?: { name: IconName; color: string };
  title: string;
  description?: string;
  /** 제목 줄과 설명 사이 간격(px). DS Dialog 기본 23 */
  headerGap?: number;
  children?: ReactNode;
  actions: ReactNode;
}

/**
 * 시연 장면 안의 확인 모달. DS Dialog(흰 카드 575, radius 18, padding 30, 간격 24)와 같은 모양이지만
 * 화면 전체를 덮는 대신 장면 안에서만 어두운 배경 위에 뜬다.
 */
export function DemoDialog({ icon, title, description, headerGap = 23, children, actions }: DemoDialogProps) {
  return (
    <div className={styles.dim}>
      <div className={styles.card}>
        <div className={styles.header} style={{ gap: headerGap }}>
          <div className={styles.titleRow}>
            {icon && <Icon name={icon.name} size={28} color={icon.color} />}
            <span className={styles.title}>{title}</span>
          </div>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {children}
        <div className={styles.actions}>{actions}</div>
      </div>
    </div>
  );
}

export interface DemoSelectBoxProps {
  label: string;
  /** 고른 값. 없으면 placeholder를 흐리게 보여 준다 */
  value?: string;
  placeholder?: string;
}

/** 모달 안의 선택 상자(라벨 18/500 → 8 → 56px 상자, Gray200 테두리, radius 12) */
export function DemoSelectBox({ label, value, placeholder }: DemoSelectBoxProps) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.select}>
        <span className={value ? styles.selectValue : styles.selectPlaceholder}>{value ?? placeholder}</span>
        <Icon name="chevron-down" size={24} color="var(--color-gray-600)" />
      </span>
    </div>
  );
}
