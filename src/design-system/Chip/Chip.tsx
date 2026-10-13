import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

import styles from './Chip.module.css';

/**
 * 색 조합(배경 / 글자) — Figma 변수
 * - registered: Registered/2 / Registered/1 (등록)
 * - pending: Pending/3 / Pending/1 (배정됨)
 * - accepted: Accepted/2 / Accepted/1 (작업전)
 * - inProgress: InProgress/4 / InProgress/5 (작업중, 불일치)
 * - completed: Completed/2 / Completed/1 (완료)
 * - rejected: Warning/2 / Warning/1 (거절)
 * - delayed: Delayed/2 / Delayed/1 (지연)
 * - active: #4f3bfe 12% / #4f3bfe (활성화, Component 15)
 * - inactive: Gray100 / Gray700 (비활성화, Component 15)
 */
export type ChipTone =
  'registered' | 'pending' | 'accepted' | 'inProgress' | 'completed' | 'rejected' | 'delayed' | 'active' | 'inactive';

/**
 * - md: 높이 30, padding 4/10, radius 50, 16/500 — 작업상태 컬러칩 2293:11954(목록·보드)
 * - sm: 높이 28, padding 4/10, radius 50, 14/500 — 작업 상세 컬러 칩 2423:12709
 * - xs: 높이 25, padding 4/7, radius 6, 12/500 — 작업유형 상태 882:4620
 */
export type ChipSize = 'md' | 'sm' | 'xs';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone: ChipTone;
  size?: ChipSize;
  children: ReactNode;
}

const TONE_CLASS: Record<ChipTone, string> = {
  registered: styles.registered,
  pending: styles.pending,
  accepted: styles.accepted,
  inProgress: styles.inProgress,
  completed: styles.completed,
  rejected: styles.rejected,
  delayed: styles.delayed,
  active: styles.active,
  inactive: styles.inactive,
};

/** 상태·구분 칩 기본형. 작업 상태는 StatusChip, 인력 상태는 MemberStatusChip을 쓴다. */
export function Chip({ tone, size = 'md', className, children, ...rest }: ChipProps) {
  return (
    <span className={clsx(styles.chip, styles[size], TONE_CLASS[tone], className)} {...rest}>
      {children}
    </span>
  );
}
