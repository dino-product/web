import clsx from 'clsx';
import { type DragEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Icon, IconButton, WorkCard, type WorkCardProps } from '@/design-system';
import { formatElapsedSinceRegistered } from '@/lib/format';
import { useMemberNames } from '@/data/selectors';
import { useAppStore } from '@/data/store';
import type { ID, Task } from '@/data/types';

import styles from './WaitingPanel.module.css';

type CardContent = Pick<WorkCardProps, 'workType' | 'title' | 'assigneeLabel' | 'meta'>;

/** 드래그 중인 카드 미리보기. grab = 카드 왼쪽 위에서 잡은 위치(캔버스 px), client = 시작 포인터 위치 */
interface DragGhost {
  card: CardContent;
  grabX: number;
  grabY: number;
  clientX: number;
  clientY: number;
}

/** 브라우저 기본 드래그 고스트를 숨기는 1x1 투명 이미지. 드래그 시작 전에 디코딩되도록 미리 만든다. */
const EMPTY_DRAG_IMAGE = new Image();
EMPTY_DRAG_IMAGE.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * 드래그 미리보기 카드. 브라우저 기본 고스트는 요소 사각형을 그대로 찍어 둥근 모서리 바깥을 패널 배경(Primary)으로
 * 채우므로(검은 직사각형), 기본 고스트를 숨기고 #overlay-root에 카드를 직접 그려 포인터를 따라가게 한다.
 * 놓거나(drop) 드래그가 끝나면(dragend, Esc 취소 포함) onEnd로 지운다.
 */
function CardDragGhost({ ghost, onEnd }: { ghost: DragGhost; onEnd: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const root = document.getElementById('overlay-root');

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !root) return;
    // 포인터 위치를 #overlay-root 기준 캔버스 좌표로 바꾼다.
    const place = (clientX: number, clientY: number) => {
      const rootRect = root.getBoundingClientRect();
      const x = clientX - rootRect.left - ghost.grabX;
      const y = clientY - rootRect.top - ghost.grabY;
      el.style.transform = `translate(${x}px, ${y}px)`;
    };
    place(ghost.clientX, ghost.clientY);
    const onDragOver = (event: globalThis.DragEvent) => place(event.clientX, event.clientY);
    document.addEventListener('dragover', onDragOver, true);
    // 배정되면 원본 카드가 목록에서 빠져 dragend가 오지 않을 수 있으므로 drop에서도 지운다.
    document.addEventListener('drop', onEnd, true);
    document.addEventListener('dragend', onEnd, true);
    return () => {
      document.removeEventListener('dragover', onDragOver, true);
      document.removeEventListener('drop', onEnd, true);
      document.removeEventListener('dragend', onEnd, true);
    };
  }, [ghost, onEnd, root]);

  if (!root) return null;
  return createPortal(
    <div ref={ref} className={styles.dragGhost} aria-hidden>
      <WorkCard {...ghost.card} />
    </div>,
    root,
  );
}

interface WaitingPanelProps {
  /** 대기함 작업(등록 상태, 작업 유형 필터 적용) */
  tasks: Task[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  editing: boolean;
  selectedTaskId: ID | null;
  onSelectTask: (taskId: ID | null) => void;
  onCardDragStart: (taskId: ID) => void;
  onDragEnd: () => void;
  /** 격자 블록(배정됨·작업전)을 끄는 중. 이때만 패널이 놓기를 받고, 위에 오면 칠한다 */
  acceptsUnassign: boolean;
  /** 끌던 블록을 패널에 놓음 → 배정 해제 */
  onDropUnassign: () => void;
  /** 이 카드가 보이도록 목록을 한 번 스크롤한다(작업 목록 '배정하기'로 진입, 새 작업 등록 직후) */
  revealTaskId: ID | null;
  onRevealed: () => void;
}

/**
 * 대기함 패널(443:1194, 295x836, Primary, radius 20). 접으면 90px 세로 막대(1834:6778), 비어 있으면 안내(1834:9145).
 * 편집 모드에서 카드를 격자로 드래그해 배정하고, 클릭하면 선택(다른 대기함 카드는 흐리게)한다.
 * 격자 블록을 패널(접힌 막대 포함)로 끌어 놓으면 배정을 해제한다. 놓을 수 있는 동안 패널 위에 오면 칠한다.
 */
export default function WaitingPanel({
  tasks,
  collapsed,
  onToggleCollapsed,
  editing,
  selectedTaskId,
  onSelectTask,
  onCardDragStart,
  onDragEnd,
  acceptsUnassign,
  onDropUnassign,
  revealTaskId,
  onRevealed,
}: WaitingPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const memberName = useMemberNames();
  const types = useAppStore((s) => s.types);
  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);
  const selectedInPanel = editing && tasks.some((t) => t.id === selectedTaskId);
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);
  const clearDragGhost = useCallback(() => setDragGhost(null), []);
  const [dropOver, setDropOver] = useState(false);
  // 드래그가 끝나면(패널 위에서 Esc로 취소해 dragleave가 오지 않은 경우 포함) 칠한 것을 지운다.
  if (!acceptsUnassign && dropOver) setDropOver(false);
  const highlighted = acceptsUnassign && dropOver;
  const dropProps = {
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!acceptsUnassign) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (!dropOver) setDropOver(true);
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      // 안쪽 카드로 옮겨 갈 때도 dragleave가 오므로 패널 밖으로 나갈 때만 지운다.
      if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
      setDropOver(false);
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      setDropOver(false);
      if (!acceptsUnassign) return;
      event.preventDefault();
      onDropUnassign();
    },
  };

  useEffect(() => {
    if (!revealTaskId || collapsed) return;
    const card = listRef.current?.querySelector<HTMLElement>(`[data-task-id="${CSS.escape(revealTaskId)}"]`);
    card?.scrollIntoView({ block: 'nearest' });
    onRevealed();
  }, [revealTaskId, collapsed, onRevealed]);

  if (collapsed) {
    return (
      <aside className={clsx(styles.panel, styles.collapsed, highlighted && styles.dropTarget)} aria-label="대기함" {...dropProps}>
        <IconButton
          icon="sidebar-left"
          size={24}
          color="var(--color-white-60)"
          label="대기함 펼치기"
          className={styles.toggleCollapsed}
          onClick={onToggleCollapsed}
        />
        <div className={styles.collapsedInfo}>
          <span className={clsx('t-body-m-medium', styles.collapsedCount)}>{tasks.length}</span>
          <span className={styles.collapsedLabel}>{'대\n기\n함'}</span>
        </div>
      </aside>
    );
  }

  const cardContent = (task: Task): CardContent => {
    const type = task.workTypeId ? typeById.get(task.workTypeId) : undefined;
    return {
      workType: type ? { name: type.name, color: type.color } : null,
      title: task.title,
      assigneeLabel: task.technicianId ? (memberName.get(task.technicianId) ?? '기사 미정') : '기사 미정',
      meta: formatElapsedSinceRegistered(task.createdAt),
    };
  };

  const handleDragStart = (task: Task, event: DragEvent<HTMLDivElement>) => {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', task.id);
    event.dataTransfer.setDragImage(EMPTY_DRAG_IMAGE, 0, 0);
    setDragGhost({
      card: cardContent(task),
      grabX: event.clientX - rect.left,
      grabY: event.clientY - rect.top,
      clientX: event.clientX,
      clientY: event.clientY,
    });
    onCardDragStart(task.id);
  };

  return (
    <aside className={clsx(styles.panel, highlighted && styles.dropTarget)} aria-label="대기함" {...dropProps}>
      <h2 className={clsx('t-body-xl-bold', styles.title)}>대기함</h2>
      <span className={clsx('t-body-m-medium', styles.count)}>{tasks.length}건</span>
      <IconButton
        icon="sidebar-left"
        size={24}
        color="var(--color-white-60)"
        label="대기함 접기"
        className={styles.toggle}
        onClick={onToggleCollapsed}
      />

      {tasks.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="box-open" color="var(--color-gray-500)" />
          <p className={clsx('t-body-m-semibold', styles.emptyText)}>등록된 작업이 없어요</p>
        </div>
      ) : (
        <div ref={listRef} className={styles.list}>
          {tasks.map((task) => {
            const selected = editing && task.id === selectedTaskId;
            return (
              <WorkCard
                key={task.id}
                data-task-id={task.id}
                className={clsx(
                  styles.card,
                  editing && styles.cardDraggable,
                  selected && styles.cardSelected,
                  selectedInPanel && !selected && styles.cardDimmed,
                )}
                {...cardContent(task)}
                draggable={editing}
                onClick={() => {
                  if (editing) onSelectTask(selected ? null : task.id);
                }}
                onDragStart={editing ? (event) => handleDragStart(task, event) : undefined}
                onDragEnd={onDragEnd}
              />
            );
          })}
        </div>
      )}
      {dragGhost && <CardDragGhost ghost={dragGhost} onEnd={clearDragGhost} />}
    </aside>
  );
}
