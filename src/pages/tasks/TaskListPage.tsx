/**
 * 작업 목록(Figma 450:2651 등록자 필터 열림, 1771:7252 대기함 비어 있음, 1773:7704 공란).
 * 머리말(제목·필터 5개·작업내역 출력·새 작업 등록) + 대기함 잔여·거절 작업 + 작업 표.
 * 필터는 두 영역에 함께 적용한다. 작업 상세 모달이 열려도 이 화면은 그대로 유지된다(index.tsx).
 */
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, FilterSelect, type FilterOption } from '@/design-system';
import { today } from '@/lib/date';
import { useActiveTypes, useRegistrants, useTechnicians, useVisibleTasks, useWaitingTasks } from '@/mocks/selectors';
import { getDeletedType, useAppStore } from '@/mocks/store';
import { TASK_STATUS_LABEL, type TaskStatus } from '@/mocks/types';

import { EMPTY_FILTERS, matchesFilters, PERIOD_LABEL, type PeriodKey, STATUS_FILTER_VALUES, type TaskFilters } from './taskFilters';
import styles from './TaskListPage.module.css';
import { TaskTable } from './TaskTable';
import { WaitingSection } from './WaitingSection';

/**
 * 새 작업 등록 모달(timetable 소유)은 열 때만 불러온다. 다른 섹션 파일의 오류가 작업 목록 화면을 깨뜨리지 않게 한다.
 */
const TaskRegisterModal = lazy(() => import('@/features/task-register/TaskRegisterModal'));

const STATUS_OPTIONS: FilterOption<TaskStatus>[] = STATUS_FILTER_VALUES.map((value) => ({
  value,
  label: TASK_STATUS_LABEL[value],
}));

const PERIOD_OPTIONS: FilterOption<PeriodKey>[] = (Object.keys(PERIOD_LABEL) as PeriodKey[]).map((value) => ({
  value,
  label: PERIOD_LABEL[value],
}));

export default function TaskListPage() {
  const navigate = useNavigate();
  const visibleTasks = useVisibleTasks();
  const waitingTasks = useWaitingTasks();
  const technicians = useTechnicians();
  const workTypes = useActiveTypes('WORK');
  const registrants = useRegistrants();
  const members = useAppStore((s) => s.members);
  const types = useAppStore((s) => s.types);

  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);
  const [waitingPage, setWaitingPage] = useState(1);
  const [tablePage, setTablePage] = useState(1);
  const [registerOpen, setRegisterOpen] = useState(false);

  const todayDate = today();
  const tableTasks = useMemo(
    () => visibleTasks.filter((task) => matchesFilters(task, filters, todayDate)),
    [visibleTasks, filters, todayDate],
  );
  const filteredWaiting = useMemo(
    () => waitingTasks.filter((task) => matchesFilters(task, filters, todayDate)),
    [waitingTasks, filters, todayDate],
  );

  const memberNames = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);
  const typeNames = useMemo(() => new Map(types.map((t) => [t.id, t.name])), [types]);
  const memberName = useCallback((id: string | null) => (id ? (memberNames.get(id) ?? '') : ''), [memberNames]);
  const typeName = useCallback(
    (id: string | null) => (id ? (typeNames.get(id) ?? getDeletedType(id)?.name ?? '') : ''),
    [typeNames],
  );

  const updateFilters = (patch: Partial<TaskFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setWaitingPage(1);
    setTablePage(1);
  };

  const openRegister = () => setRegisterOpen(true);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={`t-title-s ${styles.title}`}>작업 목록</h1>
        <div className={styles.toolbar}>
          <div className={styles.filters}>
            <FilterSelect<TaskStatus>
              multiple
              className={styles.w103}
              label="상태"
              value={filters.statuses}
              options={STATUS_OPTIONS}
              onChange={(statuses) => updateFilters({ statuses })}
            />
            <FilterSelect
              className={styles.w133}
              label="담당기사"
              value={filters.technicianId}
              options={technicians.map((m) => ({ value: m.id, label: m.name }))}
              onChange={(technicianId) => updateFilters({ technicianId })}
            />
            <FilterSelect
              className={styles.w133}
              label="작업유형"
              value={filters.workTypeId}
              options={workTypes.map((t) => ({ value: t.id, label: t.name }))}
              onChange={(workTypeId) => updateFilters({ workTypeId })}
            />
            <FilterSelect
              className={styles.w103}
              label="기간"
              value={filters.period}
              options={PERIOD_OPTIONS}
              onChange={(period) => updateFilters({ period })}
            />
            <FilterSelect
              className={styles.w118}
              label="등록자"
              value={filters.registrantId}
              options={registrants.map((m) => ({ value: m.id, label: m.name }))}
              onChange={(registrantId) => updateFilters({ registrantId })}
            />
          </div>
          <div className={styles.actions}>
            {/* 작업내역 출력: 목적지 시안이 없어 동작하지 않는다(docs/ui-plan.md §5) */}
            <Button variant="outline" className={styles.exportButton}>
              작업내역 출력
            </Button>
            <Button icon="plus" className={styles.registerButton} onClick={openRegister}>
              새 작업 등록
            </Button>
          </div>
        </div>
      </header>

      <WaitingSection
        tasks={filteredWaiting}
        page={waitingPage}
        onPageChange={setWaitingPage}
        memberName={memberName}
        onAssign={(taskId) => navigate(`/timetable?mode=edit&task=${taskId}`)}
      />

      <TaskTable
        tasks={tableTasks}
        page={tablePage}
        onPageChange={setTablePage}
        memberName={memberName}
        typeName={typeName}
        onOpen={(taskId) => navigate(`/tasks/${taskId}`)}
        onRegister={openRegister}
      />

      {registerOpen && (
        <Suspense fallback={null}>
          <TaskRegisterModal open onClose={() => setRegisterOpen(false)} onCreated={() => setRegisterOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
