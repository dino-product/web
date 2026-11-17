import clsx from 'clsx';

import { type ChipStatus, StatusChip, type UnderlineTab, UnderlineTabs } from '@/design-system';
import { TASK_STATUS_LABEL } from '@/data/types';
import { today } from '@/lib/date';
import { formatBoardDate } from '@/lib/format';

import styles from './BoardDemo.module.css';
import DemoStage, { DemoCallout, type DemoStep } from './DemoStage';

/** 장면 너비: 진행 보드 본문 1547 + 좌우 여백 30 */
const CANVAS_WIDTH = 1607;
/** 표 첫 행의 y(머리줄 아래)와 행 높이 */
const ROWS_TOP = 511;
const ROW_HEIGHT = 66;

type RowStatus = 'PENDING_ACCEPT' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED';

interface Row {
  customer: string;
  title: string;
  time: string;
  technician: string;
  status: RowStatus;
  delayed?: boolean;
}

const ROWS: Row[] = [
  { customer: '김도윤', title: '인덕션 설치', time: '09:00 - 10:30', technician: '김민수', status: 'IN_PROGRESS', delayed: true },
  { customer: '이수아', title: '냉장고 수리', time: '09:30 - 11:00', technician: '정하늘', status: 'ACCEPTED' },
  { customer: '한서진', title: '에어컨 점검', time: '10:00 - 11:30', technician: '이서연', status: 'ACCEPTED' },
  { customer: '윤태경', title: '보일러 점검', time: '10:00 - 11:30', technician: '박지훈', status: 'PENDING_ACCEPT' },
];

/** 기사 앱에서 일어나는 일. 그 단계부터 해당 행의 상태가 바뀐다 */
const EVENTS: { step: number; row: number; status: RowStatus; note: string; color: string }[] = [
  { step: 2, row: 3, status: 'ACCEPTED', note: '수락', color: 'var(--color-primary-100)' },
  { step: 3, row: 2, status: 'IN_PROGRESS', note: '작업 시작', color: 'var(--color-in-progress-1)' },
  { step: 5, row: 0, status: 'COMPLETED', note: '완료 보고 제출', color: '#3dbc07' },
];
/** 완료 보고가 요약 카드에 반영되는 단계 */
const SUMMARY_STEP = 6;

const BASE_COUNTS: Record<RowStatus, number> = { PENDING_ACCEPT: 3, ACCEPTED: 4, IN_PROGRESS: 2, COMPLETED: 15 };
const TOTAL = 24;

const PHASES = ['기사 수락', '작업 시작', '완료 보고', '현황 집계'];

const FULL = { x: CANVAS_WIDTH / 2, y: 414, zoom: 1 };
const STEPS: DemoStep[] = [
  { duration: 1200, phase: 0, camera: FULL },
  { duration: 900, phase: 0, camera: { x: 0, y: 900, zoom: 1.3 } },
  { duration: 1900, phase: 0 },
  { duration: 1900, phase: 1 },
  { duration: 1000, phase: 2, camera: FULL },
  { duration: 1500, phase: 2 },
  { duration: 2600, phase: 3 },
];

const TAB_KEYS = ['ALL', 'PENDING_ACCEPT', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'] as const;
type TabKey = (typeof TAB_KEYS)[number];

/** 값이 바뀌면(animate) 새 숫자가 아래에서 올라온다 */
function Rolling({ value, animate }: { value: number; animate: boolean }) {
  return (
    <span key={value} className={clsx(animate && styles.rolling)}>
      {value}
    </span>
  );
}

/**
 * 진행 보드 시연(시안 없음): 기사가 앱에서 수락·시작·완료 보고를 하면 사무실 화면의 상태 칩과 건수가 저절로 바뀐다.
 * 화면 구성과 치수는 진행 보드(560:2831) 그대로이고 상태 칩·탭은 DS 컴포넌트다. 집계는 getBoardSummary 정의를 따른다
 * (완료 / 지연 / 그 밖은 진행중).
 */
export default function BoardDemo({ className }: { className?: string }) {
  return (
    <DemoStage
      className={className}
      width={1276}
      height={658}
      canvasWidth={CANVAS_WIDTH}
      label="진행 보드 시연: 기사가 수락하고 작업을 시작해 완료 보고를 제출하면 상태와 건수가 실시간으로 바뀝니다."
      phases={PHASES}
      steps={STEPS}
      restStep={STEPS.length - 1}
    >
      {(step) => {
        const rows = ROWS.map((row, index) => {
          const event = EVENTS.find((e) => e.row === index && step >= e.step);
          return event ? { ...row, status: event.status, changedAt: event.step } : { ...row, changedAt: -1 };
        });
        const counts = { ...BASE_COUNTS };
        const touched = new Set<RowStatus>();
        for (const event of EVENTS) {
          if (step < event.step) continue;
          counts[ROWS[event.row].status] -= 1;
          counts[event.status] += 1;
          touched.add(ROWS[event.row].status).add(event.status);
        }
        const reported = step >= SUMMARY_STEP;
        const summary = [
          { label: '총 작업', value: TOTAL, dark: true },
          { label: '진행중', value: 8 },
          { label: '지연', value: reported ? 0 : 1, changed: reported },
          { label: '완료', value: reported ? 16 : 15, changed: reported },
        ];
        const tabs: UnderlineTab<TabKey>[] = TAB_KEYS.map((key, index) => ({
          key,
          label: key === 'ALL' ? '전체' : TASK_STATUS_LABEL[key],
          count: key === 'ALL' ? TOTAL : <Rolling value={counts[key]} animate={touched.has(key)} />,
          tall: index >= 2,
        }));
        const current = EVENTS.find((e) => e.step === step);

        return (
          <div className={styles.scene}>
            <div className={styles.overview}>
              <div className={styles.header}>
                <span className={clsx('t-title-s', styles.title)}>진행 보드</span>
                <span className={clsx('t-body-m-semibold', styles.date)}>{formatBoardDate(today())}</span>
              </div>
              <ul className={styles.cards}>
                {summary.map((card) => (
                  <li key={card.label} className={clsx(styles.card, card.dark && styles.cardDark, card.changed && styles.cardChanged)}>
                    <span className={styles.cardLabel}>{card.label}</span>
                    <span className={styles.cardCount}>
                      <Rolling value={card.value} animate={Boolean(card.changed)} />
                    </span>
                    <span className={clsx('t-body-l-bold', styles.cardUnit)}>건</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.status}>
              <div className={styles.statusHead}>
                <span className={clsx('t-body-xl-bold', styles.statusTitle)}>작업 상태</span>
                <UnderlineTabs tabs={tabs} value="ALL" onChange={() => undefined} />
              </div>
              <div className={styles.table}>
                <div className={clsx('t-body-xs-medium', styles.head)}>
                  <span className={styles.headStatus}>상태</span>
                  <span>고객</span>
                  <span>작업</span>
                  <span>시간</span>
                  <span>담당 기사</span>
                </div>
                {rows.map((row) => (
                  <div key={row.title} className={styles.row}>
                    {row.changedAt >= 0 && <span key={row.changedAt} className={styles.rowFlash} />}
                    <span className={styles.chips}>
                      <span key={row.status} className={clsx(row.changedAt >= 0 && styles.chipPop)}>
                        <StatusChip status={row.status as ChipStatus} />
                      </span>
                      {row.delayed && row.status !== 'COMPLETED' && <StatusChip status="DELAYED" />}
                    </span>
                    <span className={clsx('t-body-s-medium', styles.cell)}>{row.customer}</span>
                    <span className={clsx('t-body-s-semibold', styles.cell, styles.cellTitle)}>{row.title}</span>
                    <span className={clsx('t-body-s-medium', styles.cell)}>{row.time}</span>
                    <span className={clsx('t-body-s-medium', styles.cell)}>{row.technician} 기사</span>
                  </div>
                ))}
              </div>
            </div>

            {current && (
              <DemoCallout key={current.step} x={560} y={ROWS_TOP + current.row * ROW_HEIGHT + 13} color={current.color}>
                {ROWS[current.row].technician} 기사 · {current.note}
              </DemoCallout>
            )}
          </div>
        );
      }}
    </DemoStage>
  );
}
