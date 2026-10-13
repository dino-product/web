/**
 * 작업 목록 필터(상태·담당기사·작업유형·기간·등록자). 대기함과 본문 표에 함께 적용한다.
 * 필터 상태는 화면 전용이라 컴포넌트 상태로 둔다.
 */
import { addDays, weekdayOf } from '@/lib/date';
import type { ID, IsoDate, Task, TaskStatus } from '@/mocks/types';

/** 기간 필터: 작업 날짜 기준(날짜가 없는 작업은 기간을 고르면 빠진다) */
export type PeriodKey = 'today' | 'week' | 'month';

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  today: '오늘',
  week: '이번 주',
  month: '이번 달',
};

/** 상태 필터 선택지(취소 제외 5종, TASK_STATUS_LABEL 순서) */
export const STATUS_FILTER_VALUES: Exclude<TaskStatus, 'CANCELED'>[] = [
  'REGISTERED',
  'PENDING_ACCEPT',
  'ACCEPTED',
  'IN_PROGRESS',
  'COMPLETED',
];

export interface TaskFilters {
  /** 다중 선택. 비어 있으면 전체 */
  statuses: TaskStatus[];
  technicianId: ID | null;
  workTypeId: ID | null;
  period: PeriodKey | null;
  registrantId: ID | null;
}

export const EMPTY_FILTERS: TaskFilters = {
  statuses: [],
  technicianId: null,
  workTypeId: null,
  period: null,
  registrantId: null,
};

/** 오늘이 속한 주(월–일)·달 안인지 */
function inPeriod(date: IsoDate | null, period: PeriodKey, todayDate: IsoDate): boolean {
  if (!date) return false;
  if (period === 'today') return date === todayDate;
  if (period === 'month') return date.slice(0, 7) === todayDate.slice(0, 7);
  const monday = addDays(todayDate, -((weekdayOf(todayDate) + 6) % 7));
  return date >= monday && date <= addDays(monday, 6);
}

export function matchesFilters(task: Task, filters: TaskFilters, todayDate: IsoDate): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) return false;
  if (filters.technicianId && task.technicianId !== filters.technicianId) return false;
  if (filters.workTypeId && task.workTypeId !== filters.workTypeId) return false;
  if (filters.registrantId && task.registrantId !== filters.registrantId) return false;
  if (filters.period && !inPeriod(task.date, filters.period, todayDate)) return false;
  return true;
}
