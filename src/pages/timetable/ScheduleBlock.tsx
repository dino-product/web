import clsx from 'clsx';
import type { DragEvent, MouseEvent, PointerEvent } from 'react';

import { ScheduleCard, type SolidChipStatus } from '@/design-system';
import { formatTimeRange } from '@/lib/format';
import { TASK_STATUS_LABEL, type Task } from '@/data/types';

import styles from './ScheduleBlock.module.css';

/** 블록 양 끝 손잡이. start = 왼쪽(시작 시각), end = 오른쪽(종료 시각) */
export type ResizeEdge = 'start' | 'end';

interface ScheduleBlockProps {
  task: Task;
  /** 등록자 이름 — 직원 칩 '직원 (박서준)' */
  registrantName: string;
  left: number;
  top: number;
  width: number;
  /** 편집 모드 선택(1039:4935: Secondary 1.4px 안쪽 테두리) */
  selected: boolean;
  /** 다른 블록이 선택됐을 때 흐리게(불투명 50%) */
  dimmed: boolean;
  draggable: boolean;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
  /** 있으면 양 끝에 손잡이를 그리고, 누르면 그 끝으로 시간 조절을 시작한다 */
  onResizeStart?: (edge: ResizeEdge, event: PointerEvent<HTMLSpanElement>) => void;
}

/**
 * 타임테이블 일정 블록. 배정됨·작업전·작업중은 DS ScheduleCard(443:1651·443:1662·443:1661) 그대로,
 * 완료는 시안이 없어 같은 블록에 Completed 색(배경 Completed/2, 막대·칩 Completed/1)을 입혔다.
 */
export default function ScheduleBlock({
  task,
  registrantName,
  left,
  top,
  width,
  selected,
  dimmed,
  draggable,
  onClick,
  onDragStart,
  onDragEnd,
  onResizeStart,
}: ScheduleBlockProps) {
  const timeRange = task.startTime && task.durationMinutes != null ? formatTimeRange(task.startTime, task.durationMinutes) : '';
  const staffLabel = `직원 (${registrantName})`;
  const completed = task.status === 'COMPLETED';

  return (
    <div
      className={clsx(styles.block, selected && styles.selected, dimmed && styles.dimmed, draggable && styles.draggable)}
      style={{ left, top, width }}
      draggable={draggable}
      data-task-id={task.id}
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {completed ? (
        <>
          <ScheduleCard
            status="ACCEPTED"
            showStatus={false}
            className={styles.completedCard}
            width={width}
            title={task.title}
            timeRange={timeRange}
            staffLabel={staffLabel}
          />
          <span className={clsx('t-body-xs-medium', styles.completedChip)}>{TASK_STATUS_LABEL.COMPLETED}</span>
        </>
      ) : (
        <ScheduleCard
          status={task.status as SolidChipStatus}
          width={width}
          title={task.title}
          timeRange={timeRange}
          staffLabel={staffLabel}
        />
      )}
      {onResizeStart &&
        (['start', 'end'] as const).map((edge) => (
          <span
            key={edge}
            className={clsx(styles.resizeHandle, edge === 'start' ? styles.resizeStart : styles.resizeEnd)}
            onPointerDown={(event) => onResizeStart(edge, event)}
            // 조절을 마친 클릭이 블록 선택·격자 선택 해제로 이어지지 않게 한다.
            onClick={(event) => event.stopPropagation()}
            aria-hidden
          />
        ))}
    </div>
  );
}
