import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

import { Icon } from '../Icon/Icon';
import { type SolidChipStatus, StatusChip } from '../StatusChip/StatusChip';
import styles from './ScheduleCard.module.css';

export interface ScheduleCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * 블록 색(타임테이블 443:1156)
   * - PENDING_ACCEPT(배정됨): Pending/3 배경, Gray500 막대 9px, 직원 칩 Gray300 테두리 (443:1651)
   * - ACCEPTED(작업전): Confirmed 배경, Secondary 막대 9px, 직원 칩 Primary100 테두리 (443:1662)
   * - IN_PROGRESS(작업중): InProgress/2 배경, InProgress/1 막대 8px, 직원 칩 InProgress/3 테두리 (Schedule Card 443:1661)
   */
  status: SolidChipStatus;
  /** 작업명(20/500). 넘치면 말줄임 */
  title: ReactNode;
  /** 시간(14/500 Gray600). 예: '09:00 - 11:00' */
  timeRange: ReactNode;
  /** 직원 칩 글자(14/500 Gray900 90%). 예: '직원 (박서준)'. 없으면 칩을 그리지 않는다 */
  staffLabel?: ReactNode;
  /** 블록 너비(px) — 시간 길이에 맞춰 화면에서 계산 */
  width?: number;
  /** 오른쪽 위 상태 칩 표시. 기본 true */
  showStatus?: boolean;
}

const TONE_CLASS: Record<SolidChipStatus, string> = {
  PENDING_ACCEPT: styles.pending,
  ACCEPTED: styles.accepted,
  IN_PROGRESS: styles.inProgress,
};

/**
 * 타임테이블 일정 블록(DS `Schedule Card` 449:2610의 화면 버전). 높이 110, 오른쪽 모서리 radius 12,
 * 왼쪽 막대 + 내용(왼쪽 33, 위 12: 작업명·시간 간격 2, 9 아래 직원 칩) + 오른쪽 위 상태 칩(위 12, 오른쪽 12).
 */
export function ScheduleCard({
  status,
  title,
  timeRange,
  staffLabel,
  width,
  showStatus = true,
  className,
  style,
  ...rest
}: ScheduleCardProps) {
  return (
    <div className={clsx(styles.card, TONE_CLASS[status], className)} style={{ width, ...style }} {...rest}>
      <span className={styles.bar} aria-hidden />
      <div className={styles.content}>
        <div className={styles.texts}>
          <span className={styles.title}>{title}</span>
          <span className={styles.time}>{timeRange}</span>
        </div>
        {staffLabel !== undefined && (
          <span className={styles.staff}>
            <Icon name="people-fill" size={24} color="#2a343d" />
            <span className={styles.staffLabel}>{staffLabel}</span>
          </span>
        )}
      </div>
      {showStatus && <StatusChip status={status} appearance="solid" className={styles.chip} />}
    </div>
  );
}
