import clsx from 'clsx';

import {
  Button,
  DriverListItem,
  Icon,
  ScheduleCard,
  type SolidChipStatus,
  WorkCard,
} from '@/design-system';
import { TASK_STATUS_LABEL, type TypeColor } from '@/data/types';
import { today } from '@/lib/date';
import { formatDuration, formatTimeRange, formatTimetableDate } from '@/lib/format';

import { DemoDialog, DemoSelectBox } from './DemoDialog';
import DemoStage, { DemoCallout, type DemoStep } from './DemoStage';
import styles from './TimetableDemo.module.css';

/** 장면 치수(타임테이블 화면 값 그대로): 1시간 228, 행 111, 기사 칸 184, 머리줄 60 */
const CANVAS_WIDTH = 1210;
const HOUR_WIDTH = 228;
const ROW_HEIGHT = 111;
const FIRST_HOUR = 9;
const HOURS = ['09:00', '10:00', '11:00'];
/** 대기함 카드 122 + 간격 14 */
const CARD_PITCH = 136;

const minutesToX = (minutes: number) => ((minutes - FIRST_HOUR * 60) / 60) * HOUR_WIDTH;

const DRIVERS = [
  { name: '김민수', role: '전문 기사' },
  { name: '이서연', role: '일반 기사' },
  { name: '박지훈', role: '전문 기사' },
  { name: '최유나', role: '일반 기사' },
  { name: '정하늘', role: '일반 기사' },
];

interface Block {
  row: number;
  title: string;
  start: `${number}:${number}`;
  duration: number;
  status: SolidChipStatus | 'COMPLETED';
}

const BLOCKS: Block[] = [
  { row: 0, title: '인덕션 설치', start: '09:00', duration: 90, status: 'IN_PROGRESS' },
  { row: 1, title: '에어컨 점검', start: '10:00', duration: 90, status: 'ACCEPTED' },
  { row: 3, title: '세탁기 수리', start: '09:00', duration: 60, status: 'COMPLETED' },
  { row: 4, title: '냉장고 수리', start: '09:30', duration: 90, status: 'ACCEPTED' },
];

const WAITING: { title: string; type: string; color: TypeColor; meta: string }[] = [
  { title: '보일러 점검', type: '점검', color: 'BLUE', meta: '등록 1일 경과' },
  { title: '식기세척기 설치', type: '설치', color: 'PURPLE', meta: '등록 2일 경과' },
  { title: '에어컨 수리', type: '수리', color: 'YELLOW', meta: '등록 3일 경과' },
];

/** 대기함 첫 카드를 박지훈 기사 10:00 칸에 놓는다 */
const ASSIGNED: Block = { row: 2, title: WAITING[0].title, start: '10:00', duration: 90, status: 'PENDING_ACCEPT' };
const STAFF_LABEL = '직원 (박서준)';

const PHASES = ['편집 모드', '끌어서 배정', '배정 확정', '기사 수락', '작업 시작'];

/** 단계 번호. 장면 상태는 '몇 단계 이상인가'로 정한다 */
const STEP = { editOn: 2, grab: 4, drag: 5, drop: 6, confirm: 8, notified: 9, accepted: 10, started: 11 } as const;

const FULL = { x: 605, y: 384, zoom: 1 };
const STEPS: DemoStep[] = [
  { duration: 900, phase: 0, cursor: { x: 700, y: 520, hidden: true }, camera: FULL },
  { duration: 900, phase: 0, cursor: { x: 501, y: 57 }, camera: { x: 0, y: 0, zoom: 1.3 } },
  { duration: 900, phase: 0, cursor: { x: 501, y: 57, click: true } },
  { duration: 1000, phase: 1, cursor: { x: 1038, y: 248, move: 900 }, camera: FULL },
  { duration: 500, phase: 1, cursor: { x: 1038, y: 248, pressed: true } },
  { duration: 1400, phase: 1, cursor: { x: 500, y: 447, pressed: true, move: 1200 } },
  { duration: 800, phase: 2, cursor: { x: 500, y: 447 }, camera: { x: 605, y: 384, zoom: 1.15 } },
  { duration: 900, phase: 2, cursor: { x: 797, y: 622 } },
  { duration: 800, phase: 2, cursor: { x: 797, y: 622, click: true } },
  { duration: 1500, phase: 3, cursor: { x: 880, y: 640, hidden: true }, camera: { x: 465, y: 405, zoom: 1.3 } },
  { duration: 1700, phase: 3 },
  { duration: 2000, phase: 4 },
  { duration: 1500, phase: 4, camera: FULL },
];

function GridBlock({ block, pop }: { block: Block; pop?: boolean }) {
  const width = (block.duration / 60) * HOUR_WIDTH;
  const style = { left: minutesToX(Number(block.start.slice(0, 2)) * 60 + Number(block.start.slice(3))), top: block.row * ROW_HEIGHT, width };
  const timeRange = formatTimeRange(block.start, block.duration);

  return (
    <div className={clsx(styles.block, pop && styles.blockPop)} style={style}>
      {block.status === 'COMPLETED' ? (
        <>
          <ScheduleCard
            status="ACCEPTED"
            showStatus={false}
            className={styles.completedCard}
            width={width}
            title={block.title}
            timeRange={timeRange}
            staffLabel={STAFF_LABEL}
          />
          <span className={clsx('t-body-xs-medium', styles.completedChip)}>{TASK_STATUS_LABEL.COMPLETED}</span>
        </>
      ) : (
        <ScheduleCard status={block.status} width={width} title={block.title} timeRange={timeRange} staffLabel={STAFF_LABEL} />
      )}
    </div>
  );
}

/**
 * 타임테이블 시연(시안 없음): 편집 모드를 켜고 대기함 카드를 기사 칸에 끌어다 놓아 배정을 확정하면,
 * 기사가 앱에서 수락·시작하는 대로 블록 상태가 배정됨 → 작업전 → 작업중으로 바뀐다.
 * 블록·대기함 카드·기사 칸은 DS 컴포넌트 그대로이고 치수는 타임테이블 화면과 같다.
 */
export default function TimetableDemo({ className }: { className?: string }) {
  return (
    <DemoStage
      className={className}
      width={726}
      height={461}
      canvasWidth={CANVAS_WIDTH}
      label="타임테이블 시연: 대기함의 작업을 기사 일정에 끌어다 놓아 배정하면, 기사가 수락하고 작업을 시작하는 대로 상태가 바뀝니다."
      phases={PHASES}
      steps={STEPS}
      restStep={STEPS.length - 1}
      cursorSlot={(step) =>
        (step === STEP.grab || step === STEP.drag) && (
          <WorkCard
            className={styles.dragGhost}
            workType={{ name: WAITING[0].type, color: WAITING[0].color }}
            title={WAITING[0].title}
            assigneeLabel="기사 미정"
            meta={WAITING[0].meta}
          />
        )
      }
    >
      {(step) => {
        const editing = step >= STEP.editOn;
        const assigned = step >= STEP.confirm;
        const assignedStatus: SolidChipStatus =
          step >= STEP.started ? 'IN_PROGRESS' : step >= STEP.accepted ? 'ACCEPTED' : 'PENDING_ACCEPT';
        const waiting = assigned ? WAITING.slice(1) : WAITING;

        return (
          <div className={clsx(styles.scene, editing && styles.sceneEditing)}>
            <div className={styles.toolbar}>
              <div className={styles.toolbarLeft}>
                <div className={clsx(styles.dateNav, editing && styles.dateNavEditing)}>
                  <Icon name="chevron-right" size={20} color="var(--color-primary)" className={styles.datePrev} />
                  <span className={clsx('t-body-s-medium', styles.dateText)}>{formatTimetableDate(today())}</span>
                  <Icon name="chevron-right" size={20} color="var(--color-primary)" className={styles.dateNext} />
                </div>
                <span className={clsx('t-body-s-semibold', styles.today)}>오늘</span>
                <span className={styles.divider} />
                <div className={styles.modeToggle}>
                  <span className={clsx(styles.modeButton, !editing && styles.viewActive)}>
                    <Icon name="lock" size={24} />
                    보기
                  </span>
                  <span className={clsx(styles.modeButton, editing && styles.editActive)}>
                    <Icon name="edit" size={24} />
                    편집
                  </span>
                </div>
                {editing && <span className={styles.editHint}>편집 중 · 카드를 드래그해서 편집할 수 있어요</span>}
              </div>
              <Button icon="plus" style={{ gap: 10 }}>
                새 작업 등록
              </Button>
            </div>

            <div className={styles.grid}>
              <div className={styles.header}>
                <span className={clsx('t-body-m-medium', styles.corner)}>기사</span>
                {HOURS.map((hour) => (
                  <span key={hour} className={clsx('t-body-m-medium', styles.hour)}>
                    {hour}
                  </span>
                ))}
              </div>
              <div className={styles.body}>
                <div className={styles.drivers}>
                  {DRIVERS.map((driver) => (
                    <DriverListItem key={driver.name} name={driver.name} role={driver.role} />
                  ))}
                </div>
                <div className={styles.lanes}>
                  {BLOCKS.map((block) => (
                    <GridBlock key={block.title} block={block} />
                  ))}
                  {step >= STEP.drag && !assigned && (
                    <span
                      className={clsx(styles.dropPreview, step === STEP.drag && styles.dropPreviewLate)}
                      style={{
                        left: minutesToX(600),
                        top: ASSIGNED.row * ROW_HEIGHT,
                        width: (ASSIGNED.duration / 60) * HOUR_WIDTH,
                      }}
                    />
                  )}
                  {assigned && <GridBlock key={assignedStatus} block={{ ...ASSIGNED, status: assignedStatus }} pop />}
                  <span className={clsx(styles.nowLine, step >= STEP.started && styles.nowLineLater)} />
                </div>
              </div>
            </div>

            <div className={styles.panel}>
              <span className={clsx('t-body-xl-bold', styles.panelTitle)}>대기함</span>
              <span className={clsx('t-body-m-medium', styles.panelCount)}>{waiting.length}건</span>
              <Icon name="sidebar-left" size={24} color="var(--color-white-60)" className={styles.panelToggle} />
              {WAITING.map((card, index) => {
                const gone = index === 0 && assigned;
                const lifted = index === 0 && step >= STEP.grab && !assigned;
                return (
                  <WorkCard
                    key={card.title}
                    className={clsx(styles.card, lifted && styles.cardLifted, gone && styles.cardGone)}
                    style={{ top: 77 + (assigned ? Math.max(index - 1, 0) : index) * CARD_PITCH }}
                    workType={{ name: card.type, color: card.color }}
                    title={card.title}
                    assigneeLabel="기사 미정"
                    meta={card.meta}
                  />
                );
              })}
            </div>

            {step === STEP.notified && (
              <DemoCallout x={452} y={518} color="var(--color-gray-400)">
                기사 앱으로 배정 요청 전송
              </DemoCallout>
            )}
            {step === STEP.accepted && (
              <DemoCallout x={452} y={518} color="var(--color-primary-100)">
                박지훈 기사 · 수락
              </DemoCallout>
            )}
            {step === STEP.started && (
              <DemoCallout x={452} y={518} color="var(--color-in-progress-1)">
                박지훈 기사 · 작업 시작
              </DemoCallout>
            )}

            {step >= STEP.drop && !assigned && (
              <DemoDialog
                icon={{ name: 'check-circle-fill', color: 'var(--color-gray-900)' }}
                title="배정 확인"
                description={'대기함 작업을 놓은 칸의 기사 · 시간으로 배정합니다.\n값을 확인 · 수정한 뒤 확정하세요.'}
                actions={
                  <>
                    <Button variant="secondary" style={{ width: 97 }}>
                      취소
                    </Button>
                    <Button style={{ width: 130 }}>배정 확정</Button>
                  </>
                }
              >
                <div className={styles.fields}>
                  <DemoSelectBox label="담당기사" value={DRIVERS[ASSIGNED.row].name} />
                  <DemoSelectBox label="시작 시간" value={ASSIGNED.start} />
                  <DemoSelectBox label="예상 소요시간" value={formatDuration(ASSIGNED.duration)} />
                </div>
              </DemoDialog>
            )}
          </div>
        );
      }}
    </DemoStage>
  );
}
