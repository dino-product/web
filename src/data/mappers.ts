/**
 * 서버 DTO(src/api/types.ts) ↔ 화면 도메인 타입(src/data/types.ts) 변환.
 *
 * - ID: 화면 ID는 문자열이다. 직원 소속·기사 계약·유형은 서버 테이블이 달라 숫자가 겹칠 수 있으므로 접두어를 붙인다
 *   (직원 's12', 기사 't7', 직원 유형 'st3', 기사 유형 'tt3', 작업 유형 'wt3'). 작업·발주사·알림·참여 요청은 숫자 그대로다.
 * - 시각: 서버는 UTC ISO, 화면은 '+09:00' ISO·'YYYY-MM-DD'·'HH:mm'(Asia/Seoul)이다.
 * - 이름: local 프로필의 schedule 응답은 기사·등록자·작업유형 이름을 비워 보낸다(서버 임시 어댑터). 화면은 ID로 인력·유형 목록을 찾아
 *   이름을 그리므로 응답의 이름은 쓰지 않는다.
 */
import type {
  AssignmentDto,
  BacklogWorkDto,
  BoardCardDto,
  CancelReasonCode,
  CategoryDto,
  IndustryCode,
  LabelDto,
  NotificationDto,
  NotificationTypeDto,
  ParticipantDto,
  PaymentMethodCode,
  PhotoDto,
  PendingRequestDto,
  RejectionReasonCode,
  RequestChannel,
  ScheduledWorkDto,
  WorkDetailDto,
  WorkStatus,
  WorkSummaryDto,
  WorkTypeDto,
} from '@/api/types';
import { dateTimeToMs, toHourMinute, toIsoDate, toIsoDateTime } from '@/lib/date';
import { joinReportContent } from '@/lib/format';
import { CANCEL_REASONS, HISTORY_LABEL, INDUSTRIES, PAYMENT_METHODS } from '@/data/constants';
import type {
  AppNotification,
  HourMinute,
  ID,
  IsoDate,
  IsoDateTime,
  JoinChannel,
  JoinRequest,
  Member,
  NotificationType,
  Task,
  TaskHistoryEntry,
  TypeCategory,
  TypeColor,
  TypeItem,
} from '@/data/types';

// ── ID ─────────────────────────────────────────────────────────────

export const ID_PREFIX = {
  staff: 's',
  technician: 't',
  staffType: 'st',
  technicianType: 'tt',
  workType: 'wt',
  plain: '',
} as const;
export type IdPrefix = (typeof ID_PREFIX)[keyof typeof ID_PREFIX];

export function toId(prefix: IdPrefix, id: number): ID {
  return `${prefix}${id}`;
}

/** 화면 ID에서 서버 숫자 ID를 꺼낸다. 접두어가 다르면 null */
export function fromId(id: ID | null | undefined, prefix: IdPrefix): number | null {
  if (!id) return null;
  const match = /^([a-z]*)(\d+)$/.exec(id);
  if (!match || match[1] !== prefix) return null;
  return Number(match[2]);
}

const TYPE_PREFIX: Record<TypeCategory, IdPrefix> = {
  EMPLOYEE: ID_PREFIX.staffType,
  TECHNICIAN: ID_PREFIX.technicianType,
  WORK: ID_PREFIX.workType,
};

export function typeCategoryOf(typeId: ID): TypeCategory | null {
  if (fromId(typeId, ID_PREFIX.workType) != null) return 'WORK';
  if (fromId(typeId, ID_PREFIX.staffType) != null) return 'EMPLOYEE';
  if (fromId(typeId, ID_PREFIX.technicianType) != null) return 'TECHNICIAN';
  return null;
}

export function typeIdNumber(typeId: ID | null | undefined): number | null {
  const category = typeId ? typeCategoryOf(typeId) : null;
  return category ? fromId(typeId, TYPE_PREFIX[category]) : null;
}

// ── 코드 ↔ 화면 문구 ───────────────────────────────────────────────

/** 업종. 화면 선택지(INDUSTRIES)와 서버 코드의 짝 */
const INDUSTRY_LABEL: Record<IndustryCode, (typeof INDUSTRIES)[number]> = {
  ELECTRICAL_ELECTRONICS: '전기·전자',
  HVAC: '냉난방 설비',
  PLUMBING: '배관·설비',
  APPLIANCE_SERVICE: '가전 A/S',
  FACILITY_MANAGEMENT: '종합 시설관리',
  OTHER: '기타',
};

export const industryLabel = (code: IndustryCode): string => INDUSTRY_LABEL[code];

export function industryCode(label: string): IndustryCode {
  const entry = Object.entries(INDUSTRY_LABEL).find(([, value]) => value === label);
  return (entry?.[0] as IndustryCode | undefined) ?? 'OTHER';
}

/** 결제 방식. 화면 선택지 3종(PAYMENT_METHODS)과 서버 코드의 짝. INVOICE는 화면 선택지에 없어 표시만 한다. */
const PAYMENT_LABEL: Record<PaymentMethodCode, string> = {
  ON_SITE_CASH: PAYMENT_METHODS[0],
  BANK_TRANSFER: PAYMENT_METHODS[1],
  ON_SITE_CARD: PAYMENT_METHODS[2],
  INVOICE: '세금계산서',
};

export function paymentCode(label: string | null): PaymentMethodCode | null {
  const entry = Object.entries(PAYMENT_LABEL).find(([, value]) => value === label);
  return (entry?.[0] as PaymentMethodCode | undefined) ?? null;
}

/** 작업 취소 사유. 화면 선택지(CANCEL_REASONS) 순서와 같다. */
const CANCEL_CODES: readonly CancelReasonCode[] = ['CUSTOMER_REQUEST', 'TECHNICIAN_ISSUE', 'DUPLICATE_REGISTRATION', 'OTHER'];

export function cancelReasonCode(label: string): CancelReasonCode {
  const index = CANCEL_REASONS.indexOf(label as (typeof CANCEL_REASONS)[number]);
  return CANCEL_CODES[index] ?? 'OTHER';
}

/** 거절 사유. 서버 알림 문구(NotificationMessage.REJECTION_REASONS)와 같은 표현을 쓴다. 기타는 기사 메모 */
const REJECTION_LABEL: Record<Exclude<RejectionReasonCode, 'OTHER'>, string> = {
  SCHEDULE_CONFLICT: '일정이 맞지 않습니다',
  ALREADY_ASSIGNED: '이미 다른 작업이 있습니다',
  LOCATION_TOO_FAR: '작업 위치가 너무 멉니다',
  SCOPE_MISMATCH: '작업 내용이 맞지 않습니다',
};

function rejectionLabel(code: RejectionReasonCode | null, note: string | null): string {
  if (code && code !== 'OTHER') return REJECTION_LABEL[code];
  return note?.trim() || '기타';
}

const CHANNEL: Record<RequestChannel, JoinChannel> = { COMPANY_CODE: 'CODE', JOIN_LINK: 'LINK', QR_CODE: 'QR' };

/**
 * 유형 색상. 서버 프리셋 8색(CategoryColor.PRESETS)과 화면 Type Color 8종의 짝.
 * 서버에 갈색·회색이 없어 가장 가까운 주황(#F97316)·청록(#14B8A6)에 묶었다.
 */
const TYPE_COLOR_HEX: Record<TypeColor, string> = {
  RED: '#EF4444',
  BROWN: '#F97316',
  YELLOW: '#EAB308',
  GREEN: '#22C55E',
  GRAY: '#14B8A6',
  BLUE: '#3B82F6',
  PURPLE: '#8B5CF6',
  PINK: '#EC4899',
};

/** 직원·기사 유형은 화면에서 색을 쓰지 않지만 서버가 색상을 필수로 받아 고정값을 보낸다. */
export const MEMBER_CATEGORY_COLOR = TYPE_COLOR_HEX.BLUE;

export const typeColorHex = (color: TypeColor | null): string => (color ? TYPE_COLOR_HEX[color] : MEMBER_CATEGORY_COLOR);

function typeColorOf(hex: string | null): TypeColor | null {
  if (!hex) return null;
  const entry = Object.entries(TYPE_COLOR_HEX).find(([, value]) => value === hex.toUpperCase());
  return (entry?.[0] as TypeColor | undefined) ?? 'GRAY';
}

const NOTIFICATION_TYPE: Partial<Record<NotificationTypeDto, NotificationType>> = {
  WORK_ASSIGNED: 'ASSIGNED',
  WORK_RESCHEDULED: 'SCHEDULE_CHANGED',
  WORK_CANCELED: 'CANCELED',
  WORK_ACCEPTED: 'ACCEPTED',
  WORK_REJECTED: 'REJECTED',
  COMPLETION_REPORT_SUBMITTED: 'REPORTED',
};

// ── 시각 ───────────────────────────────────────────────────────────

/** 서버 UTC 시각 → 화면 '+09:00' ISO. 없으면 null */
export function toKstIso(value: string | null | undefined): IsoDateTime | null {
  return value ? toIsoDateTime(value) : null;
}

/** 화면 날짜·시각(Asia/Seoul) → 서버 UTC ISO */
export function toUtcIso(date: IsoDate, time: HourMinute): string {
  return new Date(dateTimeToMs(date, time)).toISOString();
}

/** Asia/Seoul 하루를 서버 구간 [from, to)로 */
export function dayRange(date: IsoDate): { from: string; to: string } {
  const start = dateTimeToMs(date, '00:00');
  return { from: new Date(start).toISOString(), to: new Date(start + 24 * 60 * 60 * 1000).toISOString() };
}

type ScheduleFields = Pick<Task, 'date' | 'startTime' | 'durationMinutes'>;

function scheduleFields(start: string | null | undefined, durationMinutes: number | null | undefined): ScheduleFields {
  return {
    date: start ? toIsoDate(start) : null,
    startTime: start ? toHourMinute(start) : null,
    durationMinutes: durationMinutes ?? null,
  };
}

function minutesBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  return Math.round((Date.parse(end) - Date.parse(start)) / 60000);
}

// ── 인력·유형·발주사 ────────────────────────────────────────────────

export function memberFromParticipant(p: ParticipantDto): Member {
  const technician = p.role === 'TECHNICIAN';
  return {
    id: toId(technician ? ID_PREFIX.technician : ID_PREFIX.staff, p.memberId),
    name: p.name ?? '',
    // 참여 인원 API는 연락처를 주지 않는다(로그인 사용자만 프로필 API로 채운다).
    phone: '',
    kind: technician ? 'TECHNICIAN' : 'EMPLOYEE',
    typeId: p.category
      ? toId(technician ? ID_PREFIX.technicianType : ID_PREFIX.staffType, p.category.categoryId)
      : null,
    isOwner: p.role === 'OWNER',
    status: p.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    joinedAt: toIsoDateTime(p.joinedAt),
    avatarUrl: null,
  };
}

/**
 * 서버 유형 목록 → TypeItem. 서버는 만든 순서대로 주고 생성 시각을 주지 않으므로 순서를 createdAt으로 옮긴다.
 * 서버에 활성·비활성 구분이 없어 모두 활성이다(비활성화는 화면 안에서만 반영, store.ts setTypeActive).
 */
export function typesFromCategories(category: TypeCategory, items: (CategoryDto | WorkTypeDto)[]): TypeItem[] {
  return items.map((item, index) => ({
    id: toId(TYPE_PREFIX[category], 'workTypeId' in item ? item.workTypeId : item.categoryId),
    category,
    name: item.name,
    color: category === 'WORK' ? typeColorOf(item.color) : null,
    active: true,
    createdAt: toIsoDateTime(index * 1000),
  }));
}

export function joinRequestFromDto(r: PendingRequestDto): JoinRequest {
  const kind = r.desiredType === 'TECHNICIAN' ? 'TECHNICIAN' : 'EMPLOYEE';
  return {
    id: toId(ID_PREFIX.plain, r.requestId),
    name: r.applicantName ?? '',
    // 승인 대기 API는 신청자 연락처를 주지 않는다.
    phone: '',
    desiredKind: kind,
    confirmedKind: kind,
    requestedAt: toIsoDateTime(r.requestedAt),
    channel: CHANNEL[r.requestChannel],
  };
}

export function notificationFromDto(n: NotificationDto): AppNotification | null {
  const type = NOTIFICATION_TYPE[n.type];
  if (!type) return null;
  return {
    id: toId(ID_PREFIX.plain, n.id),
    type,
    taskId: n.workId == null ? null : toId(ID_PREFIX.plain, n.workId),
    message: n.message,
    createdAt: toIsoDateTime(n.createdAt),
    read: n.read,
  };
}

// ── 작업 ───────────────────────────────────────────────────────────

/** 처음 보는 작업의 기본값. 목록 응답에 없는 필드는 상세 조회(taskFromDetail)가 채운다. */
export function emptyTask(id: ID): Task {
  return {
    id,
    title: '',
    workTypeId: null,
    status: 'REGISTERED',
    technicianId: null,
    date: null,
    startTime: null,
    durationMinutes: null,
    customer: null,
    price: null,
    paymentMethod: null,
    sitePhotoUrls: [],
    registrantId: '',
    createdAt: '',
    updatedAt: '',
    rejection: null,
    delayed: false,
    report: null,
    reportRequestedAt: null,
    attachments: [],
    history: [],
    cancellation: null,
  };
}

const workTypeId = (label: LabelDto | null): ID | null => (label ? toId(ID_PREFIX.workType, label.id) : null);
const technicianId = (id: number | null | undefined): ID | null => (id == null ? null : toId(ID_PREFIX.technician, id));
const staffId = (id: number | null | undefined): ID => (id == null ? '' : toId(ID_PREFIX.staff, id));

export interface TaskPatch {
  id: ID;
  fields: Partial<Task>;
  /** 배정 변경·해제에 보낼 작업 버전 */
  version?: number;
}

/** 작업 목록 검색(GET /works) 한 줄 */
export function taskFromSummary(w: WorkSummaryDto): TaskPatch {
  return {
    id: toId(ID_PREFIX.plain, w.workId),
    fields: {
      title: w.name,
      status: w.status,
      workTypeId: workTypeId(w.workType),
      technicianId: technicianId(w.technician?.technicianId),
      ...scheduleFields(w.startTime, minutesBetween(w.startTime, w.endTime)),
      registrantId: staffId(w.registrar?.membershipId),
      createdAt: toIsoDateTime(w.registeredAt),
      updatedAt: toIsoDateTime(w.lastModifiedAt),
      delayed: w.delayed,
    },
  };
}

/** 타임테이블 격자 칸 */
export function taskFromScheduled(w: ScheduledWorkDto): TaskPatch {
  return {
    id: toId(ID_PREFIX.plain, w.workId),
    version: w.version,
    fields: {
      title: w.name,
      status: w.status,
      workTypeId: workTypeId(w.workType),
      technicianId: technicianId(w.technician?.technicianId),
      ...scheduleFields(w.startTime, minutesBetween(w.startTime, w.endTime)),
      registrantId: staffId(w.registrar?.membershipId),
      delayed: w.delayed,
    },
  };
}

/**
 * 대기함 카드. 미리 입력한(또는 배정됐다 돌아온) 기사·일정은 서버의 technicianMissing·timeMissing 판단을 따른다.
 * 거절로 돌아온 작업은 거절 사유를 rejection으로 옮긴다(거절 시각·기사는 상세 조회가 채운다).
 */
export function taskFromBacklog(w: BacklogWorkDto, previous: Task | undefined): TaskPatch {
  const planned = scheduleFields(w.plannedStartTime, w.plannedExpectedDurationMinutes);
  return {
    id: toId(ID_PREFIX.plain, w.workId),
    version: w.version,
    fields: {
      title: w.name,
      status: 'REGISTERED',
      workTypeId: workTypeId(w.workType),
      technicianId: w.technicianMissing ? null : technicianId(w.plannedTechnician?.technicianId),
      ...(w.timeMissing ? { date: null, startTime: null, durationMinutes: null } : planned),
      registrantId: staffId(w.registrar?.membershipId),
      createdAt: toIsoDateTime(w.registeredAt),
      rejection: w.returnedByRejection
        ? {
            reason: rejectionLabel(w.rejectionReason, w.rejectionNote),
            at: previous?.rejection?.at ?? toIsoDateTime(w.registeredAt),
            technicianId: previous?.rejection?.technicianId ?? '',
          }
        : null,
    },
  };
}

/** 진행 보드 카드 */
export function taskFromBoardCard(card: BoardCardDto, status: WorkStatus, previous: Task | undefined): TaskPatch {
  return {
    id: toId(ID_PREFIX.plain, card.workId),
    fields: {
      title: card.name,
      status,
      technicianId: technicianId(card.technician?.technicianId),
      ...scheduleFields(card.startTime, minutesBetween(card.startTime, card.endTime)),
      customer: card.customerName
        ? { name: card.customerName, phone: '', zipCode: '', address: '', addressDetail: '', ...previous?.customer }
        : (previous?.customer ?? null),
      delayed: card.delayed,
    },
  };
}

/** 이름 찾기(이력 처리자). 직원 소속 ID·기사 계약 ID를 화면 인력으로 */
export type MemberLookup = (id: ID) => Member | undefined;

function staffName(lookup: MemberLookup, membershipId: number | null): string | null {
  return membershipId == null ? null : (lookup(staffId(membershipId))?.name ?? null);
}

function technicianActor(lookup: MemberLookup, assignment: AssignmentDto): string | null {
  const id = technicianId(assignment.schedule.technician?.technicianId);
  const name = id ? lookup(id)?.name : null;
  return name ? `${name} 기사` : null;
}

/**
 * 상태 변경 이력. 서버는 이력 표를 따로 주지 않고 등록·배정 이력·완료보고 요청·시작·완료·취소 시각을 주므로
 * 그 시각들로 화면 이력 문구(HISTORY_LABEL)를 오래된 순으로 만든다.
 */
function buildHistory(d: WorkDetailDto, lookup: MemberLookup): TaskHistoryEntry[] {
  const entries: TaskHistoryEntry[] = [
    { at: toIsoDateTime(d.registeredAt), label: HISTORY_LABEL.registered, actor: staffName(lookup, d.registrar?.membershipId ?? null) },
  ];
  const assignments = [...d.assignments].sort((a, b) => a.assignmentNumber - b.assignmentNumber);
  assignments.forEach((a, index) => {
    const rescheduled = assignments[index - 1]?.endReason === 'RESCHEDULED';
    entries.push({
      at: toIsoDateTime(a.assignedAt),
      label: rescheduled ? HISTORY_LABEL.rescheduled : HISTORY_LABEL.assigned,
      actor: staffName(lookup, a.assignedBy),
    });
    if (a.decidedAt && (a.result === 'ACCEPTED' || a.result === 'REJECTED')) {
      entries.push({
        at: toIsoDateTime(a.decidedAt),
        label: a.result === 'ACCEPTED' ? HISTORY_LABEL.accepted : HISTORY_LABEL.rejected,
        actor: technicianActor(lookup, a),
      });
    }
    if (a.endReason === 'UNASSIGNED' && a.endedAt) {
      entries.push({ at: toIsoDateTime(a.endedAt), label: HISTORY_LABEL.unassigned, actor: staffName(lookup, a.endedBy) });
    }
  });
  for (const r of d.completionReportRequests) {
    entries.push({ at: toIsoDateTime(r.requestedAt), label: HISTORY_LABEL.reportRequested, actor: staffName(lookup, r.requestedBy) });
  }
  const current = assignments.at(-1);
  if (d.startedAt) {
    entries.push({ at: toIsoDateTime(d.startedAt), label: HISTORY_LABEL.started, actor: current ? technicianActor(lookup, current) : null });
  }
  if (d.completedAt) {
    entries.push({ at: toIsoDateTime(d.completedAt), label: HISTORY_LABEL.reported, actor: current ? technicianActor(lookup, current) : null });
  }
  if (d.cancellation) {
    entries.push({
      at: toIsoDateTime(d.cancellation.cancelledAt),
      label: HISTORY_LABEL.canceled,
      actor: staffName(lookup, d.cancellation.cancelledBy),
    });
  }
  return entries.sort((a, b) => a.at.localeCompare(b.at));
}

const FAKE_PHOTO_SCHEME = 'fake-photo://';

/**
 * 사진 주소. local 프로필의 서버 임시 어댑터(FakePhotoUrlAdapter)는 저장된 주소 앞에 'fake-photo://'를 붙여 돌려주므로
 * 브라우저가 열 수 있게 떼어 낸다. 실제 저장소 어댑터가 붙으면 그대로 쓴다.
 */
function photoUrl(photo: PhotoDto): string {
  return photo.url.startsWith(FAKE_PHOTO_SCHEME) ? photo.url.slice(FAKE_PHOTO_SCHEME.length) : photo.url;
}

/** 작업 상세(GET /works/{id}) → 화면 작업 전체 */
export function taskFromDetail(d: WorkDetailDto, lookup: MemberLookup): TaskPatch {
  const schedule = d.schedule?.startTime ? d.schedule : null;
  const planned = d.plannedSchedule;
  const lastAssignment = [...d.assignments].sort((a, b) => b.assignmentNumber - a.assignmentNumber)[0];
  const rejected = d.status === 'REGISTERED' && lastAssignment?.result === 'REJECTED' ? lastAssignment : null;
  const scheduleSource = schedule ?? (rejected ? null : planned);
  const report = d.completionReport;
  const sitePhotos = d.sitePhotos ?? [];
  const registeredAt = toIsoDateTime(d.registeredAt);
  const history = buildHistory(d, lookup);
  return {
    id: toId(ID_PREFIX.plain, d.workId),
    version: d.version,
    fields: {
      title: d.name,
      status: d.status,
      delayed: d.delayed,
      workTypeId: workTypeId(d.workType),
      technicianId: technicianId(scheduleSource?.technician?.technicianId),
      ...scheduleFields(scheduleSource?.startTime, scheduleSource?.expectedDurationMinutes),
      customer: d.customer
        ? {
            name: d.customer.name ?? '',
            phone: d.customer.phone ?? '',
            zipCode: d.customer.postalCode ?? '',
            address: d.customer.address ?? '',
            addressDetail: d.customer.addressDetail ?? '',
          }
        : null,
      price: d.payment?.fee ?? null,
      paymentMethod: d.payment?.method ? PAYMENT_LABEL[d.payment.method] : null,
      sitePhotoUrls: sitePhotos.map(photoUrl),
      attachments: sitePhotos.map((p, i) => ({
        id: p.photoId,
        name: `현장사진_${String(i + 1).padStart(2, '0')}.jpg`,
        // 서버가 파일 크기를 주지 않는다.
        sizeBytes: 0,
        url: photoUrl(p),
        uploadedAt: registeredAt,
      })),
      registrantId: staffId(d.registrar?.membershipId),
      createdAt: registeredAt,
      updatedAt: history.at(-1)?.at ?? registeredAt,
      rejection: rejected
        ? {
            reason: rejectionLabel(rejected.rejectionReason, rejected.rejectionNote),
            at: toIsoDateTime(rejected.decidedAt ?? rejected.assignedAt),
            technicianId: technicianId(rejected.schedule.technician?.technicianId) ?? '',
          }
        : null,
      report:
        report && d.completedAt
          ? {
              submittedAt: toIsoDateTime(d.completedAt),
              content: joinReportContent(report.workNote ?? '', report.usedParts ?? ''),
              photoUrls: [report.beforePhotos[0], report.afterPhotos[0]]
                .filter((p): p is PhotoDto => Boolean(p))
                .map(photoUrl),
            }
          : null,
      reportRequestedAt: toKstIso(d.completionReportRequests.at(-1)?.requestedAt),
      history,
      cancellation: d.cancellation
        ? {
            reason: CANCEL_REASONS[CANCEL_CODES.indexOf(d.cancellation.reason)] ?? '기타',
            detail: d.cancellation.note ?? '',
            at: toIsoDateTime(d.cancellation.cancelledAt),
            actorId: staffId(d.cancellation.cancelledBy),
          }
        : null,
    },
  };
}
