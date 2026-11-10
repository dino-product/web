/**
 * 백엔드 응답·요청 본문 타입. 원본은 서버 OpenAPI(`GET /docs-json`)이며 화면이 쓰는 필드만 옮겼다.
 * 시각은 모두 ISO-8601 UTC 문자열, 식별자는 숫자다. 화면 도메인 타입(src/data/types.ts)으로는 src/data/mappers.ts가 바꾼다.
 */

// ── auth·profile ────────────────────────────────────────────────────

export interface AccountDto {
  accountId: number;
  registeredAt: string;
  accessTokenExpiresAt: string;
}

/** 로그인 결과(웹 로그인 교환 응답). registered는 이번 로그인으로 계정이 처음 만들어졌는지 */
export interface LoginDto {
  accountId: number;
  registered: boolean;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

/** POST /auth/refresh 응답. 보낸 refresh token은 더 쓸 수 없어 refreshToken으로 바꿔 둔다 */
export interface RefreshedTokensDto {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

/** GET /terms 한 줄. SERVICE 이용약관, PRIVACY 개인정보 수집·이용, MARKETING 마케팅 수신, PRIVACY_POLICY 개인정보처리방침 */
export interface TermsDocumentDto {
  type: 'SERVICE' | 'PRIVACY' | 'MARKETING' | 'PRIVACY_POLICY';
  version: string;
  /** 본문 주소(UTF-8 텍스트) */
  url: string;
}

export type SignupStep = 'PROFILE' | 'TERMS' | 'COMPLETED';

export interface ProfileDto {
  accountId: number;
  status: 'PENDING_SIGNUP' | 'ACTIVE';
  nextStep: SignupStep;
  name: string | null;
  phoneNumber: string | null;
  signedUpAt: string | null;
  marketingAgreed: boolean | null;
}

export interface WithdrawalEligibilityDto {
  withdrawable: boolean;
  blocks: { reason: 'SOLE_OWNER' | 'WORK_IN_PROGRESS' | 'WORK_PENDING_ACCEPT'; count: number }[];
}

// ── organization ────────────────────────────────────────────────────

export type IndustryCode =
  | 'HVAC'
  | 'ELECTRICAL_ELECTRONICS'
  | 'PLUMBING'
  | 'APPLIANCE_SERVICE'
  | 'FACILITY_MANAGEMENT'
  | 'OTHER';

export type MembershipRole = 'OWNER' | 'STAFF' | 'TECHNICIAN';
export type MemberStatusDto = 'ACTIVE' | 'DEACTIVATED';

export interface MembershipDto {
  organizationId: number;
  organizationName: string;
  role: MembershipRole;
  status: MemberStatusDto;
}

export interface OrganizationDto {
  organizationId: number;
  name: string;
  industry: IndustryCode;
}

export interface CreatedOrganizationDto {
  organizationId: number;
  companyCode: string;
}

export interface CategoryDto {
  categoryId: number;
  name: string;
  color: string;
}

export interface WorkTypeDto {
  workTypeId: number;
  name: string;
  color: string;
}

export interface ParticipantDto {
  /** 직원이면 직원 소속 ID, 기사면 기사 계약 ID */
  memberId: number;
  accountId: number;
  name: string;
  role: MembershipRole;
  category: CategoryDto | null;
  status: MemberStatusDto;
  joinedAt: string;
}

export interface ParticipantsDto {
  counts: { all: number; staff: number; technician: number };
  participants: ParticipantDto[];
}

export type ParticipationType = 'STAFF' | 'TECHNICIAN';

/** 역할 변경 결과(POST …/staff-memberships/{id}/role-change, …/technicians/{id}/role-change) */
export interface ParticipantRoleChangeDto {
  /** 바뀐 뒤 역할 */
  role: ParticipationType;
  /** 바뀐 뒤 역할의 식별자. STAFF면 직원 소속, TECHNICIAN이면 기사 계약 ID(참여 인원 memberId) */
  memberId: number;
  /** 기사를 직원으로 바꾸며 대기함으로 돌린 작업 ID. 없으면 빈 목록 */
  releasedWorkIds: number[];
}

export type RequestChannel = 'COMPANY_CODE' | 'JOIN_LINK' | 'QR_CODE';

export interface PendingRequestDto {
  requestId: number;
  accountId: number;
  applicantName: string;
  desiredType: ParticipationType;
  requestChannel: RequestChannel;
  requestedAt: string;
}

export interface DecisionResultDto {
  requestId: number;
  outcome: 'APPROVED' | 'REJECTED' | 'NOT_FOUND' | 'NOT_PENDING' | 'ALREADY_MEMBER';
}

// ── schedule ────────────────────────────────────────────────────────

export type WorkStatus = 'REGISTERED' | 'PENDING_ACCEPT' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
export type PaymentMethodCode = 'ON_SITE_CARD' | 'ON_SITE_CASH' | 'BANK_TRANSFER' | 'INVOICE';
export type CancelReasonCode = 'CUSTOMER_REQUEST' | 'TECHNICIAN_ISSUE' | 'DUPLICATE_REGISTRATION' | 'OTHER';
export type RejectionReasonCode = 'SCHEDULE_CONFLICT' | 'ALREADY_ASSIGNED' | 'LOCATION_TOO_FAR' | 'SCOPE_MISMATCH' | 'OTHER';

export interface LabelDto {
  id: number;
  name: string | null;
  color: string | null;
}

export interface TechnicianRefDto {
  technicianId: number;
  name: string | null;
  technicianType: LabelDto | null;
}

export interface RegistrarDto {
  membershipId: number;
  name: string | null;
  owner: boolean;
  staffType: LabelDto | null;
}

export interface WorkSummaryDto {
  workId: number;
  name: string;
  status: WorkStatus;
  technician: TechnicianRefDto | null;
  startTime: string | null;
  endTime: string | null;
  customerName: string | null;
  workType: LabelDto | null;
  registrar: RegistrarDto | null;
  registeredAt: string;
  lastModifiedAt: string;
  delayed: boolean;
  returnedByRejection: boolean;
}

export interface WorkPageDto {
  works: WorkSummaryDto[];
  totalCount: number;
  page: number;
  size: number;
}

export interface BacklogWorkDto {
  workId: number;
  name: string;
  workType: LabelDto | null;
  registrar: RegistrarDto | null;
  registeredAt: string;
  plannedTechnician: TechnicianRefDto | null;
  plannedStartTime: string | null;
  plannedExpectedDurationMinutes: number | null;
  technicianMissing: boolean;
  timeMissing: boolean;
  returnedByRejection: boolean;
  rejectionReason: RejectionReasonCode | null;
  rejectionNote: string | null;
  stale?: boolean;
  version?: number;
}

export interface BacklogSummaryDto {
  totalCount: number;
  registeredCount: number;
  rejectedCount: number;
  works: BacklogWorkDto[];
}

export interface ScheduledWorkDto {
  workId: number;
  name: string;
  status: WorkStatus;
  technician: TechnicianRefDto | null;
  startTime: string;
  endTime: string;
  delayed: boolean;
  conflicting: boolean;
  workType: LabelDto | null;
  registrar: RegistrarDto | null;
  version: number;
}

export interface TimetableDto {
  technicians: TechnicianRefDto[];
  scheduledWorks: ScheduledWorkDto[];
  backlog: BacklogWorkDto[];
}

export interface BoardCardDto {
  workId: number;
  name: string;
  technician: TechnicianRefDto | null;
  startTime: string | null;
  endTime: string | null;
  customerName: string | null;
  delayed: boolean;
  returnedByRejection: boolean;
}

export interface ProgressBoardDto {
  columns: { status: WorkStatus; cards: BoardCardDto[] }[];
  summary: { total: number; inProgress: number; delayed: number; completed: number };
}

export interface ScheduleDto {
  technician: TechnicianRefDto | null;
  startTime: string | null;
  expectedDurationMinutes: number | null;
  endTime?: string | null;
}

export interface AssignmentDto {
  assignmentNumber: number;
  schedule: ScheduleDto;
  assignedAt: string;
  assignedBy: number | null;
  result: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  decidedAt: string | null;
  rejectionReason: RejectionReasonCode | null;
  rejectionNote: string | null;
  endReason: 'REASSIGNED' | 'RESCHEDULED' | 'UNASSIGNED' | 'CANCELLED' | 'ACCOUNT_WITHDRAWN' | null;
  endedAt: string | null;
  endedBy: number | null;
}

export interface PhotoDto {
  photoId: string;
  url: string;
}

export interface CustomerDto {
  name: string | null;
  phone: string | null;
  postalCode: string | null;
  address: string | null;
  addressDetail: string | null;
}

export interface WorkDetailDto {
  workId: number;
  name: string;
  status: WorkStatus;
  delayed: boolean;
  workType: LabelDto | null;
  registrar: RegistrarDto | null;
  registeredAt: string;
  customer: CustomerDto | null;
  payment: { fee: number | null; method: PaymentMethodCode | null } | null;
  schedule: ScheduleDto | null;
  plannedSchedule: ScheduleDto | null;
  assignments: AssignmentDto[];
  startedAt: string | null;
  completedAt: string | null;
  cancellation: { cancelledAt: string; cancelledBy: number | null; reason: CancelReasonCode; note: string | null } | null;
  completionReport: {
    beforePhotos: PhotoDto[];
    afterPhotos: PhotoDto[];
    usedParts: string | null;
    workNote: string | null;
    actualFee: number | null;
    actualPaymentMethod: string | null;
  } | null;
  sitePhotos: PhotoDto[];
  completionReportRequests: { requestedAt: string; requestedBy: number | null }[];
  completionReportRequestable: boolean;
  version: number;
}

export interface ScheduleChangeDto {
  applied: boolean;
  conflicts: { workId: number; name: string; startTime: string; endTime: string }[];
}

export interface CreatedWorkDto extends ScheduleChangeDto {
  workId: number | null;
}

export interface WorkBody {
  name: string;
  workTypeId?: number | null;
  customer?: { name?: string; phone?: string; postalCode?: string; address?: string; addressDetail?: string } | null;
  payment?: { fee?: number | null; method?: PaymentMethodCode | null } | null;
  sitePhotoIds?: string[];
}

export interface CreateWorkBody extends WorkBody {
  schedule?: {
    technicianId: number | null;
    startTime: string | null;
    expectedDurationMinutes: number | null;
    conflictConfirmed?: boolean;
  };
}

/** POST /site-photo-uploads 응답. uploadUrl로 사진 바이트를 PUT한 뒤 fileId를 sitePhotoIds에 넣는다 */
export interface PhotoUploadDto {
  fileId: string;
  uploadUrl: string;
  /** 업로드 요청에 그대로 붙일 서명된 헤더(content-type·content-length) */
  requiredHeaders: Record<string, string>;
  expiresAt: string;
}

/** 기사 작업 이력의 상태 조건(작업 상태가 아니라 그 기사 기준 결과) */
export type WorkHistoryStatus = 'COMPLETED' | 'REJECTED';

/** GET /work-history 응답 */
export interface WorkHistoryDto {
  technicianId: number;
  /** 구간과 그 기사의 배정 일정이 겹친 작업. 마지막 배정 시작 시각 내림차순 */
  works: {
    workId: number;
    name: string;
    status: WorkStatus;
    /** 이 배정이 작업의 마지막 배정이고 일정이 남아 있는지 */
    current: boolean;
    assignmentNumber: number;
    startTime: string;
    endTime: string;
    result: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
    endReason: AssignmentDto['endReason'];
    workType: LabelDto | null;
    /** 실제 시작·완료 시각. 그 기사가 지금 담당인 채 완료한 작업만 */
    startedAt: string | null;
    completedAt: string | null;
  }[];
  /** 구간의 집계(배정 시작 시각이 구간 안인 것만). 목록 조건(statuses·workTypeIds)과 관계없다 */
  statistics: { assigned: number; completed: number; rejected: number; cancelled: number };
  /** 구간과 관계없이 지금 담당인 채 완료한 작업 수(누적 완료) */
  totalCompleted: number;
}

// ── notification ────────────────────────────────────────────────────

export type NotificationTypeDto =
  | 'WORK_ASSIGNED'
  | 'WORK_RESCHEDULED'
  | 'WORK_REASSIGNED_AWAY'
  | 'WORK_CANCELED'
  | 'COMPLETION_REPORT_REQUESTED'
  | 'WORK_ACCEPTED'
  | 'WORK_REJECTED'
  | 'COMPLETION_REPORT_SUBMITTED';

export interface NotificationDto {
  id: number;
  type: NotificationTypeDto;
  organizationId: number;
  workId: number | null;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationPageDto {
  notifications: NotificationDto[];
  totalCount: number;
  page: number;
  size: number;
}
