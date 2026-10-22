import clsx from 'clsx';
import type { KeyboardEvent } from 'react';

import { Button, Icon, Pagination, StateMessage, StatusChip } from '@/design-system';
import { formatRelativeTime, formatTaskTime } from '@/lib/format';
import type { Task } from '@/data/types';

import styles from './TaskTable.module.css';

/** 작업 표(450:2651의 2110:9761). 한 쪽 5줄, 최근 수정 순. */
const PAGE_SIZE = 5;

/** 열 이름. Figma 머리글 '직업유형'(1230:4837)은 '작업유형'의 오탈자라 바로잡았다. */
const COLUMNS = ['작업명', '상태', '담당기사', '작업유형', '예정시간', '등록자', '최근 수정일'] as const;

interface TaskTableProps {
  tasks: Task[];
  page: number;
  onPageChange: (page: number) => void;
  memberName: (id: string | null) => string;
  typeName: (id: string | null) => string;
  onOpen: (taskId: string) => void;
  onRegister: () => void;
}

function HeadRow() {
  return (
    <div className={styles.head} role="row">
      {COLUMNS.map((label) => (
        <span key={label} role="columnheader">
          {label}
        </span>
      ))}
    </div>
  );
}

/**
 * 등록 상태 작업은 상세 시안이 없어(디자이너 전달사항) 행을 눌러도 열지 않는다.
 * 그 밖의 행은 /tasks/:taskId 작업 상세 모달을 연다.
 */
function canOpenDetail(task: Task): boolean {
  return task.status !== 'REGISTERED' && task.status !== 'CANCELED';
}

export function TaskTable({ tasks, page, onPageChange, memberName, typeName, onOpen, onRegister }: TaskTableProps) {
  if (tasks.length === 0) {
    // 1773:7704 — 머리글 띠만 남기고 아래에 '등록된 작업이 없어요'
    return (
      <section className={styles.section} aria-label="작업 목록">
        <div role="table" className={styles.tableEmpty}>
          <HeadRow />
        </div>
        <StateMessage
          variant="list"
          className={styles.empty}
          icon={<Icon name="document-text" size={40} color="var(--color-gray-400)" />}
          title="등록된 작업이 없어요"
          actions={
            <Button icon="plus" className={styles.registerButton} onClick={onRegister}>
              새 작업 등록
            </Button>
          }
        />
      </section>
    );
  }

  const pageCount = Math.ceil(tasks.length / PAGE_SIZE);
  const current = Math.min(Math.max(1, page), pageCount);
  const rows = tasks.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const onRowKeyDown = (event: KeyboardEvent<HTMLDivElement>, task: Task) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(task.id);
    }
  };

  return (
    <section className={styles.section} aria-label="작업 목록">
      <div role="table" className={styles.table}>
        <HeadRow />
        {rows.map((task) => {
          const clickable = canOpenDetail(task);
          return (
            <div
              key={task.id}
              role="row"
              tabIndex={clickable ? 0 : undefined}
              className={clsx('t-body-s-medium', styles.row, clickable && styles.clickable)}
              onClick={clickable ? () => onOpen(task.id) : undefined}
              onKeyDown={clickable ? (event) => onRowKeyDown(event, task) : undefined}
            >
              <span role="cell" className={styles.cellTitle}>
                {task.title}
              </span>
              <span role="cell" className={styles.chips}>
                {task.status !== 'CANCELED' && <StatusChip status={task.status} />}
                {task.rejection && <StatusChip status="REJECTED" />}
                {task.delayed && task.status !== 'COMPLETED' && <StatusChip status="DELAYED" />}
              </span>
              <span role="cell">{memberName(task.technicianId) || '-'}</span>
              <span role="cell" className={styles.cellType}>
                {typeName(task.workTypeId) || '-'}
              </span>
              <span role="cell" className={styles.muted}>
                {formatTaskTime(task) ?? '-'}
              </span>
              <span role="cell" className={styles.muted}>
                {memberName(task.registrantId)}
              </span>
              <span role="cell" className={styles.muted}>
                {formatRelativeTime(task.updatedAt)}
              </span>
            </div>
          );
        })}
      </div>
      {tasks.length > PAGE_SIZE && (
        <Pagination
          page={current}
          pageCount={pageCount}
          onChange={onPageChange}
          summary={`${tasks.length}건 중 ${rows.length}건 표시`}
        />
      )}
    </section>
  );
}
