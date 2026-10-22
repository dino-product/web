import clsx from 'clsx';
import {
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Button, DriverListItem, Icon, StateMessage } from '@/design-system';
import { hmToMinutes, minutesToHm } from '@/lib/date';
import { useAppStore } from '@/data/store';
import type { ID, Member, Task } from '@/data/types';

import {
  AXIS_HOURS,
  AXIS_WIDTH,
  DRIVER_COLUMN_WIDTH,
  durationToWidth,
  EMPTY_DRIVER_COLUMN_WIDTH,
  emptyCardPosition,
  GRID_MAX_HEIGHT,
  HEADER_HEIGHT,
  HOUR_WIDTH,
  INITIAL_SCROLL_HOUR,
  minutesToX,
  ROW_HEIGHT,
  VISIBLE_ROWS,
} from './grid';
import ScheduleBlock from './ScheduleBlock';
import styles from './TimeGrid.module.css';
import { useNowMinutes } from './useNowMinutes';

/** 배정·이동할 수 있는 블록(기사가 아직 시작하지 않은 배정됨·작업전) */
export function isMovableTask(task: Task): boolean {
  return task.status === 'PENDING_ACCEPT' || task.status === 'ACCEPTED';
}

interface TimeGridProps {
  /** 격자 프레임 너비(대기함 펼침 1212, 접힘 1417) */
  width: number;
  /** 행(활성 기사, 기사 유형 필터 적용) */
  technicians: Member[];
  /** 보고 있는 날짜의 일정 작업(작업 유형 필터 적용) */
  tasks: Task[];
  /** 현재 시각선을 그린다(보기 모드이고 보고 있는 날짜가 오늘일 때) */
  showNowLine: boolean;
  editing: boolean;
  selectedTaskId: ID | null;
  /** 드래그 중인 작업(대기함 카드 또는 블록)이 있을 때만 놓기를 받는다 */
  dragging: boolean;
  onSelectTask: (taskId: ID | null) => void;
  /** 블록 드래그 시작. grabOffsetX = 블록 왼쪽에서 잡은 위치(px) */
  onBlockDragStart: (taskId: ID, grabOffsetX: number) => void;
  onDragEnd: () => void;
  /** 격자에 놓음. x = 시간 축 기준 위치(px, 00:00 = 0) */
  onDropAt: (technicianId: ID, x: number) => void;
  onGoToOrgSettings: () => void;
}

interface ScrollMetrics {
  left: number;
  top: number;
  clientWidth: number;
  clientHeight: number;
  scrollWidth: number;
  scrollHeight: number;
}

const HOURS = Array.from({ length: AXIS_HOURS }, (_, hour) => minutesToHm(hour * 60));

/** AppStage zoom을 고려한 캔버스 배율 */
function canvasScale(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  return element.offsetWidth ? rect.width / element.offsetWidth : 1;
}

/**
 * 타임테이블 격자(577:3008). 왼쪽 기사 열·위 시간 머리줄은 고정되고 본문이 가로·세로로 스크롤된다.
 * 처음에는 09:00이 첫 칸으로 보이게 스크롤한다. 보기 모드는 스크롤바를 그리지 않고(시안),
 * 편집 모드는 시안의 스크롤 막대(가로 Gray300, 세로 #989898, 6px)를 그린다.
 */
export default function TimeGrid({
  width,
  technicians,
  tasks,
  showNowLine,
  editing,
  selectedTaskId,
  dragging,
  onSelectTask,
  onBlockDragStart,
  onDragEnd,
  onDropAt,
  onGoToOrgSettings,
}: TimeGridProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const nowMinutes = useNowMinutes();
  const members = useAppStore((s) => s.members);
  const types = useAppStore((s) => s.types);

  const noTechnicians = technicians.length === 0;
  const rowCount = noTechnicians ? VISIBLE_ROWS : technicians.length;
  const bodyHeight = rowCount * ROW_HEIGHT;
  const frameHeight = Math.min(HEADER_HEIGHT + bodyHeight, GRID_MAX_HEIGHT);
  const driverWidth = noTechnicians ? EMPTY_DRIVER_COLUMN_WIDTH : DRIVER_COLUMN_WIDTH;

  const memberName = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);
  const typeName = useMemo(() => new Map(types.map((t) => [t.id, t.name])), [types]);
  const rowIndex = useMemo(() => new Map(technicians.map((m, index) => [m.id, index])), [technicians]);

  const blocks = useMemo(
    () =>
      tasks
        .filter((t) => t.technicianId && rowIndex.has(t.technicianId) && t.startTime && t.durationMinutes != null)
        .map((task) => ({
          task,
          left: minutesToX(hmToMinutes(task.startTime!)),
          top: rowIndex.get(task.technicianId!)! * ROW_HEIGHT,
          width: durationToWidth(task.durationMinutes!),
        })),
    [tasks, rowIndex],
  );

  const selectedOnGrid = blocks.some((b) => b.task.id === selectedTaskId);

  // ── 스크롤: 처음 09:00, 편집 모드 스크롤 막대 ─────────────────────────
  const [metrics, setMetrics] = useState<ScrollMetrics | null>(null);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setMetrics({
      left: el.scrollLeft,
      top: el.scrollTop,
      clientWidth: el.clientWidth,
      clientHeight: el.clientHeight,
      scrollWidth: el.scrollWidth,
      scrollHeight: el.scrollHeight,
    });
  }, []);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollLeft = INITIAL_SCROLL_HOUR * HOUR_WIDTH;
  }, []);

  // 스크롤 막대는 편집 모드에만 그리므로 그때만 잰다.
  useLayoutEffect(() => {
    if (editing) measure();
  }, [editing, measure, width, frameHeight, rowCount]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!editing || !el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => observer.disconnect();
  }, [editing, measure]);

  const thumbs = useMemo(() => {
    if (!editing || !metrics) return null;
    const timeViewport = metrics.clientWidth - driverWidth;
    const timeContent = metrics.scrollWidth - driverWidth;
    const rowsViewport = metrics.clientHeight - HEADER_HEIGHT;
    const rowsContent = metrics.scrollHeight - HEADER_HEIGHT;
    const hTrackStart = driverWidth;
    const hTrack = width - driverWidth - 12;
    const vTrackStart = HEADER_HEIGHT;
    const vTrack = frameHeight - HEADER_HEIGHT - 11;
    const horizontal =
      timeContent > timeViewport
        ? (() => {
            const size = Math.max(48, (hTrack * timeViewport) / timeContent);
            const max = metrics.scrollWidth - metrics.clientWidth;
            return { start: hTrackStart + ((hTrack - size) * metrics.left) / max, size, range: hTrack - size, max };
          })()
        : null;
    const vertical =
      rowsContent > rowsViewport
        ? (() => {
            const size = Math.max(48, (vTrack * rowsViewport) / rowsContent);
            const max = metrics.scrollHeight - metrics.clientHeight;
            return { start: vTrackStart + ((vTrack - size) * metrics.top) / max, size, range: vTrack - size, max };
          })()
        : null;
    return { horizontal, vertical };
  }, [editing, metrics, driverWidth, width, frameHeight]);

  /** 스크롤 막대 끌기 */
  const startThumbDrag = (axis: 'x' | 'y', event: ReactPointerEvent<HTMLSpanElement>) => {
    const el = scrollerRef.current;
    const info = axis === 'x' ? thumbs?.horizontal : thumbs?.vertical;
    if (!el || !info || info.range <= 0) return;
    event.preventDefault();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const scale = canvasScale(el);
    const startPointer = axis === 'x' ? event.clientX : event.clientY;
    const startScroll = axis === 'x' ? el.scrollLeft : el.scrollTop;
    const ratio = info.max / info.range;
    const onMove = (e: PointerEvent) => {
      const delta = ((axis === 'x' ? e.clientX : e.clientY) - startPointer) / scale;
      if (axis === 'x') el.scrollLeft = startScroll + delta * ratio;
      else el.scrollTop = startScroll + delta * ratio;
    };
    const onUp = () => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  };

  // ── 놓기 ─────────────────────────────────────────────────────────────
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!editing || !dragging || noTechnicians) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const lanes = lanesRef.current;
    if (!editing || !dragging || !lanes || noTechnicians) return;
    event.preventDefault();
    const rect = lanes.getBoundingClientRect();
    const scale = canvasScale(lanes);
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    const technician = technicians[Math.floor(y / ROW_HEIGHT)];
    if (technician) onDropAt(technician.id, x);
  };

  const handleBlockDragStart = (task: Task, event: DragEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const grabOffsetX = (event.clientX - rect.left) / canvasScale(event.currentTarget);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', task.id);
    onBlockDragStart(task.id, grabOffsetX);
  };

  const nowX = minutesToX(nowMinutes);
  const emptyCard = emptyCardPosition(width, frameHeight);

  return (
    <div className={clsx(styles.frame, editing && styles.frameEditing)} style={{ width, height: frameHeight }}>
      <div ref={scrollerRef} className={styles.scroller} onScroll={editing ? measure : undefined}>
        <div className={styles.canvas} style={{ width: driverWidth + AXIS_WIDTH, height: HEADER_HEIGHT + bodyHeight }}>
          {/* 머리줄 577:3006 — Gray50, 기사 184 + 시간 칸 156 */}
          <div className={styles.header}>
            <div className={styles.corner}>
              <span className={clsx('t-body-m-medium', styles.headerText)}>기사</span>
            </div>
            <div className={styles.hours}>
              {HOURS.map((label) => (
                <div key={label} className={styles.hour}>
                  <span className={clsx('t-body-m-medium', styles.headerText)}>{label}</span>
                </div>
              ))}
              {showNowLine && <span className={styles.nowDot} style={{ left: nowX - 3 }} aria-hidden />}
            </div>
          </div>

          <div className={styles.body}>
            {/* 기사 열 443:1276 — Driver List Item 184x111 */}
            <div className={clsx(styles.drivers, noTechnicians && styles.driversEmpty)} style={{ width: driverWidth }}>
              {technicians.map((member) => (
                <DriverListItem
                  key={member.id}
                  name={member.name}
                  role={(member.typeId && typeName.get(member.typeId)) || '유형 없음'}
                  avatarSrc={member.avatarUrl}
                />
              ))}
            </div>

            {/* 시간 칸 443:1300 — 10분 칸 26px(Gray100 선), 1시간 156px(Gray300 선), 행 111px(Gray300 아래선) */}
            <div
              ref={lanesRef}
              className={styles.lanes}
              style={{ height: bodyHeight }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => {
                if (editing && selectedTaskId) onSelectTask(null);
              }}
            >
              {blocks.map(({ task, left, top, width: blockWidth }) => {
                const movable = editing && isMovableTask(task);
                return (
                  <ScheduleBlock
                    key={task.id}
                    task={task}
                    registrantName={memberName.get(task.registrantId) ?? ''}
                    left={left}
                    top={top}
                    width={blockWidth}
                    selected={editing && task.id === selectedTaskId}
                    dimmed={editing && selectedOnGrid && task.id !== selectedTaskId}
                    draggable={movable}
                    onClick={(event) => {
                      if (!editing) return;
                      event.stopPropagation();
                      onSelectTask(task.id === selectedTaskId ? null : task.id);
                    }}
                    onDragStart={movable ? (event) => handleBlockDragStart(task, event) : undefined}
                    onDragEnd={onDragEnd}
                  />
                );
              })}
              {showNowLine && <span className={styles.nowLine} style={{ left: nowX - 0.5, height: bodyHeight }} aria-hidden />}
            </div>
          </div>
        </div>
      </div>

      {thumbs?.horizontal && (
        <span
          className={clsx(styles.thumb, styles.thumbX)}
          style={{ left: thumbs.horizontal.start, width: thumbs.horizontal.size }}
          onPointerDown={(event) => startThumbDrag('x', event)}
          aria-hidden
        />
      )}
      {thumbs?.vertical && (
        <span
          className={clsx(styles.thumb, styles.thumbY)}
          style={{ top: thumbs.vertical.start, height: thumbs.vertical.size }}
          onPointerDown={(event) => startThumbDrag('y', event)}
          aria-hidden
        />
      )}

      {/* 기사 0명 1834:11068 */}
      {noTechnicians && (
        <div className={styles.emptyCard} style={{ left: emptyCard.left, top: emptyCard.top }}>
          <StateMessage
            variant="card"
            className={styles.emptyCardMessage}
            icon={<Icon name="users-circle" />}
            title="등록된 기사가 없어요"
            description="기사를 등록하면 타임테이블에서 일정을 배정할 수 있어요"
            actions={
              <Button icon="arrow-back" iconSize={24} onClick={onGoToOrgSettings}>
                조직 설정으로
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
