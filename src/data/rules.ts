/**
 * 작업·인력 도메인 규칙(순수 함수). 스토어 액션과 셀렉터가 함께 쓴다.
 * 상태 정의는 types.ts 주석과 docs/ui-plan.md §3을 따른다.
 */
import { SITE_PHOTO_CONTENT_TYPES } from '@/data/constants';
import { clockNow, dateTimeToMs, hmToMinutes, minutesToHm } from '@/lib/date';
import type { HourMinute, Member, Task, TaskStatus } from '@/data/types';

const PHOTO_TYPE_BY_EXTENSION: Record<string, string> = { heic: 'image/heic', heif: 'image/heif' };

/**
 * 현장 사진으로 올릴 수 있는 파일의 형식. 서버가 받지 않는 형식이면 null.
 * 일부 브라우저는 HEIC·HEIF 파일의 형식을 비워 주므로 확장자로 채운다.
 */
export function sitePhotoContentType(file: Pick<File, 'type' | 'name'>): string | null {
  const type = file.type || PHOTO_TYPE_BY_EXTENSION[file.name.split('.').pop()?.toLowerCase() ?? ''] || '';
  return (SITE_PHOTO_CONTENT_TYPES as readonly string[]).includes(type) ? type : null;
}

/** 배정 판단에 쓰는 작업 필드 */
type AssignmentFields = Pick<Task, 'technicianId' | 'date' | 'startTime' | 'durationMinutes'>;

/** 격자·진행 보드에 놓이는 상태(배정됨·작업전·작업중·완료) */
export const SCHEDULED_STATUSES: readonly TaskStatus[] = ['PENDING_ACCEPT', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];

/** 기사가 아직 시작하지 않아 배정을 바꾸거나 풀 수 있는 상태(배정됨·작업전) */
export const UNSTARTED_ASSIGNED_STATUSES: readonly TaskStatus[] = ['PENDING_ACCEPT', 'ACCEPTED'];

/** 기사·날짜·시작 시각·소요 시간이 모두 있으면 true. createTask·updateTask 상태 규칙의 기준 */
export function hasFullAssignment(task: AssignmentFields): boolean {
  return Boolean(task.technicianId && task.date && task.startTime && task.durationMinutes);
}

/** 격자(타임테이블)·진행 보드에 놓이는 상태인지 */
export function isScheduledStatus(status: TaskStatus): boolean {
  return SCHEDULED_STATUSES.includes(status);
}

/** 작업 종료 예정 시각 'HH:mm'. 시작 시각·소요 시간이 없으면 null */
export function getTaskEndTime(task: Pick<Task, 'startTime' | 'durationMinutes'>): HourMinute | null {
  if (!task.startTime || task.durationMinutes == null) return null;
  return minutesToHm(hmToMinutes(task.startTime) + task.durationMinutes);
}

/** 작업 시작 시각(epoch ms). 날짜·시작 시각이 없으면 null */
export function getTaskStartMs(task: Pick<Task, 'date' | 'startTime'>): number | null {
  if (!task.date || !task.startTime) return null;
  return dateTimeToMs(task.date, task.startTime);
}

/** 작업 종료 예정 시각(epoch ms). 날짜·시작 시각·소요 시간이 없으면 null */
export function getTaskEndMs(task: Pick<Task, 'date' | 'startTime' | 'durationMinutes'>): number | null {
  const start = getTaskStartMs(task);
  if (start == null || task.durationMinutes == null) return null;
  return start + task.durationMinutes * 60000;
}

/**
 * '보고 미제출' 상태인지: 작업중(IN_PROGRESS)인데 종료 예정 시각이 지났고 완료 보고가 없다.
 * 작업 상세의 '종료 예정 시각이 지났는데 보고가 없어요'·'기사에게 요청 보내기' 표시 기준.
 */
export function isReportOverdue(task: Task, now: number = clockNow()): boolean {
  if (task.status !== 'IN_PROGRESS' || task.report) return false;
  const end = getTaskEndMs(task);
  return end != null && end < now;
}

/** 배정 가능한 기사인지(기사 + 활성). 비활성 기사는 배정·타임테이블 대상에서 빠진다. */
export function isAssignableTechnician(member: Member): boolean {
  return member.kind === 'TECHNICIAN' && member.status === 'ACTIVE';
}

/** 두 시간 구간[start, end)이 겹치는지(분 단위) */
export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}
