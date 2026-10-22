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
