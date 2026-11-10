/**
 * 공통 셀렉터와 훅.
 *
 * Zustand v5 규칙: useAppStore(selector)에 바로 넘기는 셀렉터는 안정된 참조(스토어 안의 기존 객체·원시값)를
 * 돌려줘야 한다. 그래서 이 파일은 세 부류로 나뉜다.
 * - `select*`: (state, ...인자) → 기존 객체·원시값. useAppStore에 바로 넘겨도 된다.
 *   예: `useAppStore((s) => selectTaskById(s, taskId))`
 * - `get*`·`is*` 등 계산 함수: 새 배열·객체를 만든다. useAppStore에 바로 넘기지 말고 아래 훅이나 useMemo 안에서 쓴다.
 * - `use*` 훅: 스토어 조각을 구독하고 useMemo로 파생값을 만든다. 컴포넌트에서는 이 훅을 쓰면 된다.
 *
 * 맨 위 세 셀렉터(selectCurrentUser·selectCurrentCompany·selectCurrentMembership)는 사이드바 계약이라 유지한다.
 */
import { useMemo } from 'react';

import { clockNow, hmToMinutes, isSameMonth, toIsoDate, today } from '@/lib/date';
import { HISTORY_LABEL } from '@/data/constants';
import {
  actorName,
  getTaskEndMs,
  getTaskEndTime,
  getTaskStartMs,
  hasFullAssignment,
  isAssignableTechnician,
  isReportOverdue,
  isScheduledStatus,
  rangesOverlap,
  UNSTARTED_ASSIGNED_STATUSES,
} from '@/data/rules';
import { type AppState, getDeletedType, useAppStore } from '@/data/store';
import type {
  AppNotification,
  Company,
  CompanyMembership,
  CompanyRole,
  ID,
  IsoDate,
  JoinRequest,
  Member,
  Task,
  TaskAssignment,
  TypeCategory,
  TypeItem,
} from '@/data/types';

// 계산 함수와 같은 규칙을 화면에서도 쓰도록 다시 내보낸다.
export {
  getTaskEndMs,
  getTaskEndTime,
  getTaskStartMs,
  hasFullAssignment,
  isAssignableTechnician,
  isReportOverdue,
  isScheduledStatus,
};

// ── 1. 기본 셀렉터(안정 참조) ─────────────────────────────────────────

/** 로그인 사용자(현재 발주사 인력 중 session.userId) */
export const selectCurrentUser = (s: AppState): Member | undefined =>
  s.members.find((m) => m.id === s.session.userId);

/** 현재 발주사 */
export const selectCurrentCompany = (s: AppState): Company | undefined =>
  s.companies.find((c) => c.id === s.session.currentCompanyId);

/** 현재 발주사 소속 정보(역할 포함) */
export const selectCurrentMembership = (s: AppState): CompanyMembership | undefined =>
  s.memberships.find((m) => m.companyId === s.session.currentCompanyId);

/** 현재 발주사에서의 역할. 소속 정보가 없으면 'STAFF' */
export const selectCurrentRole = (s: AppState): CompanyRole => selectCurrentMembership(s)?.role ?? 'STAFF';

/** 로그인 사용자가 현재 발주사의 총관리자인지 */
export const selectIsOwner = (s: AppState): boolean => selectCurrentRole(s) === 'OWNER';

/** 로그인 상태 */
export const selectIsLoggedIn = (s: AppState): boolean => s.session.loggedIn;

/** 네트워크 실패 화면을 보여야 하는지(마지막 API 호출이 서버에 닿지 못함, store.ts handleFailure) */
export const selectIsOffline = (s: AppState): boolean => s.network === 'offline';

/** 현재 발주사의 총관리자 인력 */
export const selectOwnerMember = (s: AppState): Member | undefined => s.members.find((m) => m.isOwner);

/** 인력 조회 */
export const selectMemberById = (s: AppState, memberId: ID | null | undefined): Member | undefined =>
  memberId ? s.members.find((m) => m.id === memberId) : undefined;

/**
 * 유형 조회. 삭제된 유형도 찾는다(작업중·완료 작업은 삭제된 유형을 그대로 유지하기 때문).
 * 목록·선택지에는 useTypes·useActiveTypes를 쓴다.
 */
export const selectTypeById = (s: AppState, typeId: ID | null | undefined): TypeItem | undefined =>
  typeId ? (s.types.find((t) => t.id === typeId) ?? getDeletedType(typeId)) : undefined;

/** 작업 조회 */
export const selectTaskById = (s: AppState, taskId: ID | null | undefined): Task | undefined =>
  taskId ? s.tasks.find((t) => t.id === taskId) : undefined;

/** 알림 조회 */
export const selectNotificationById = (s: AppState, notificationId: ID | null | undefined): AppNotification | undefined =>
  notificationId ? s.notifications.find((n) => n.id === notificationId) : undefined;

/** 안 읽은 알림 수(알림창 '안 읽음 N') */
export const selectUnreadNotificationCount = (s: AppState): number =>
  s.notifications.reduce((count, n) => (n.read ? count : count + 1), 0);

/** 승인대기 수(조직 설정 '승인대기 N') */
export const selectJoinRequestCount = (s: AppState): number => s.joinRequests.length;

/** 대기함(등록 상태) 작업 수 */
export const selectWaitingTaskCount = (s: AppState): number =>
  s.tasks.reduce((count, t) => (t.status === 'REGISTERED' ? count + 1 : count), 0);

// ── 2. 계산 함수(새 배열·객체 — 훅이나 useMemo 안에서만) ─────────────────

/** 인력 정렬: 총관리자 → 직원 → 기사, 같은 구분은 참여일 오래된 순 */
export function sortMembers(members: Member[]): Member[] {
  const rank = (m: Member) => (m.isOwner ? 0 : m.kind === 'EMPLOYEE' ? 1 : 2);
  return [...members].sort((a, b) => rank(a) - rank(b) || a.joinedAt.localeCompare(b.joinedAt));
}

/** 기사 전체(비활성 포함), 참여일 오래된 순 */
export function getTechnicians(members: Member[]): Member[] {
  return sortMembers(members.filter((m) => m.kind === 'TECHNICIAN'));
}

/** 배정·타임테이블 대상 기사(활성 기사만), 참여일 오래된 순 */
export function getActiveTechnicians(members: Member[]): Member[] {
  return sortMembers(members.filter(isAssignableTechnician));
}

/** 직원 전체(로그인 사용자 포함). 총관리자가 맨 앞 */
export function getEmployees(members: Member[]): Member[] {
  return sortMembers(members.filter((m) => m.kind === 'EMPLOYEE'));
}

/** 분류별 유형(비활성 포함), 만든 순 */
export function getTypesByCategory(types: TypeItem[], category: TypeCategory): TypeItem[] {
  return types.filter((t) => t.category === category).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** 분류별 활성 유형(선택지·필터용), 만든 순 */
export function getActiveTypesByCategory(types: TypeItem[], category: TypeCategory): TypeItem[] {
  return getTypesByCategory(types, category).filter((t) => t.active);
}

/** 같은 분류에 이름이 같은 유형이 있는지('조직 내 이름이 중복됩니다.' 검사). 공백은 무시한다. */
export function isTypeNameTaken(types: TypeItem[], category: TypeCategory, name: string, exceptTypeId?: ID): boolean {
  const key = name.replace(/\s+/g, '');
  return types.some((t) => t.category === category && t.id !== exceptTypeId && t.name.replace(/\s+/g, '') === key);
}

/** 취소를 뺀 작업(작업 목록 본문), 최근 수정 순 */
export function getVisibleTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status !== 'CANCELED').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** 대기함 작업(등록 상태, 거절 포함), 등록 오래된 순(경과일이 긴 작업이 위) */
export function getWaitingTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status === 'REGISTERED').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * 날짜별 일정 작업: 그 날짜의 배정됨·작업전·작업중·완료 작업(등록·취소 제외), 시작 시각 순.
 * 타임테이블 격자와 진행 보드 표가 같은 목록을 쓴다. 비활성 기사의 작업도 포함되므로 격자는 행(활성 기사)으로 거른다.
 */
export function getScheduledTasksByDate(tasks: Task[], date: IsoDate): Task[] {
  return tasks
    .filter((t) => t.date === date && isScheduledStatus(t.status))
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.title.localeCompare(b.title));
}

/** 진행 보드 요약·탭 집계 */
export interface BoardSummary {
  /** 총 작업: 그 날짜의 배정됨·작업전·작업중·완료 작업 수(= inProgress + delayed + completed) */
  total: number;
  /** 진행중(집계 이름): 배정됨·작업전·작업중 가운데 지연이 아닌 작업 */
  inProgress: number;
  /** 지연: 완료되지 않았고 지연 배지가 있는 작업 */
  delayed: number;
  /** 완료: 완료 보고가 제출된 작업 */
  completed: number;
  /** 탭별 개수(전체 = total) */
  byStatus: Record<'PENDING_ACCEPT' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED', number>;
}

/** 진행 보드 집계. 정의는 BoardSummary 주석과 docs/data-layer.md §5 */
export function getBoardSummary(tasks: Task[], date: IsoDate): BoardSummary {
  const summary: BoardSummary = {
    total: 0,
    inProgress: 0,
    delayed: 0,
    completed: 0,
    byStatus: { PENDING_ACCEPT: 0, ACCEPTED: 0, IN_PROGRESS: 0, COMPLETED: 0 },
  };
  for (const task of getScheduledTasksByDate(tasks, date)) {
    summary.total += 1;
    summary.byStatus[task.status as keyof BoardSummary['byStatus']] += 1;
    if (task.status === 'COMPLETED') summary.completed += 1;
    else if (task.delayed) summary.delayed += 1;
    else summary.inProgress += 1;
  }
  return summary;
}

/**
 * 대기함 '미처리 사유'. 등록 상태가 아니면 null.
 * 예: '담당기사 · 시간 미지정', '담당기사 미지정', '시간 미지정'
 */
export function getUnassignedReason(task: Task): string | null {
  if (task.status !== 'REGISTERED') return null;
  const noTechnician = !task.technicianId;
  const noTime = !task.date || !task.startTime || task.durationMinutes == null;
  if (noTechnician && noTime) return '담당기사 · 시간 미지정';
  if (noTechnician) return '담당기사 미지정';
  if (noTime) return '시간 미지정';
  return null;
}

/**
 * 배정하려는 칸과 같은 기사·날짜·시간대에 겹치는 일정 작업(일정 충돌 경고용). 이동 중인 작업 자신은 excludeTaskId로 뺀다.
 */
export function findScheduleConflicts(tasks: Task[], assignment: TaskAssignment, excludeTaskId?: ID): Task[] {
  const start = hmToMinutes(assignment.startTime);
  const end = start + assignment.durationMinutes;
  return tasks.filter((t) => {
    if (t.id === excludeTaskId || t.technicianId !== assignment.technicianId || t.date !== assignment.date) return false;
    if (!isScheduledStatus(t.status) || !t.startTime || t.durationMinutes == null) return false;
    const tStart = hmToMinutes(t.startTime);
    return rangesOverlap(start, end, tStart, tStart + t.durationMinutes);
  });
}

/** 기사에게 남아 있는 작업: 작업중(역할 변경 불가 사유)과 시작 전 배정(배정됨·작업전, 변경 시 대기함으로) */
export interface TechnicianOpenTasks {
  inProgress: Task[];
  scheduled: Task[];
}

/** 역할 변경 모달용 기사 작업 현황(Figma 2008:31376, 2008:31713). 각 목록은 일정 순 */
export function getTechnicianOpenTasks(tasks: Task[], memberId: ID): TechnicianOpenTasks {
  const byStart = (a: Task, b: Task) => (getTaskStartMs(a) ?? 0) - (getTaskStartMs(b) ?? 0);
  const own = tasks.filter((t) => t.technicianId === memberId);
  return {
    inProgress: own.filter((t) => t.status === 'IN_PROGRESS').sort(byStart),
    scheduled: own.filter((t) => UNSTARTED_ASSIGNED_STATUSES.includes(t.status)).sort(byStart),
  };
}

/** 기사 작업이력 한 줄 */
export interface TechnicianHistoryRow {
  task: Task;
  /** 이 기사 기준 결과 */
  result: 'COMPLETED' | 'REJECTED';
  /** 담당 날짜: 완료는 작업 날짜, 거절은 거절한 날짜 */
  date: IsoDate;
  /** 완료 보고 제출 여부(거절은 false → '-') */
  reportSubmitted: boolean;
}

/** 기사 작업이력(Figma 1550:8288) */
export interface TechnicianHistory {
  /** 완료·거절 작업, 담당 날짜 최신순 */
  rows: TechnicianHistoryRow[];
  /** 전체 누적 완료 */
  totalCompleted: number;
  /** 이번 달 거절 */
  monthRejected: number;
  /** 이번 달 완료 */
  monthCompleted: number;
}

/**
 * 기사 작업이력: 이 기사가 완료한 작업과 거절한 작업(다른 기사에게 다시 배정된 작업 포함, 상태 변경 이력 기준).
 * '이번 달'은 Asia/Seoul 오늘이 속한 달.
 */
export function getTechnicianHistory(tasks: Task[], member: Member, now: number = clockNow()): TechnicianHistory {
  const rejectedLabel = actorName(member);
  const rows: TechnicianHistoryRow[] = [];
  for (const task of tasks) {
    if (task.technicianId === member.id && task.status === 'COMPLETED') {
      rows.push({ task, result: 'COMPLETED', date: task.date ?? toIsoDate(task.updatedAt), reportSubmitted: Boolean(task.report) });
    }
    for (const entry of task.history) {
      if (entry.label === HISTORY_LABEL.rejected && entry.actor === rejectedLabel) {
        rows.push({ task, result: 'REJECTED', date: toIsoDate(entry.at), reportSubmitted: false });
      }
    }
  }
  rows.sort((a, b) => b.date.localeCompare(a.date));
  const thisMonth = today(now);
  return {
    rows,
    totalCompleted: rows.filter((r) => r.result === 'COMPLETED').length,
    monthRejected: rows.filter((r) => r.result === 'REJECTED' && isSameMonth(r.date, thisMonth)).length,
    monthCompleted: rows.filter((r) => r.result === 'COMPLETED' && isSameMonth(r.date, thisMonth)).length,
  };
}

/** 작업을 등록한 인력 목록(작업 목록 '등록자' 필터), 이름순 */
export function getRegistrants(tasks: Task[], members: Member[]): Member[] {
  const ids = new Set(tasks.filter((t) => t.status !== 'CANCELED').map((t) => t.registrantId));
  return members.filter((m) => ids.has(m.id)).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

/** 알림 최신순 */
export function sortNotifications(notifications: AppNotification[]): AppNotification[] {
  return [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 승인대기 요청 최신순 */
export function sortJoinRequests(requests: JoinRequest[]): JoinRequest[] {
  return [...requests].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

// ── 3. 훅 ───────────────────────────────────────────────────────────

/** 로그인 사용자 */
export function useCurrentUser(): Member | undefined {
  return useAppStore(selectCurrentUser);
}

/** 현재 발주사 */
export function useCurrentCompany(): Company | undefined {
  return useAppStore(selectCurrentCompany);
}

/** 현재 발주사 소속 정보 */
export function useCurrentMembership(): CompanyMembership | undefined {
  return useAppStore(selectCurrentMembership);
}

/** 로그인 사용자가 현재 발주사 총관리자인지 */
export function useIsOwner(): boolean {
  return useAppStore(selectIsOwner);
}

/** 로그인 사용자가 총관리자인 소속 발주사(계정 탈퇴 불가 사유 목록) */
export function useOwnedMemberships(): CompanyMembership[] {
  const memberships = useAppStore((s) => s.memberships);
  return useMemo(() => memberships.filter((m) => m.role === 'OWNER'), [memberships]);
}

/** 인력 전체(총관리자 → 직원 → 기사, 참여일 순) */
export function useMembers(): Member[] {
  const members = useAppStore((s) => s.members);
  return useMemo(() => sortMembers(members), [members]);
}

/** 직원 전체 */
export function useEmployees(): Member[] {
  const members = useAppStore((s) => s.members);
  return useMemo(() => getEmployees(members), [members]);
}

/** 기사 전체(비활성 포함) */
export function useTechnicians(): Member[] {
  const members = useAppStore((s) => s.members);
  return useMemo(() => getTechnicians(members), [members]);
}

/** 배정·타임테이블 대상 기사(활성 기사만) */
export function useActiveTechnicians(): Member[] {
  const members = useAppStore((s) => s.members);
  return useMemo(() => getActiveTechnicians(members), [members]);
}

/** 인력 한 명 */
export function useMember(memberId: ID | null | undefined): Member | undefined {
  return useAppStore((s) => selectMemberById(s, memberId));
}

/** 유형 하나(삭제된 유형 포함) */
export function useType(typeId: ID | null | undefined): TypeItem | undefined {
  return useAppStore((s) => selectTypeById(s, typeId));
}

/** 분류별 유형(비활성 포함) — 유형 설정 목록 */
export function useTypes(category: TypeCategory): TypeItem[] {
  const types = useAppStore((s) => s.types);
  return useMemo(() => getTypesByCategory(types, category), [types, category]);
}

/** 분류별 활성 유형 — 선택지·필터 */
export function useActiveTypes(category: TypeCategory): TypeItem[] {
  const types = useAppStore((s) => s.types);
  return useMemo(() => getActiveTypesByCategory(types, category), [types, category]);
}

/** 작업 하나 */
export function useTask(taskId: ID | null | undefined): Task | undefined {
  return useAppStore((s) => selectTaskById(s, taskId));
}

/** 취소를 뺀 작업 전체(최근 수정 순) */
export function useVisibleTasks(): Task[] {
  const tasks = useAppStore((s) => s.tasks);
  return useMemo(() => getVisibleTasks(tasks), [tasks]);
}

/** 대기함 작업(등록 상태, 등록 오래된 순) */
export function useWaitingTasks(): Task[] {
  const tasks = useAppStore((s) => s.tasks);
  return useMemo(() => getWaitingTasks(tasks), [tasks]);
}

/** 날짜별 일정 작업(배정됨·작업전·작업중·완료, 시작 시각 순) — 타임테이블 격자·진행 보드 표 */
export function useTasksByDate(date: IsoDate): Task[] {
  const tasks = useAppStore((s) => s.tasks);
  return useMemo(() => getScheduledTasksByDate(tasks, date), [tasks, date]);
}

/** 진행 보드 요약·탭 집계 */
export function useBoardSummary(date: IsoDate): BoardSummary {
  const tasks = useAppStore((s) => s.tasks);
  return useMemo(() => getBoardSummary(tasks, date), [tasks, date]);
}

/** 기사 작업 현황(역할 변경 모달) */
export function useTechnicianOpenTasks(memberId: ID): TechnicianOpenTasks {
  const tasks = useAppStore((s) => s.tasks);
  return useMemo(() => getTechnicianOpenTasks(tasks, memberId), [tasks, memberId]);
}

/** 기사 작업이력. 인력이 없으면 undefined */
export function useTechnicianHistory(memberId: ID): TechnicianHistory | undefined {
  const tasks = useAppStore((s) => s.tasks);
  const member = useMember(memberId);
  return useMemo(() => (member ? getTechnicianHistory(tasks, member) : undefined), [tasks, member]);
}

/** 작업 등록자 목록(작업 목록 '등록자' 필터) */
export function useRegistrants(): Member[] {
  const tasks = useAppStore((s) => s.tasks);
  const members = useAppStore((s) => s.members);
  return useMemo(() => getRegistrants(tasks, members), [tasks, members]);
}

/** 알림 전체(최신순) */
export function useNotifications(): AppNotification[] {
  const notifications = useAppStore((s) => s.notifications);
  return useMemo(() => sortNotifications(notifications), [notifications]);
}

/** 안 읽은 알림 수 */
export function useUnreadNotificationCount(): number {
  return useAppStore(selectUnreadNotificationCount);
}

/** 승인대기 요청(최신순) */
export function useJoinRequests(): JoinRequest[] {
  const requests = useAppStore((s) => s.joinRequests);
  return useMemo(() => sortJoinRequests(requests), [requests]);
}

/** 승인대기 수 */
export function useJoinRequestCount(): number {
  return useAppStore(selectJoinRequestCount);
}
