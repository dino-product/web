import clsx from 'clsx';
import { type DragEvent, useEffect, useMemo, useRef } from 'react';

import { Icon, IconButton, WorkCard } from '@/design-system';
import { formatElapsedSinceRegistered } from '@/lib/format';
import { useAppStore } from '@/data/store';
import type { ID, Task } from '@/data/types';

import styles from './WaitingPanel.module.css';

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
  /** 이 카드가 보이도록 목록을 한 번 스크롤한다(작업 목록 '배정하기'로 진입, 새 작업 등록 직후) */
  revealTaskId: ID | null;
  onRevealed: () => void;
}

/**
 * 대기함 패널(443:1194, 295x836, Primary, radius 20). 접으면 90px 세로 막대(1834:6778), 비어 있으면 안내(1834:9145).
 * 편집 모드에서 카드를 격자로 드래그해 배정하고, 클릭하면 선택(다른 대기함 카드는 흐리게)한다.
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
  revealTaskId,
  onRevealed,
}: WaitingPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const members = useAppStore((s) => s.members);
  const types = useAppStore((s) => s.types);
  const memberName = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);
  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);
  const selectedInPanel = editing && tasks.some((t) => t.id === selectedTaskId);

  useEffect(() => {
    if (!revealTaskId || collapsed) return;
    const card = listRef.current?.querySelector<HTMLElement>(`[data-task-id="${CSS.escape(revealTaskId)}"]`);
    card?.scrollIntoView({ block: 'nearest' });
    onRevealed();
  }, [revealTaskId, collapsed, onRevealed]);

  if (collapsed) {
    return (
      <aside className={clsx(styles.panel, styles.collapsed)} aria-label="대기함">
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

  const handleDragStart = (task: Task, event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', task.id);
    onCardDragStart(task.id);
  };

  return (
    <aside className={styles.panel} aria-label="대기함">
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
            const type = task.workTypeId ? typeById.get(task.workTypeId) : undefined;
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
                workType={type ? { name: type.name, color: type.color } : null}
                title={task.title}
                assigneeLabel={task.technicianId ? (memberName.get(task.technicianId) ?? '기사 미정') : '기사 미정'}
                meta={formatElapsedSinceRegistered(task.createdAt)}
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
    </aside>
  );
}
