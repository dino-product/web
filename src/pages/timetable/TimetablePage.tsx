import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { TaskRegisterDateContext } from '@/features/task-register/registerDate';
import TaskRegisterModal from '@/features/task-register/TaskRegisterModal';
import { addDays, minutesToHm, today } from '@/lib/date';
import {
  findScheduleConflicts,
  selectIsOffline,
  selectTaskById,
  useActiveTechnicians,
  useActiveTypes,
  useTasksByDate,
  useWaitingTasks,
} from '@/mocks/selectors';
import { useAppStore } from '@/mocks/store';
import type { ID, IsoDate, Task, TaskAssignment } from '@/mocks/types';

import { type AssignDraft, AssignConfirmDialog, ConflictDialog, StaleDialog } from './AssignDialogs';
import { CONTENT_GAP, CONTENT_WIDTH, PANEL_COLLAPSED_WIDTH, PANEL_WIDTH, xToSlotMinutes } from './grid';
import { applyConcurrentEdit, isStaleAssignment } from './staleDemo';
import TimeGrid from './TimeGrid';
import TimetableOffline from './TimetableOffline';
import styles from './TimetablePage.module.css';
import TimetableToolbar, { type TimetableMode } from './TimetableToolbar';
import WaitingPanel from './WaitingPanel';

/** 드래그 중인 작업. 격자 블록이면 잡은 위치(블록 왼쪽에서 px)를 함께 둔다. */
interface DragState {
  taskId: ID;
  grabOffsetX: number | null;
}

interface ConflictState {
  taskId: ID;
  assignment: TaskAssignment;
  conflicts: Task[];
}

/**
 * 타임테이블(/timetable). 보기 443:1156·편집 1038:4233 모드, 대기함 펼침·접힘·빈 상태, 기사 0명, 네트워크 실패,
 * 새 작업 등록 모달, 배정 확인·일정 충돌·변경된 정보 모달.
 * - 쿼리 ?mode=edit 편집 모드, &task=<id> 해당 카드 선택(작업 목록 '배정하기'에서 진입).
 * - 날짜·필터·대기함 접힘은 화면 상태다.
 */
export default function TimetablePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const offline = useAppStore(selectIsOffline);

  const mode: TimetableMode = searchParams.get('mode') === 'edit' ? 'edit' : 'view';
  const editing = mode === 'edit';
  const selectedTaskId = editing ? searchParams.get('task') : null;

  const [date, setDate] = useState<IsoDate>(() => today());
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [technicianTypeId, setTechnicianTypeId] = useState<ID | null>(null);
  const [workTypeId, setWorkTypeId] = useState<ID | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [assignDraft, setAssignDraft] = useState<AssignDraft | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  /** '변경된 정보입니다'를 띄운 작업. 확인을 누를 때 최신 상태(다른 사용자의 변경)를 반영해 다시 그린다 */
  const [staleTaskId, setStaleTaskId] = useState<ID | null>(null);
  const [revealTaskId, setRevealTaskId] = useState<ID | null>(null);

  const technicianTypes = useActiveTypes('TECHNICIAN');
  const workTypes = useActiveTypes('WORK');
  const technicians = useActiveTechnicians();
  const scheduledTasks = useTasksByDate(date);
  const waitingTasks = useWaitingTasks();
  const selectedTask = useAppStore((s) => selectTaskById(s, selectedTaskId));

  // 선택한 유형이 비활성화·삭제되면 필터를 푼다.
  const activeTechnicianTypeId = technicianTypes.some((t) => t.id === technicianTypeId) ? technicianTypeId : null;
  const activeWorkTypeId = workTypes.some((t) => t.id === workTypeId) ? workTypeId : null;

  const rows = useMemo(
    () => (activeTechnicianTypeId ? technicians.filter((m) => m.typeId === activeTechnicianTypeId) : technicians),
    [technicians, activeTechnicianTypeId],
  );
  const gridTasks = useMemo(
    () => (activeWorkTypeId ? scheduledTasks.filter((t) => t.workTypeId === activeWorkTypeId) : scheduledTasks),
    [scheduledTasks, activeWorkTypeId],
  );
  const panelTasks = useMemo(
    () => (activeWorkTypeId ? waitingTasks.filter((t) => t.workTypeId === activeWorkTypeId) : waitingTasks),
    [waitingTasks, activeWorkTypeId],
  );

  const updateParams = useCallback(
    (patch: { mode?: TimetableMode; task?: ID | null }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (patch.mode !== undefined) {
            if (patch.mode === 'edit') next.set('mode', 'edit');
            else {
              next.delete('mode');
              next.delete('task');
            }
          }
          if (patch.task !== undefined) {
            if (patch.task) next.set('task', patch.task);
            else next.delete('task');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // 작업 목록 '배정하기'(?mode=edit&task=<id>): 대기함 카드면 패널을 펼치고 보이게, 배정된 작업이면 그 날짜로 이동한다.
  // 선택이 바뀔 때만 맞춘다(같은 작업의 내용 변경에는 반응하지 않는다).
  const handledSelectionRef = useRef<ID | null>(null);
  useEffect(() => {
    if (!selectedTask) {
      handledSelectionRef.current = null;
      return;
    }
    if (handledSelectionRef.current === selectedTask.id) return;
    handledSelectionRef.current = selectedTask.id;
    if (selectedTask.status === 'REGISTERED') {
      setPanelCollapsed(false);
      setRevealTaskId(selectedTask.id);
    } else if (selectedTask.date) {
      setDate(selectedTask.date);
    }
  }, [selectedTask]);

  const handleModeChange = (next: TimetableMode) => {
    if (next === mode) return;
    setDrag(null);
    updateParams({ mode: next });
  };

  const handleDropAt = (technicianId: ID, x: number) => {
    if (!drag) return;
    const task = useAppStore.getState().tasks.find((t) => t.id === drag.taskId);
    setDrag(null);
    if (!task) return;
    const startMinutes =
      drag.grabOffsetX === null ? xToSlotMinutes(x, 'floor') : xToSlotMinutes(x - drag.grabOffsetX, 'round');
    setAssignDraft({
      taskId: task.id,
      technicianId,
      startTime: minutesToHm(startMinutes),
      durationMinutes: task.durationMinutes ?? 60,
    });
  };

  const commitAssignment = (taskId: ID, assignment: TaskAssignment) => {
    setConflict(null);
    if (isStaleAssignment(taskId)) {
      setStaleTaskId(taskId);
      return;
    }
    useAppStore.getState().assignTask(taskId, assignment);
  };

  const handleConfirmAssign = (draft: AssignDraft) => {
    const assignment: TaskAssignment = {
      technicianId: draft.technicianId,
      date,
      startTime: draft.startTime,
      durationMinutes: draft.durationMinutes,
    };
    setAssignDraft(null);
    const conflicts = findScheduleConflicts(useAppStore.getState().tasks, assignment, draft.taskId);
    if (conflicts.length > 0) {
      setConflict({ taskId: draft.taskId, assignment, conflicts });
      return;
    }
    commitAssignment(draft.taskId, assignment);
  };

  const clearReveal = useCallback(() => setRevealTaskId(null), []);

  const panelWidth = panelCollapsed ? PANEL_COLLAPSED_WIDTH : PANEL_WIDTH;
  const gridWidth = CONTENT_WIDTH - CONTENT_GAP - panelWidth;

  return (
    <TaskRegisterDateContext.Provider value={date}>
      <div className={clsx(styles.page, editing && !offline && styles.pageEditing)}>
        <h1 className={clsx('t-title-s', styles.title, editing && !offline && styles.titleDimmed)}>타임 테이블</h1>

        {offline ? (
          <TimetableOffline onRegister={() => setRegisterOpen(true)} />
        ) : (
          <>
            <div className={styles.toolbarRow}>
              <TimetableToolbar
                date={date}
                onPrevDate={() => setDate((d) => addDays(d, -1))}
                onNextDate={() => setDate((d) => addDays(d, 1))}
                onToday={() => setDate(today())}
                mode={mode}
                onModeChange={handleModeChange}
                technicianTypes={technicianTypes}
                technicianTypeId={activeTechnicianTypeId}
                onTechnicianTypeChange={setTechnicianTypeId}
                workTypes={workTypes}
                workTypeId={activeWorkTypeId}
                onWorkTypeChange={setWorkTypeId}
                onRegister={() => setRegisterOpen(true)}
              />
            </div>
            <div className={styles.content}>
              <TimeGrid
                width={gridWidth}
                technicians={rows}
                tasks={gridTasks}
                // 현재 시각선(443:1673 'Line 6')은 보기 모드 시안에만 있고 편집 모드 시안(1038:4233·1039:4935)에는 없다.
                showNowLine={!editing && date === today()}
                editing={editing}
                selectedTaskId={selectedTaskId}
                dragging={drag !== null}
                onSelectTask={(taskId) => updateParams({ task: taskId })}
                onBlockDragStart={(taskId, grabOffsetX) => setDrag({ taskId, grabOffsetX })}
                onDragEnd={() => setDrag(null)}
                onDropAt={handleDropAt}
                onGoToOrgSettings={() => navigate('/org/members')}
              />
              <WaitingPanel
                tasks={panelTasks}
                collapsed={panelCollapsed}
                onToggleCollapsed={() => setPanelCollapsed((v) => !v)}
                editing={editing}
                selectedTaskId={selectedTaskId}
                onSelectTask={(taskId) => updateParams({ task: taskId })}
                onCardDragStart={(taskId) => setDrag({ taskId, grabOffsetX: null })}
                onDragEnd={() => setDrag(null)}
                revealTaskId={revealTaskId}
                onRevealed={clearReveal}
              />
            </div>
          </>
        )}
      </div>

      <TaskRegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onCreated={(taskId) => setRevealTaskId(taskId)}
      />
      <AssignConfirmDialog
        draft={assignDraft}
        onChange={setAssignDraft}
        onCancel={() => setAssignDraft(null)}
        onConfirm={handleConfirmAssign}
      />
      <ConflictDialog
        open={conflict !== null}
        conflicts={conflict?.conflicts ?? []}
        onCancel={() => setConflict(null)}
        onConfirm={() => conflict && commitAssignment(conflict.taskId, conflict.assignment)}
      />
      <StaleDialog
        open={staleTaskId !== null}
        onConfirm={() => {
          if (staleTaskId) applyConcurrentEdit(staleTaskId);
          setStaleTaskId(null);
        }}
      />
    </TaskRegisterDateContext.Provider>
  );
}
