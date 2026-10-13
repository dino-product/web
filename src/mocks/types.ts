/**
 * Orbit 웹 목업 도메인 타입 — 모든 섹션이 공유하는 계약.
 * 백엔드 연동 전이므로 값은 src/mocks의 시드 데이터와 스토어 액션으로만 바뀐다.
 * 이 파일은 공통 파일이다. 섹션 작업에서 수정하지 말고, 필요한 파생 값은 섹션 폴더에서 계산한다.
 */

export type ID = string;

/** ISO 8601 일시 문자열. 예: '2026-10-13T09:30:00+09:00' */
export type IsoDateTime = string;
/** 'YYYY-MM-DD' */
export type IsoDate = string;
/** 'HH:mm' (24시간) */
export type HourMinute = string;

/**
 * 작업 상태 6종 — Figma 디자이너 전달사항 "작업 상태 표기 통일 요청(2026.10.08)" 기준.
 * 화면 표시는 TASK_STATUS_LABEL을 쓴다. 거절·지연은 상태가 아니라 보조 배지다.
 */
export type TaskStatus =
  | 'REGISTERED' // 등록: 담당기사·시간 중 하나라도 비어 대기함에 있는 작업
  | 'PENDING_ACCEPT' // 배정됨: 격자에 배치됐고 기사가 아직 수락·거절하지 않음
  | 'ACCEPTED' // 작업전: 기사가 수락, 아직 시작 전
  | 'IN_PROGRESS' // 작업중: 기사가 작업 시작
  | 'COMPLETED' // 완료: 완료 보고 제출됨
  | 'CANCELED'; // 취소: 사무실이 취소함(복구 불가)

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  REGISTERED: '등록',
  PENDING_ACCEPT: '배정됨',
  ACCEPTED: '작업전',
  IN_PROGRESS: '작업중',
  COMPLETED: '완료',
  CANCELED: '취소',
};

/** 소속 회사 안에서의 역할. OWNER = 총관리자 */
export type CompanyRole = 'OWNER' | 'STAFF';

export const COMPANY_ROLE_LABEL: Record<CompanyRole, string> = {
  OWNER: '총 관리자',
  STAFF: '직원',
};

/** 인력 구분: 직원(사무실) / 기사(현장) */
export type MemberKind = 'EMPLOYEE' | 'TECHNICIAN';

export const MEMBER_KIND_LABEL: Record<MemberKind, string> = {
  EMPLOYEE: '직원',
  TECHNICIAN: '기사',
};

export type MemberStatus = 'ACTIVE' | 'INACTIVE';

export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  ACTIVE: '활성화',
  INACTIVE: '비활성화',
};

/** 유형 설정의 세 분류: 직원 유형 / 기사 유형 / 작업 유형 */
export type TypeCategory = 'EMPLOYEE' | 'TECHNICIAN' | 'WORK';

export const TYPE_CATEGORY_LABEL: Record<TypeCategory, string> = {
  EMPLOYEE: '직원유형',
  TECHNICIAN: '기사유형',
  WORK: '작업유형',
};

/** Figma 변수 Type Color/* 8종. 작업 유형 색상에 쓴다. */
export type TypeColor = 'GRAY' | 'GREEN' | 'PURPLE' | 'BROWN' | 'YELLOW' | 'PINK' | 'RED' | 'BLUE';

export interface Company {
  id: ID;
  name: string;
  /** 업종. 예: '냉난방 설비', '건설' */
  industry: string;
  /** 회사 참여 코드. 발급 전이면 null. 예: 'ORBIT-7K2M' */
  joinCode: string | null;
  /** 영구 참여 링크. 발급 전이면 null. 예: 'https://orbit.app/join/ORBIT-7K2M' */
  joinLink: string | null;
}

/** 로그인 사용자의 소속 발주사 목록 항목(사이드바 발주사 전환, 마이페이지 소속 발주사) */
export interface CompanyMembership {
  companyId: ID;
  companyName: string;
  role: CompanyRole;
}

/** 현재 발주사의 인력(직원·기사). 로그인 사용자도 EMPLOYEE 인력으로 포함된다. */
export interface Member {
  id: ID;
  name: string;
  phone: string;
  kind: MemberKind;
  /** kind에 맞는 유형(직원유형 또는 기사유형) ID. 미지정이면 null */
  typeId: ID | null;
  /** 총관리자 여부(직원만 가능, 회사당 1명) */
  isOwner: boolean;
  status: MemberStatus;
  joinedAt: IsoDateTime;
  avatarUrl: string | null;
}

export interface TypeItem {
  id: ID;
  category: TypeCategory;
  name: string;
  /** 작업 유형만 사용 */
  color: TypeColor | null;
  active: boolean;
  createdAt: IsoDateTime;
}

export interface TaskCustomer {
  name: string;
  phone: string;
  zipCode: string;
  address: string;
  addressDetail: string;
}

export interface TaskHistoryEntry {
  at: IsoDateTime;
  /** 예: '작업 등록됨', '배정 알림 발송', '기사 수락', '작업 시작', '완료 보고 제출', '작업 취소' */
  label: string;
  /** 처리자 이름. 예: '김운영', '박서준 기사' */
  actor: string | null;
}

export interface TaskReport {
  submittedAt: IsoDateTime;
  content: string;
  photoUrls: string[];
}

export interface TaskAttachment {
  id: ID;
  name: string;
  sizeBytes: number;
  url: string;
  uploadedAt: IsoDateTime;
}

export interface TaskRejection {
  reason: string;
  at: IsoDateTime;
  technicianId: ID;
}

export interface TaskCancellation {
  /** 취소 사유 드롭다운 값. 예: '고객 요청', '기사 사정', '중복 등록', '기타' */
  reason: string;
  /** '기타'일 때 입력한 상세 사유 */
  detail: string;
  at: IsoDateTime;
  actorId: ID;
}

export interface Task {
  id: ID;
  title: string;
  /** 작업 유형(TypeItem.category === 'WORK') */
  workTypeId: ID | null;
  status: TaskStatus;
  /** 담당 기사(Member.kind === 'TECHNICIAN') */
  technicianId: ID | null;
  /** 작업 날짜. 미지정이면 null */
  date: IsoDate | null;
  /** 시작 시각. 미지정이면 null */
  startTime: HourMinute | null;
  /** 예상 소요 시간(분). 미지정이면 null */
  durationMinutes: number | null;
  customer: TaskCustomer | null;
  /** 작업 금액(원) */
  price: number | null;
  /** 결제 방식. 예: '현장 결제', '계좌 이체', '카드 결제' */
  paymentMethod: string | null;
  sitePhotoUrls: string[];
  /** 등록자(직원 Member ID) */
  registrantId: ID;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  /** 기사가 거절하면 status는 REGISTERED로 돌아가고 거절 정보가 남는다(거절 배지) */
  rejection: TaskRejection | null;
  /** 지연 보조 배지 */
  delayed: boolean;
  report: TaskReport | null;
  /** '기사에게 요청 보내기'를 누른 시각 */
  reportRequestedAt: IsoDateTime | null;
  attachments: TaskAttachment[];
  /** 상태 변경 이력(오래된 순) */
  history: TaskHistoryEntry[];
  cancellation: TaskCancellation | null;
}

/** 새 작업 등록·수정 입력값 */
export interface TaskInput {
  title: string;
  workTypeId: ID | null;
  technicianId: ID | null;
  date: IsoDate | null;
  startTime: HourMinute | null;
  durationMinutes: number | null;
  customer: TaskCustomer | null;
  price: number | null;
  paymentMethod: string | null;
  sitePhotoUrls: string[];
}

/** 격자 배정 입력값(배정 확인 모달) */
export interface TaskAssignment {
  technicianId: ID;
  date: IsoDate;
  startTime: HourMinute;
  durationMinutes: number;
}

export type NotificationType =
  | 'ASSIGNED' // 신규 배정
  | 'SCHEDULE_CHANGED' // 일정 변경
  | 'CANCELED' // 작업 취소
  | 'ACCEPTED' // 수락 완료
  | 'REJECTED' // 작업 거절
  | 'REPORTED'; // 완료 보고

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  ASSIGNED: '신규 배정',
  SCHEDULE_CHANGED: '일정 변경',
  CANCELED: '작업 취소',
  ACCEPTED: '수락 완료',
  REJECTED: '작업 거절',
  REPORTED: '완료 보고',
};

export interface AppNotification {
  id: ID;
  type: NotificationType;
  taskId: ID | null;
  /** 목록에 표시할 문장. 예: '홍길동 기사님께 [에어컨 점검] 작업이 배정되었습니다.' */
  message: string;
  createdAt: IsoDateTime;
  read: boolean;
}

/** 회사 참여 경로 */
export type JoinChannel = 'CODE' | 'LINK' | 'QR';

export const JOIN_CHANNEL_LABEL: Record<JoinChannel, string> = {
  CODE: '회사 코드',
  LINK: '참여 링크',
  QR: 'QR 코드',
};

/** 승인대기 — 회사 참여 요청 */
export interface JoinRequest {
  id: ID;
  name: string;
  phone: string;
  /** 신청자가 고른 희망 유형 */
  desiredKind: MemberKind;
  /** 관리자가 확정할 유형(기본값은 희망 유형). 다르면 '불일치' 표시 */
  confirmedKind: MemberKind;
  requestedAt: IsoDateTime;
  channel: JoinChannel;
}

export interface Session {
  loggedIn: boolean;
  /** 로그인 사용자 Member ID */
  userId: ID;
  /** 첫 로그인 사용자(약관 동의 → 프로필 등록 → 발주사 생성 → 유형 설정 흐름) */
  isNewUser: boolean;
  termsAgreed: boolean;
  currentCompanyId: ID;
}

/**
 * 테스트 시나리오. 화면에 보이는 UI 없이 URL 쿼리로만 바꾼다(README 참조).
 * 한 번 지정하면 sessionStorage에 남아 같은 탭에서 유지된다.
 */
export interface Scenario {
  /** ?role=staff → 로그인 사용자를 직원으로 */
  role: 'owner' | 'staff';
  /** ?data=empty → 작업·인력·유형·알림이 비어 있는 상태 */
  data: 'default' | 'empty';
  /** ?network=offline → 타임테이블·진행 보드 네트워크 연결 실패 화면 */
  network: 'online' | 'offline';
  /** ?companies=2 → 소속 발주사 2곳(사이드바 발주사 전환) */
  companies: 1 | 2;
  /** ?user=new → 카카오 로그인 후 첫 사용자 온보딩 흐름 */
  user: 'existing' | 'new';
}
