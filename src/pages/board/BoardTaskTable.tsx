import clsx from 'clsx';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { Icon, StateMessage, StatusChip } from '@/design-system';
import { formatTaskTime } from '@/lib/format';
import { useAppStore } from '@/mocks/store';
import type { Task } from '@/mocks/types';

import styles from './BoardTaskTable.module.css';

interface BoardTaskTableProps {
  /** 선택한 탭의 오늘 작업(배정됨·작업전·작업중·완료, 시작 시각 순) */
  tasks: Task[];
}

/**
 * 작업 상태 표(575:3955): 상태(칩 + 거절·지연 배지) · 고객 · 작업 · 시간 · 담당 기사.
 * 행을 누르면 /board/:taskId 작업 상세 모달. 작업이 없으면 목록 없음(2043:36008).
 */
export default function BoardTaskTable({ tasks }: BoardTaskTableProps) {
  const members = useAppStore((s) => s.members);
  const memberNames = useMemo(() => new Map(members.map((member) => [member.id, member.name])), [members]);

  return (
    <div className={styles.table}>
      <div className={clsx('t-body-xs-medium', styles.head)}>
        <span className={styles.headStatus}>상태</span>
        <span>고객</span>
        <span>작업</span>
        <span>시간</span>
        <span>담당 기사</span>
      </div>
      {tasks.length === 0 ? (
        <StateMessage
          variant="list"
          className={styles.empty}
          icon={<Icon name="file-text" color="var(--color-gray-500)" />}
          title="등록된 작업이 없습니다"
        />
      ) : (
        <ul>
          {tasks.map((task) => {
            const technicianName = task.technicianId ? memberNames.get(task.technicianId) : undefined;
            return (
              <li key={task.id}>
                <Link to={`/board/${task.id}`} className={styles.row}>
                  <span className={styles.status}>
                    {task.status !== 'CANCELED' && <StatusChip status={task.status} />}
                    {task.rejection && <StatusChip status="REJECTED" />}
                    {task.delayed && task.status !== 'COMPLETED' && <StatusChip status="DELAYED" />}
                  </span>
                  <span className={clsx('t-body-s-medium', styles.cell)}>{task.customer?.name ?? '-'}</span>
                  <span className={clsx('t-body-s-semibold', styles.cell, styles.title)}>{task.title}</span>
                  <span className={clsx('t-body-s-medium', styles.cell)}>{formatTaskTime(task) ?? '-'}</span>
                  <span className={clsx('t-body-s-medium', styles.cell)}>
                    {technicianName ? `${technicianName} 기사` : '-'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
