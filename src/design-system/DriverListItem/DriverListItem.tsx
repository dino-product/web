import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

import avatarPlaceholder from '@/assets/images/avatar-placeholder.png';

import styles from './DriverListItem.module.css';

export interface DriverListItemProps extends HTMLAttributes<HTMLDivElement> {
  /** 기사 이름(20/600 Gray900) */
  name: string;
  /** 기사 유형(16/500 Gray700). 예: '전문 기사' */
  role: string;
  /** 사진. 없으면 Figma 이미지 채움(바둑판 자리표시 이미지) */
  avatarSrc?: string | null;
}

/**
 * Figma `Driver List Item` 449:2562(타임테이블 443:1277 인스턴스) — 타임테이블 왼쪽 기사 칸.
 * 184x111, padding 4/16, 간격 16, 오른쪽·아래 Gray300 1px. 사진 54px 원 + 이름/유형(간격 4).
 */
export function DriverListItem({ name, role, avatarSrc, className, ...rest }: DriverListItemProps) {
  return (
    <div className={clsx(styles.item, className)} {...rest}>
      <img className={styles.avatar} src={avatarSrc || avatarPlaceholder} alt="" />
      <div className={styles.texts}>
        <span className={styles.name}>{name}</span>
        <span className={styles.role}>{role}</span>
      </div>
    </div>
  );
}
