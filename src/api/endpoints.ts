/**
 * 백엔드 API 목록. 경로·쿼리·본문은 서버 OpenAPI(`/docs-json`) 그대로이며, 화면별 사용처는 저장소 루트의
 * api-integration-guide.html에 정리했다. 여기서는 형식만 맞추고 화면 도메인 변환은 src/data/mappers.ts가 한다.
 */
import { http, requestBlob } from '@/api/http';
import type {
  AccountDto,
  BacklogSummaryDto,
  CategoryDto,
  CreatedOrganizationDto,
  CreatedWorkDto,
  CreateWorkBody,
  DecisionResultDto,
  IndustryCode,
  MembershipDto,
  NotificationPageDto,
  OrganizationDto,
  ParticipantsDto,
  ParticipationType,
  PendingRequestDto,
  ProfileDto,
  ProgressBoardDto,
  ScheduleChangeDto,
  TimetableDto,
  WithdrawalEligibilityDto,
  WorkDetailDto,
  WorkPageDto,
  WorkStatus,
  WorkTypeDto,
  CancelReasonCode,
} from '@/api/types';

const org = (organizationId: number) => `/organizations/${organizationId}`;

/** 직원 유형·기사 유형 경로 조각 */
export type MemberCategoryPath = 'staff-categories' | 'technician-categories';

export const authApi = {
  me: () => http.get<AccountDto>('/auth/me'),
  logout: () => http.post<void>('/auth/logout'),
};

export const profileApi = {
  get: (accountId: number) => http.get<ProfileDto>(`/profiles/${accountId}`),
  save: (accountId: number, body: { name: string; phoneNumber: string }) =>
    http.put<ProfileDto>(`/profiles/${accountId}`, body),
  agreeToTerms: (accountId: number, body: { serviceTerms: boolean; privacyPolicy: boolean; marketing?: boolean }) =>
    http.post<ProfileDto>(`/profiles/${accountId}/terms-agreements`, body),
  withdrawalEligibility: (accountId: number) =>
    http.get<WithdrawalEligibilityDto>(`/profiles/${accountId}/withdrawal-eligibility`),
  withdraw: (accountId: number, reason: string) =>
    http.post<void>(`/profiles/${accountId}/withdrawals`, reason ? { reason } : {}),
};

export const organizationApi = {
  myMemberships: () => http.get<{ memberships: MembershipDto[] }>('/memberships'),
  create: (body: { name: string; industry: IndustryCode }) => http.post<CreatedOrganizationDto>('/organizations', body),
  get: (organizationId: number) => http.get<OrganizationDto>(org(organizationId)),
  update: (organizationId: number, body: { name: string; industry: IndustryCode }) =>
    http.put<OrganizationDto>(org(organizationId), body),
  companyCode: (organizationId: number) => http.get<{ companyCode: string }>(`${org(organizationId)}/company-code`),
  changeCompanyCode: (organizationId: number) =>
    http.post<{ companyCode: string }>(`${org(organizationId)}/company-code`),

  participants: (organizationId: number) => http.get<ParticipantsDto>(`${org(organizationId)}/participants`),
  designateOwner: (organizationId: number, membershipId: number) =>
    http.put<void>(`${org(organizationId)}/owners/${membershipId}`),
  revokeOwner: (organizationId: number, membershipId: number) =>
    http.delete<void>(`${org(organizationId)}/owners/${membershipId}`),
  assignStaffCategory: (organizationId: number, membershipId: number, categoryId: number | null) =>
    http.put<void>(`${org(organizationId)}/staff-memberships/${membershipId}/category`, { categoryId }),
  assignTechnicianCategory: (organizationId: number, technicianId: number, categoryId: number | null) =>
    http.put<void>(`${org(organizationId)}/technicians/${technicianId}/category`, { categoryId }),

  pendingRequests: (organizationId: number) =>
    http.get<{ count: number; requests: PendingRequestDto[] }>(`${org(organizationId)}/participation-requests`),
  approveRequests: (organizationId: number, approvals: { requestId: number; confirmedType: ParticipationType }[]) =>
    http.post<{ results: DecisionResultDto[] }>(`${org(organizationId)}/participation-requests/approvals`, { approvals }),
  rejectRequests: (organizationId: number, requestIds: number[], reason: string) =>
    http.post<{ results: DecisionResultDto[] }>(`${org(organizationId)}/participation-requests/rejections`, {
      requestIds,
      reason: reason || undefined,
    }),

  categories: (organizationId: number, path: MemberCategoryPath) =>
    http.get<{ categories: CategoryDto[] }>(`${org(organizationId)}/${path}`),
  createCategory: (organizationId: number, path: MemberCategoryPath, body: { name: string; color: string }) =>
    http.post<CategoryDto>(`${org(organizationId)}/${path}`, body),
  updateCategory: (
    organizationId: number,
    path: MemberCategoryPath,
    categoryId: number,
    body: { name: string; color: string },
  ) => http.put<CategoryDto>(`${org(organizationId)}/${path}/${categoryId}`, body),
  deleteCategory: (organizationId: number, path: MemberCategoryPath, categoryId: number) =>
    http.delete<void>(`${org(organizationId)}/${path}/${categoryId}`),

  workTypes: (organizationId: number) => http.get<{ workTypes: WorkTypeDto[] }>(`${org(organizationId)}/work-types`),
  createWorkType: (organizationId: number, body: { name: string; color: string }) =>
    http.post<WorkTypeDto>(`${org(organizationId)}/work-types`, body),
  updateWorkType: (organizationId: number, workTypeId: number, body: { name: string; color: string }) =>
    http.put<WorkTypeDto>(`${org(organizationId)}/work-types/${workTypeId}`, body),
  deleteWorkType: (organizationId: number, workTypeId: number) =>
    http.delete<void>(`${org(organizationId)}/work-types/${workTypeId}`),
};

export interface WorkSearchQuery {
  statuses?: readonly WorkStatus[];
  technicianId?: number;
  workTypeId?: number;
  registrarId?: number;
  /** 예정 시작 구간 [startFrom, startTo), UTC ISO. 둘을 함께 보낸다 */
  startFrom?: string;
  startTo?: string;
  returnedByRejectionOnly?: boolean;
  sort?: 'REGISTERED_DESC' | 'REGISTERED_ASC' | 'START_TIME_ASC' | 'LAST_MODIFIED_DESC';
  page?: number;
  size?: number;
}

export const scheduleApi = {
  searchWorks: (organizationId: number, query: WorkSearchQuery) =>
    http.get<WorkPageDto>(`${org(organizationId)}/works`, { query: { ...query } }),
  /** 작업내역 출력(xlsx). 조건은 작업 목록 검색과 같다 */
  exportWorks: (organizationId: number, query: Omit<WorkSearchQuery, 'page' | 'size'>) =>
    requestBlob(`${org(organizationId)}/works/export`, { ...query, timeZone: 'Asia/Seoul' }),
  backlog: (organizationId: number, page: number, size: number) =>
    http.get<BacklogSummaryDto>(`${org(organizationId)}/works/backlog`, { query: { page, size } }),
  timetable: (organizationId: number, from: string, to: string) =>
    http.get<TimetableDto>(`${org(organizationId)}/timetable`, { query: { from, to } }),
  progressBoard: (organizationId: number, from: string, to: string) =>
    http.get<ProgressBoardDto>(`${org(organizationId)}/progress-board`, { query: { from, to } }),
  detail: (organizationId: number, workId: number) => http.get<WorkDetailDto>(`${org(organizationId)}/works/${workId}`),
  create: (organizationId: number, body: CreateWorkBody) => http.post<CreatedWorkDto>(`${org(organizationId)}/works`, body),
  changeAssignment: (
    organizationId: number,
    workId: number,
    body: {
      technicianId: number;
      startTime: string;
      expectedDurationMinutes: number;
      conflictConfirmed: boolean;
      expectedVersion: number;
    },
  ) => http.put<ScheduleChangeDto>(`${org(organizationId)}/works/${workId}/assignment`, body),
  cancel: (organizationId: number, workId: number, body: { reason: CancelReasonCode; note?: string }) =>
    http.post<void>(`${org(organizationId)}/works/${workId}/cancellation`, body),
  requestCompletionReport: (organizationId: number, workId: number) =>
    http.post<{ requestedAt: string }>(`${org(organizationId)}/works/${workId}/completion-report-requests`),
};

export const notificationApi = {
  list: (page: number, size: number) => http.get<NotificationPageDto>('/notifications', { query: { page, size } }),
  read: (notificationId: number) => http.put<void>(`/notifications/${notificationId}/read`),
};
