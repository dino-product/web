import clsx from 'clsx';

import { TASK_STATUS_LABEL, type TaskStatus } from '@/mocks/types';

import { Chip, type ChipTone } from '../Chip/Chip';
import styles from './StatusChip.module.css';

/** Figma 칩이 있는 값: 작업 상태 5종(취소 제외) + 보조 배지 거절·지연 */
export type ChipStatus = Exclude<TaskStatus, 'CANCELED'> | 'REJECTED' | 'DELAYED';

export const CHIP_STATUS_LABEL: Record<ChipStatus, string> = {
  REGISTERED: TASK_STATUS_LABEL.REGISTERED,
  PENDING_ACCEPT: TASK_STATUS_LABEL.PENDING_ACCEPT,
  ACCEPTED: TASK_STATUS_LABEL.ACCEPTED,
  IN_PROGRESS: TASK_STATUS_LABEL.IN_PROGRESS,
  COMPLETED: TASK_STATUS_LABEL.COMPLETED,
  REJECTED: '거절',
  DELAYED: '지연',
};

const TONE: Record<ChipStatus, ChipTone> = {
  REGISTERED: 'registered',
  PENDING_ACCEPT: 'pending',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'inProgress',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  DELAYED: 'delayed',
};

/** solid 모양이 있는 상태(타임테이블 일정 블록 칩, 옛 Status Chip 449:2590) */
export type SolidChipStatus = 'PENDING_ACCEPT' | 'ACCEPTED' | 'IN_PROGRESS';

export interface StatusChipProps {
  status: ChipStatus;
  /** md: 목록·보드(30px, 16/500) · sm: 작업 상세(28px, 14/500) */
  size?: 'md' | 'sm';
  /**
   * soft(기본): 작업상태 컬러칩 2293:11954 · 작업 상세 컬러 칩 2423:12709
   * solid: 타임테이블 블록 칩(radius 8) — 배정됨 Pending/2·Pending/1, 작업전 Secondary·흰색, 작업중 InProgress/1·흰색.
   *        solid 시안이 없는 상태는 soft로 그린다.
   */
  appearance?: 'soft' | 'solid';
  className?: string;
}

/** 작업 상태 칩. 표기는 TASK_STATUS_LABEL(등록·배정됨·작업전·작업중·완료) + 거절·지연 배지. */
export function StatusChip({ status, size = 'md', appearance = 'soft', className }: StatusChipProps) {
  const label = CHIP_STATUS_LABEL[status];
  if (appearance === 'solid' && (status === 'PENDING_ACCEPT' || status === 'ACCEPTED' || status === 'IN_PROGRESS')) {
    return <span className={clsx(styles.solid, styles[status], className)}>{label}</span>;
  }
  return (
    <Chip tone={TONE[status]} size={size} className={className}>
      {label}
    </Chip>
  );
}
