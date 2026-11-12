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
import { SLOT_MINUTES } from '@/features/task-register/scheduleOptions';
import { hmToMinutes, minutesToHm } from '@/lib/date';
import { useMemberNames } from '@/data/selectors';
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
  MINUTES_PER_DAY,
  ROW_HEIGHT,
  VISIBLE_ROWS,
  xToSlotMinutes,
} from './grid';
import ScheduleBlock, { type ResizeEdge } from './ScheduleBlock';
import styles from './TimeGrid.module.css';
import { useNowMinutes } from './useNowMinutes';

/** 배정·이동할 수 있는 블록(기사가 아직 시작하지 않은 배정됨·작업전) */
export function isMovableTask(task: Task): boolean {
  return task.status === 'PENDING_ACCEPT' || task.status === 'ACCEPTED';
}

/** 격자로 끌고 있는 작업. grabOffsetX = 블록 왼쪽에서 잡은 위치(px), 대기함 카드면 null */
export interface GridDrag {
  grabOffsetX: number | null;
  durationMinutes: number;
}

/** 포인터 아래 놓을 칸. drag = 이 칸을 계산한 드래그(드래그가 바뀌면 지난 칸을 그리지 않는다) */
interface DropSlot {
  drag: GridDrag;
  row: number;
  startMinutes: number;
}

/** 블록 양 끝을 끌어 바꾸는 중인 일정(자정부터 분) */
interface ResizeState {
  taskId: ID;
  startMinutes: number;
  endMinutes: number;
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
  drag: GridDrag | null;
  onSelectTask: (taskId: ID | null) => void;
  /** 블록 드래그 시작. grabOffsetX = 블록 왼쪽에서 잡은 위치(px) */
  onBlockDragStart: (taskId: ID, grabOffsetX: number) => void;
  onDragEnd: () => void;
  /** 격자에 놓음. startMinutes = 놓을 칸의 시작 시각(분, 30분 단위) */
  onDropAt: (technicianId: ID, startMinutes: number) => void;
  /** 블록 끝을 끌어 시간을 바꿈. 담당기사는 그대로이고 바뀐 시작 시각·소요 시간(분)을 넘긴다 */
  onResize: (taskId: ID, startMinutes: number, durationMinutes: number) => void;
  /** 기사 0명 안내의 '조직 설정으로'. 없으면(직원) 버튼을 그리지 않는다 */
  onGoToOrgSettings?: () => void;
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
  drag,
  onSelectTask,
  onBlockDragStart,
  onDragEnd,
  onDropAt,
  onResize,
  onGoToOrgSettings,
}: TimeGridProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const nowMinutes = useNowMinutes();
  const memberName = useMemberNames();
  const types = useAppStore((s) => s.types);

  const noTechnicians = technicians.length === 0;
  const rowCount = noTechnicians ? VISIBLE_ROWS : technicians.length;
  const bodyHeight = rowCount * ROW_HEIGHT;
  const frameHeight = Math.min(HEADER_HEIGHT + bodyHeight, GRID_MAX_HEIGHT);
  const driverWidth = noTechnicians ? EMPTY_DRIVER_COLUMN_WIDTH : DRIVER_COLUMN_WIDTH;

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
    const startPointer = axis === 'x' ? event.clientX : event.clientY;
    const startScroll = axis === 'x' ? el.scrollLeft : el.scrollTop;
    const ratio = info.max / info.range;
    const onMove = (e: PointerEvent) => {
      const delta = (axis === 'x' ? e.clientX : e.clientY) - startPointer;
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
  const [dropSlot, setDropSlot] = useState<DropSlot | null>(null);

  /** 포인터 아래 기사 행과 시작 시각. 대기함 카드는 포인터가 있는 칸, 블록은 잡은 위치를 뺀 가장 가까운 칸 */
  const slotAt = (event: DragEvent<HTMLDivElement>): DropSlot | null => {
    const lanes = lanesRef.current;
    if (!editing || !drag || !lanes || noTechnicians) return null;
    const rect = lanes.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const row = Math.floor((event.clientY - rect.top) / ROW_HEIGHT);
    if (!technicians[row]) return null;
    const startMinutes =
      drag.grabOffsetX === null ? xToSlotMinutes(x, 'floor') : xToSlotMinutes(x - drag.grabOffsetX, 'round');
    return { drag, row, startMinutes };
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!editing || !drag || noTechnicians) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const slot = slotAt(event);
    setDropSlot((prev) =>
      prev && slot && prev.drag === slot.drag && prev.row === slot.row && prev.startMinutes === slot.startMinutes
        ? prev
        : slot,
    );
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    // 안쪽 블록으로 옮겨 갈 때도 dragleave가 오므로 시간 칸 밖으로 나갈 때만 지운다.
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    setDropSlot(null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!editing || !drag || noTechnicians) return;
    event.preventDefault();
    const slot = slotAt(event);
    setDropSlot(null);
    if (slot) onDropAt(technicians[slot.row].id, slot.startMinutes);
  };

  // 대기함 카드를 끄는 동안 놓으면 배정될 칸(기사 행 · 시작 시각 · 소요 시간)을 칠한다.
  const dropPreview =
    drag && drag.grabOffsetX === null && dropSlot?.drag === drag
      ? {
          left: minutesToX(dropSlot.startMinutes),
          top: dropSlot.row * ROW_HEIGHT,
          width: Math.min(durationToWidth(drag.durationMinutes), AXIS_WIDTH - minutesToX(dropSlot.startMinutes)),
        }
      : null;

  const handleBlockDragStart = (task: Task, event: DragEvent<HTMLDivElement>) => {
    // 손잡이를 누른 채 움직이면 블록 이동이 아니라 시간 조절이다.
    if (resizingRef.current) {
      event.preventDefault();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const grabOffsetX = event.clientX - rect.left;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', task.id);
    onBlockDragStart(task.id, grabOffsetX);
  };

  // ── 시간 조절: 블록 양 끝을 30분 단위로 끈다 ─────────────────────────────
  const [resize, setResize] = useState<ResizeState | null>(null);
  const resizingRef = useRef(false);

  const startResize = (task: Task, edge: ResizeEdge, event: ReactPointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    resizingRef.current = true;
    const originStart = hmToMinutes(task.startTime!);
    const originEnd = originStart + task.durationMinutes!;
    const origin: ResizeState = { taskId: task.id, startMinutes: originStart, endMinutes: originEnd };
    // 끈 끝은 30분 칸 경계에 맞춘다(블록 이동·시작 시간 선택지와 같은 단위). 최소 30분, 하루(00:00–24:00) 안.
    const latestStart = Math.floor((originEnd - SLOT_MINUTES) / SLOT_MINUTES) * SLOT_MINUTES;
    const earliestEnd = Math.ceil((originStart + SLOT_MINUTES) / SLOT_MINUTES) * SLOT_MINUTES;
    const latestEnd = Math.max(MINUTES_PER_DAY, originEnd);
    let current = origin;
    setResize(current);

    const onMove = (e: PointerEvent) => {
      const moved = ((e.clientX - event.clientX) / HOUR_WIDTH) * 60;
      const snap = (from: number) => Math.round((from + moved) / SLOT_MINUTES) * SLOT_MINUTES;
      // 반 칸도 안 끌었으면 원래 시간을 둔다(30분 칸에 맞지 않는 일정이 살짝 눌러도 바뀌지 않게).
      const next =
        Math.abs(moved) < SLOT_MINUTES / 2
          ? origin
          : edge === 'start'
            ? { ...origin, startMinutes: Math.min(Math.max(snap(originStart), 0), latestStart) }
            : { ...origin, endMinutes: Math.max(Math.min(snap(originEnd), latestEnd), earliestEnd) };
      if (next.startMinutes === current.startMinutes && next.endMinutes === current.endMinutes) return;
      current = next;
      setResize(next);
    };
    const onEnd = (e: PointerEvent) => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onEnd);
      target.removeEventListener('pointercancel', onEnd);
      resizingRef.current = false;
      setResize(null);
      if (e.type === 'pointerup' && (current.startMinutes !== originStart || current.endMinutes !== originEnd)) {
        onResize(task.id, current.startMinutes, current.endMinutes - current.startMinutes);
      }
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onEnd);
    target.addEventListener('pointercancel', onEnd);
  };

  const nowX = minutesToX(nowMinutes);
  const emptyCard = emptyCardPosition(width, frameHeight);

  return (
    <div className={clsx(styles.frame, editing && styles.frameEditing)} style={{ width, height: frameHeight }}>
      <div ref={scrollerRef} className={styles.scroller} onScroll={editing ? measure : undefined}>
        <div className={styles.canvas} style={{ width: driverWidth + AXIS_WIDTH, height: HEADER_HEIGHT + bodyHeight }}>
          {/* 머리줄 577:3006 — Gray50, 기사 184 + 시간 칸 228 */}
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
                />
              ))}
            </div>

            {/* 시간 칸 443:1300 — 10분 칸 38px(Gray100 선), 1시간 228px(Gray300 선), 행 111px(Gray300 아래선) */}
            <div
              ref={lanesRef}
              className={styles.lanes}
              style={{ height: bodyHeight }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (editing && selectedTaskId) onSelectTask(null);
              }}
            >
              {blocks.map(({ task, left, top, width: blockWidth }) => {
                const movable = editing && isMovableTask(task);
                // 조절 중인 블록은 바뀐 시간으로 그린다(카드의 시간 표기 포함).
                const resized = resize?.taskId === task.id ? resize : null;
                const shown = resized
                  ? {
                      ...task,
                      startTime: minutesToHm(resized.startMinutes),
                      durationMinutes: resized.endMinutes - resized.startMinutes,
                    }
                  : task;
                return (
                  <ScheduleBlock
                    key={task.id}
                    task={shown}
                    registrantName={memberName.get(task.registrantId) ?? ''}
                    left={resized ? minutesToX(resized.startMinutes) : left}
                    top={top}
                    width={resized ? durationToWidth(resized.endMinutes - resized.startMinutes) : blockWidth}
                    selected={editing && task.id === selectedTaskId}
                    dimmed={editing && selectedOnGrid && task.id !== selectedTaskId}
                    draggable={movable && !resized}
                    onClick={(event) => {
                      if (!editing) return;
                      event.stopPropagation();
                      onSelectTask(task.id === selectedTaskId ? null : task.id);
                    }}
                    onDragStart={movable ? (event) => handleBlockDragStart(task, event) : undefined}
                    onDragEnd={onDragEnd}
                    onResizeStart={movable && !drag ? (edge, event) => startResize(task, edge, event) : undefined}
                  />
                );
              })}
              {dropPreview && <span className={styles.dropPreview} style={dropPreview} aria-hidden />}
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
              onGoToOrgSettings && (
                <Button icon="arrow-back" iconSize={24} onClick={onGoToOrgSettings}>
                  조직 설정으로
                </Button>
              )
            }
          />
        </div>
      )}
    </div>
  );
}
