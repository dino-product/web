import clsx from 'clsx';

import { Button, Icon, Pagination, StatusChip } from '@/design-system';
import { getUnassignedReason } from '@/mocks/selectors';
import type { Task } from '@/mocks/types';

import styles from './WaitingSection.module.css';

/**
 * 대기함 잔여·거절 작업(450:2651의 2293:11933). 등록 상태 작업(거절 포함)을 등록 오래된 순으로 보여 준다.
 * 한 쪽 4줄: 시안 450:2651이 4줄을 그리고 1080px 화면 안에 표(5줄)까지 들어가는 배치다.
 */
const PAGE_SIZE = 4;

interface WaitingSectionProps {
  tasks: Task[];
  page: number;
  onPageChange: (page: number) => void;
  memberName: (id: string | null) => string;
  onAssign: (taskId: string) => void;
}

function BoxTitle() {
  return (
    <div className={styles.titleGroup}>
      <Icon name="box-fill" size={28} color="var(--color-primary)" />
      <h2 className={`t-body-m-semibold ${styles.title}`}>대기함 잔여 · 거절 작업</h2>
    </div>
  );
}

/** '담당기사 · 시간 미지정'의 가운뎃점은 Bold(456:4450) */
function Reason({ text }: { text: string }) {
  const parts = text.split(' · ');
  if (parts.length < 2) return <>{text}</>;
  return (
    <>
      {parts[0]}
      <b className={styles.dot}> ·</b> {parts.slice(1).join(' · ')}
    </>
  );
}

export function WaitingSection({ tasks, page, onPageChange, memberName, onAssign }: WaitingSectionProps) {
  if (tasks.length === 0) {
    // 1771:7266 — 대기함이 비면 제목 줄만 있는 73px 상자(페이지네이션 없음)
    return (
      <section className={styles.section} aria-label="대기함 잔여 · 거절 작업">
        <div className={clsx(styles.box, styles.boxEmpty)}>
          <div className={styles.emptyHeader}>
            <BoxTitle />
            <p className={`t-body-m-semibold ${styles.emptyText}`}>대기함이 비었어요</p>
          </div>
        </div>
      </section>
    );
  }

  const rejectedCount = tasks.filter((task) => task.rejection).length;
  const pageCount = Math.ceil(tasks.length / PAGE_SIZE);
  const current = Math.min(Math.max(1, page), pageCount);
  const rows = tasks.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <section className={styles.section} aria-label="대기함 잔여 · 거절 작업">
      <div className={styles.box}>
        <div className={styles.header}>
          <BoxTitle />
          <div className={styles.counts}>
            <span className={`t-body-s-medium ${styles.count}`}>등록 {tasks.length - rejectedCount}건</span>
            <span className={`t-body-s-medium ${styles.count} ${styles.countRejected}`}>거절 {rejectedCount}건</span>
          </div>
        </div>
        <div className={styles.content}>
          <div className={`t-body-xs-medium ${styles.columns}`} aria-hidden>
            <span className={styles.colTitle}>작업명</span>
            <span className={styles.colStatus}>상태</span>
            <span className={styles.colReason}>미처리 사유</span>
            <span className={styles.colRegistrant}>등록자</span>
          </div>
          <ul className={styles.rows}>
            {rows.map((task) => (
              <li key={task.id} className={styles.row}>
                <div className={`t-body-s-medium ${styles.cells}`}>
                  <span className={styles.cellTitle}>
                    {task.title}
                  </span>
                  <span className={styles.chips}>
                    <StatusChip status="REGISTERED" />
                    {task.rejection && <StatusChip status="REJECTED" />}
                  </span>
                  <span className={styles.cellReason}>
                    <Reason text={getUnassignedReason(task) ?? ''} />
                  </span>
                  <span className={styles.cellRegistrant}>{memberName(task.registrantId)}</span>
                </div>
                <Button variant="secondary" className={styles.assignButton} onClick={() => onAssign(task.id)}>
                  배정하기
                </Button>
              </li>
            ))}
          </ul>
        </div>
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
