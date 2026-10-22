import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

import type { TypeColor } from '@/data/types';

import { Icon } from '../Icon/Icon';
import { WorkTypeBadge } from '../WorkTypeBadge/WorkTypeBadge';
import styles from './WorkCard.module.css';

export interface WorkCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** 작업 유형 배지. null이면 배지를 그리지 않는다 */
  workType: { name: string; color: TypeColor | null } | null;
  /** 작업명(20/600, line-height auto, #000) */
  title: ReactNode;
  /** 오른쪽 위 문구(14/500 Gray600). 예: '기사 미정' */
  assigneeLabel?: ReactNode;
  /** 아래 시계 줄 문구(13/500 Gray600). 예: '등록 3일 경과' */
  meta?: ReactNode;
}

/**
 * 타임테이블 대기함 카드(443:1197, DS `Work Card` 449:2567의 화면 버전).
 * 247x122 흰 카드, radius 12. 배지 (16,16) · 오른쪽 위 문구 (오른쪽 16, 위 16) · 작업명 (16,60) · 시계 줄 (16,90).
 * 대기함 패널(Primary 배경, radius 20) 안에서 간격 14로 쌓는다.
 */
export function WorkCard({ workType, title, assigneeLabel, meta, className, ...rest }: WorkCardProps) {
  return (
    <div className={clsx(styles.card, className)} {...rest}>
      {workType && <WorkTypeBadge name={workType.name} color={workType.color} className={styles.badge} />}
      {assigneeLabel !== undefined && <span className={styles.assignee}>{assigneeLabel}</span>}
      <p className={styles.title}>{title}</p>
      {meta !== undefined && (
        <span className={styles.meta}>
          <Icon name="clock" size={16} color="var(--color-gray-600)" />
          {meta}
        </span>
      )}
    </div>
  );
}
