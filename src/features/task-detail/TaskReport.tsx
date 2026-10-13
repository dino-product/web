import clsx from 'clsx';

import { Button, Chip, Icon } from '@/design-system';
import { toHourMinute, toIsoDate } from '@/lib/date';
import { formatMonthDayWeekdayTime, splitReportContent } from '@/lib/format';
import { getTaskEndMs, isReportOverdue } from '@/mocks/selectors';
import { useAppStore } from '@/mocks/store';
import type { Task } from '@/mocks/types';

import styles from './TaskReport.module.css';

/**
 * '완료 보고' 탭 내용. 상태별 시안:
 * - 배정됨(785:5490): '아직 작업이 수락되지 않았어요'
 * - 작업전·작업중(785:5923·785:4522): '담당 기사가 작업을 마치면 등록됩니다'
 * - 지연(785:6353): 위 문구 + '지연이 예상됩니다' 칩. 지연 배지가 있으면 보고 미제출보다 먼저 보여 준다.
 * - 보고 미제출(785:4984, isReportOverdue): 경고 + '기사에게 요청 보내기' → requestReport
 * - 완료(785:4191): 작업 전·후 사진, 작업 메모, 사용 부품
 */
export function TaskReport({ task }: { task: Task }) {
  if (task.status === 'COMPLETED') return <CompletedReport task={task} />;
  if (!task.delayed && isReportOverdue(task)) return <OverdueReport task={task} />;
  return <PendingReport task={task} />;
}

/** '종료 예정 1월 23일 (목) 11:00' */
function endText(task: Task): string | null {
  const endMs = getTaskEndMs(task);
  if (endMs == null) return null;
  return `종료 예정 ${formatMonthDayWeekdayTime(toIsoDate(endMs), toHourMinute(endMs))}`;
}

function ReportTitle({ chip, tone = 'gray' }: { chip: string; tone?: 'gray' | 'warning' }) {
  return (
    <div className={styles.titleRow}>
      <h3 className={`t-body-m-semibold ${styles.title}`}>완료 보고</h3>
      <span className={clsx(styles.stateChip, tone === 'warning' && styles.stateChipWarning)}>{chip}</span>
    </div>
  );
}

function PendingReport({ task }: { task: Task }) {
  const notAccepted = task.status === 'PENDING_ACCEPT' || task.status === 'REGISTERED';
  const end = endText(task);
  return (
    <div className={styles.content}>
      <ReportTitle chip="미제출" />
      <div className={clsx(styles.empty, styles.emptyGap130)}>
        <Icon name="document-fill" size={40} color="var(--color-gray-300)" />
        <div className={styles.emptyTexts}>
          <p className={`t-body-m-semibold ${styles.emptyTitle}`}>
            {notAccepted ? '아직 작업이 수락되지 않았어요' : '담당 기사가 작업을 마치면 등록됩니다'}
          </p>
          {end && <p className={`t-body-xs-medium ${styles.emptySub}`}>{end}</p>}
        </div>
        {task.delayed && (
          <Chip tone="delayed" size="md">
            지연이 예상됩니다
          </Chip>
        )}
      </div>
    </div>
  );
}

function OverdueReport({ task }: { task: Task }) {
  const requestReport = useAppStore((s) => s.requestReport);
  const end = endText(task);
  return (
    <div className={styles.content}>
      <ReportTitle chip="미제출" tone="warning" />
      <div className={clsx(styles.empty, styles.emptyGap120, styles.overdue)}>
        <div className={styles.overdueMessage}>
          <Icon name="warning-circle-fill" size={40} color="var(--color-warning-1)" />
          <div className={styles.emptyTexts}>
            <p className={`t-body-m-semibold ${styles.emptyTitle} ${styles.warningTitle}`}>
              종료 예정 시각이 지났는데 보고가 없어요
            </p>
            {end && <p className={`t-body-xs-medium ${styles.emptySub}`}>{end}</p>}
          </div>
        </div>
        <Button variant="secondary" className={styles.requestButton} onClick={() => requestReport(task.id)}>
          <Icon name="message" size={24} color="var(--color-gray-600)" />
          기사에게 요청 보내기
        </Button>
      </div>
    </div>
  );
}

function CompletedReport({ task }: { task: Task }) {
  const report = task.report;
  const { memo, parts } = splitReportContent(report?.content ?? '');
  const photos = report?.photoUrls ?? [];
  return (
    <div className={clsx(styles.content, styles.completed)}>
      <ReportTitle chip={report ? '제출됨' : '미제출'} />
      <div className={styles.photos}>
        <ReportPhoto label="작업 전 사진" url={photos[0]} />
        <ReportPhoto label="작업 후 사진" url={photos[1]} />
      </div>
      <ReportNote label="작업 메모" text={memo} />
      <ReportNote label="사용 부품" text={parts} />
    </div>
  );
}

function ReportPhoto({ label, url }: { label: string; url: string | undefined }) {
  return (
    <figure className={styles.photo}>
      <figcaption className={`t-body-xs-medium ${styles.noteLabel}`}>{label}</figcaption>
      <div className={styles.photoBox}>
        {url ? <img className={styles.photoImage} src={url} alt={label} /> : <Icon name="image" size={28} />}
      </div>
    </figure>
  );
}

function ReportNote({ label, text }: { label: string; text: string }) {
  return (
    <div className={styles.note}>
      <p className={`t-body-xs-medium ${styles.noteLabel}`}>{label}</p>
      <p className={`t-body-xs-medium ${styles.noteBox}`}>{text || '-'}</p>
    </div>
  );
}
