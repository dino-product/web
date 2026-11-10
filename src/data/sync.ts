/**
 * 화면 동기화 훅. 화면이 처음 그려질 때와 데이터를 바꾼 뒤(AppState.revision), 보고 있는 날짜·작업이 바뀔 때
 * 그 화면이 쓰는 API를 다시 읽어 스토어에 채운다. 화면은 그대로 셀렉터(src/data/selectors.ts)로 읽는다.
 * 화면별 API 목록은 저장소 루트 api-integration-guide.html.
 */
import { useEffect } from 'react';

import { useAppStore } from '@/data/store';
import type { ID, IsoDate } from '@/data/types';

/** 로그인 상태이고 현재 발주사가 있을 때만 읽는다. 발주사를 바꾸면 다시 읽는다. */
function useSyncKey(): string | null {
  const loggedIn = useAppStore((s) => s.session.loggedIn);
  const companyId = useAppStore((s) => s.session.currentCompanyId);
  const revision = useAppStore((s) => s.revision);
  return loggedIn && companyId ? `${companyId}:${revision}` : null;
}

/** 타임테이블: GET /organizations/{id}/timetable(보는 날짜) */
export function useTimetableSync(date: IsoDate): void {
  const key = useSyncKey();
  useEffect(() => {
    if (key) void useAppStore.getState().loadTimetable(date);
  }, [key, date]);
}

/** 진행 보드: GET /organizations/{id}/progress-board(오늘) */
export function useBoardSync(date: IsoDate): void {
  const key = useSyncKey();
  useEffect(() => {
    if (key) void useAppStore.getState().loadBoard(date);
  }, [key, date]);
}

/** 작업 목록: GET /organizations/{id}/works(전체 쪽) + GET /works/backlog */
export function useTaskListSync(): void {
  const key = useSyncKey();
  useEffect(() => {
    if (key) void useAppStore.getState().loadTaskList();
  }, [key]);
}

/** 작업 상세 모달·알림 상세: GET /organizations/{id}/works/{workId} */
export function useTaskDetailSync(taskId: ID | null | undefined): void {
  const key = useSyncKey();
  useEffect(() => {
    if (key && taskId) void useAppStore.getState().loadTaskDetail(taskId);
  }, [key, taskId]);
}

/** 기사 작업이력: 관련 작업의 상세(배정 이력) */
export function useTechnicianHistorySync(memberId: ID): void {
  const key = useSyncKey();
  const taskCount = useAppStore((s) => s.tasks.length);
  useEffect(() => {
    if (key && taskCount) void useAppStore.getState().loadTechnicianHistory(memberId);
  }, [key, memberId, taskCount]);
}

/** 알림창: GET /notifications(전체 쪽) */
export function useNotificationsSync(): void {
  const key = useSyncKey();
  useEffect(() => {
    if (key) void useAppStore.getState().loadNotifications();
  }, [key]);
}

/** 조직 설정: 발주사 정보·회사 코드·참여 인원·승인 대기·유형 목록 */
export function useOrganizationSync(): void {
  const key = useSyncKey();
  useEffect(() => {
    if (key) void useAppStore.getState().loadOrganization();
  }, [key]);
}

/** 계정 탈퇴: GET /profiles/{accountId}/withdrawal-eligibility */
export function useWithdrawalEligibilitySync(): void {
  const key = useSyncKey();
  useEffect(() => {
    if (key) void useAppStore.getState().loadWithdrawalEligibility();
  }, [key]);
}
