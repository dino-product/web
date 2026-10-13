/**
 * 작업 상세 모달(Figma 785:5490 외 상태별 시안, 진행 보드 1892:12847). 담당: tasks 섹션.
 * 사용처: 작업 목록(/tasks/:taskId), 진행 보드(/board/:taskId).
 *
 * 1169x724 고정 크기. 머리말(뒤로가기 | 작업 상세) + 왼쪽 작업 정보·상태 변경 이력 + 오른쪽 완료 보고·첨부 파일 탭.
 * '작업 취소'를 누르면 Figma(785:7691, 2490:13502)처럼 상세 모달을 숨기고 작업 취소 모달만 띄운다.
 * 취소를 확정하면 두 모달을 모두 닫는다(onClose).
 */
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

import { Button, Icon, Modal, StatusChip } from '@/design-system';
import TaskCancelModal from '@/features/task-cancel/TaskCancelModal';
import { toHourMinute, toIsoDate } from '@/lib/date';
import { formatDetailDate, formatHistoryDateTime, formatPrice } from '@/lib/format';
import { getTaskEndMs, selectMemberById, selectTaskById, selectTypeById } from '@/mocks/selectors';
import { useAppStore } from '@/mocks/store';
import type { Task, TaskStatus } from '@/mocks/types';

import { type DetailTab, DetailTabs } from './DetailTabs';
import { TaskAttachments } from './TaskAttachments';
import styles from './TaskDetailModal.module.css';
import { TaskReport } from './TaskReport';

export interface TaskDetailModalProps {
  taskId: string;
  /** 왼쪽 위 뒤로가기 라벨. 예: '작업 목록으로', '진행 보드' */
  backLabel: string;
  onClose: () => void;
  /**
   * 본문 배치. 'list'(기본): 작업 목록 시안 785:5490 등 — '작업 취소'가 오른쪽 열 아래 안쪽(모달 y=618)에 있다.
   * 'board': 진행 보드 시안 1892:12847 — 오른쪽 열이 551px에서 끝나고 '작업 취소'가 그 아래(모달 y=648)에 있다.
   */
  layout?: 'list' | 'board';
}

export default function TaskDetailModal(props: TaskDetailModalProps) {
  // 다른 작업으로 바뀌면 탭·취소 모달 상태를 처음으로 되돌린다.
  return <TaskDetail key={props.taskId} {...props} />;
}

function TaskDetail({ taskId, backLabel, onClose, layout = 'list' }: TaskDetailModalProps) {
  const task = useAppStore((s) => selectTaskById(s, taskId));
  const [tab, setTab] = useState<DetailTab>('report');
  const [cancelOpen, setCancelOpen] = useState(false);

  // 취소된 작업은 상세 시안이 없다(목록·보드에서도 숨김). 취소 확정 직후 닫히기 전 렌더도 여기서 걸러진다.
  if (!task || task.status === 'CANCELED') return null;
  const status = task.status;

  return (
    <>
      <Modal open={!cancelOpen} onClose={onClose} closeOnOverlayClick aria-label="작업 상세">
        <div className={styles.panel}>
          <header className={styles.header}>
            <button type="button" className={styles.back} onClick={onClose}>
              <Icon name="arrow-back" size={24} color="var(--color-gray-600)" />
              <span className={styles.backLabel}>{backLabel}</span>
            </button>
            <div className={styles.crumb}>
              <span className={styles.crumbLine} aria-hidden />
              <span>작업 상세</span>
            </div>
          </header>
          <div className={clsx(styles.body, layout === 'board' && styles.bodyBoard)}>
            <TaskInfoColumn task={task} status={status} />
            <div className={styles.right}>
              <div className={styles.rightTop}>
                <DetailTabs value={tab} onChange={setTab} attachmentCount={task.attachments.length} />
                {tab === 'report' ? <TaskReport task={task} /> : <TaskAttachments task={task} />}
              </div>
              <Button
                variant="danger-soft"
                className={styles.cancelButton}
                disabled={status === 'COMPLETED'}
                onClick={() => setCancelOpen(true)}
              >
                작업 취소
              </Button>
            </div>
          </div>
        </div>
      </Modal>
      <TaskCancelModal taskId={task.id} open={cancelOpen} onClose={() => setCancelOpen(false)} onCanceled={onClose} />
    </>
  );
}

/** 왼쪽 열: 제목·작업유형, 상태·담당기사·일정·고객·주소·결제·결제 방식, 상태 변경 이력 */
function TaskInfoColumn({ task, status }: { task: Task; status: Exclude<TaskStatus, 'CANCELED'> }) {
  const workType = useAppStore((s) => selectTypeById(s, task.workTypeId));
  const technician = useAppStore((s) => selectMemberById(s, task.technicianId));
  const technicianType = useAppStore((s) => selectTypeById(s, technician?.typeId));

  // '기사에게 요청 보내기' 등으로 이력이 늘면 새 줄이 보이도록 이력 상자를 아래로 스크롤한다.
  const historyRef = useRef<HTMLOListElement>(null);
  const historyCount = task.history.length;
  const seenHistoryCount = useRef(historyCount);
  useEffect(() => {
    if (historyCount > seenHistoryCount.current && historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
    seenHistoryCount.current = historyCount;
  }, [historyCount]);

  const endMs = getTaskEndMs(task);
  const customer = task.customer;
  const address = customer ? [customer.address, customer.addressDetail].filter(Boolean).join(' ') : '';

  return (
    <div className={styles.left}>
      <div className={styles.info}>
        <div className={styles.titleBlock}>
          <h2 className={`t-title-s ${styles.title}`}>{task.title}</h2>
          <p className={`t-body-xs-medium ${styles.typeLine}`}>
            <span className={styles.typeLabel}>작업유형</span>
            <span className={styles.typeValue}>{workType?.name ?? '유형 없음'}</span>
          </p>
        </div>
        <dl className={styles.fields}>
          <div className={styles.row}>
            <dt className={styles.label}>상태</dt>
            <dd className={styles.value}>
              <StatusChip status={status} size="sm" />
            </dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.label}>담당기사</dt>
            <dd className={styles.value}>
              {technician ? (
                <span className={styles.inline8}>
                  <span>{technician.name}</span>
                  {technicianType && <span className={styles.typeChip}>{technicianType.name}</span>}
                </span>
              ) : (
                '-'
              )}
            </dd>
          </div>
          <div className={`${styles.row} ${styles.rowTop}`}>
            <dt className={styles.label}>일정</dt>
            <dd className={styles.value}>
              {task.date && task.startTime ? (
                <span className={styles.schedule}>
                  <span className={styles.inline8}>
                    <span>{formatDetailDate(task.date)}</span>
                    <span>{task.startTime}</span>
                  </span>
                  {endMs != null && (
                    <>
                      <Icon name="arrow-right" size={24} color="var(--color-gray-500)" />
                      <span className={styles.inline8}>
                        <span>{formatDetailDate(toIsoDate(endMs))}</span>
                        <span>{toHourMinute(endMs)}</span>
                      </span>
                    </>
                  )}
                </span>
              ) : (
                '-'
              )}
            </dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.label}>고객</dt>
            <dd className={styles.value}>
              {customer ? (
                <span className={styles.inline8}>
                  <span>{customer.name}</span>
                  <span className={styles.phone}>{customer.phone}</span>
                </span>
              ) : (
                '-'
              )}
            </dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.label}>주소</dt>
            <dd className={styles.value}>{address || '-'}</dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.label}>결제</dt>
            <dd className={styles.value}>{task.price != null ? formatPrice(task.price) : '-'}</dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.label}>결제 방식</dt>
            <dd className={styles.value}>{task.paymentMethod ?? '-'}</dd>
          </div>
        </dl>
      </div>
      <section className={styles.history}>
        <h3 className={`t-body-m-semibold ${styles.sectionTitle}`}>상태 변경 이력</h3>
        <div className={styles.historyBox}>
          <ol ref={historyRef} className={styles.historyList}>
            {task.history.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className={`t-body-xs-medium ${styles.historyRow}`}>
                <span>{formatHistoryDateTime(entry.at)}</span>
                <span>{entry.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
