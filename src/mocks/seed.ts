/**
 * 시드 데이터. 실제 오늘 날짜(Asia/Seoul)를 기준으로 매번 생성한다.
 * 화면 간 데이터가 맞물리도록 작업·이력·알림을 같은 사건 시각으로 만든다(예: 거절 알림 ↔ 거절 이력 ↔ 거절 배지).
 * 시나리오(role·data·companies·user·network)에 따라 초기 상태가 달라진다. 개요는 docs/data-layer.md §4.
 */
import { addDays, clockNow, hmToMinutes, startOfDayMs, toIsoDateTime, today } from '@/lib/date';
import { joinReportContent } from '@/lib/format';
import {
  CURRENT_USER_ID,
  DEMO_TASK_IDS,
  HISTORY_LABEL,
  PARTNER_COMPANY_ID,
  PRIMARY_COMPANY_ID,
} from '@/mocks/constants';
import { notificationMessage, scheduleChangePhrase } from '@/mocks/rules';
import type {
  AppNotification,
  Company,
  CompanyMembership,
  HourMinute,
  IsoDateTime,
  JoinRequest,
  Member,
  MemberKind,
  NotificationType,
  Scenario,
  Session,
  Task,
  TaskAttachment,
  TaskCustomer,
  TaskHistoryEntry,
  TaskStatus,
  TypeItem,
} from '@/mocks/types';

/** 스토어 초기 상태 중 데이터 부분 */
export interface SeedData {
  session: Session;
  companies: Company[];
  memberships: CompanyMembership[];
  members: Member[];
  types: TypeItem[];
  tasks: Task[];
  notifications: AppNotification[];
  joinRequests: JoinRequest[];
  network: 'online' | 'offline';
}

/** 시드 인력 ID. 화면에서 특정 인력이 필요할 때 이름 대신 쓴다. */
export const SEED_MEMBER_IDS = {
  me: CURRENT_USER_ID,
  kimUnyeong: 'm-kimunyeong',
  parkSeojun: 'm-parkseojun',
  leeJieun: 'm-leejieun',
  songJihwan: 'm-songjihwan',
  yangSeohui: 'm-yangseohui',
  kimMinsu: 'm-kimminsu',
  kimMinjun: 'm-kimminjun',
  leeMinjun: 'm-leeminjun',
  hongGildong: 'm-honggildong',
  kimTaehun: 'm-kimtaehun',
  parkSeoyeon: 'm-parkseoyeon',
  leeCheolho: 'm-leecheolho',
  leeJunhyeok: 'm-leejunhyeok',
  choiDonguk: 'm-choidonguk',
} as const;

/** 시드 유형 ID */
export const SEED_TYPE_IDS = {
  employeeAdmin: 'type-emp-admin',
  employeeDispatch: 'type-emp-dispatch',
  employeeOffice: 'type-emp-office',
  employeeField: 'type-emp-field',
  technicianExpert: 'type-tech-expert',
  technicianInstall: 'type-tech-install',
  technicianService: 'type-tech-service',
  technicianElectric: 'type-tech-electric',
  technicianAssistant: 'type-tech-assistant',
  workInstall: 'type-work-install',
  workInspect: 'type-work-inspect',
  workRepair: 'type-work-repair',
  workCleaning: 'type-work-cleaning',
} as const;

type MemberKey = keyof typeof SEED_MEMBER_IDS;
type WorkKey = 'install' | 'inspect' | 'repair';

const WORK_TYPE_ID: Record<WorkKey, string> = {
  install: SEED_TYPE_IDS.workInstall,
  inspect: SEED_TYPE_IDS.workInspect,
  repair: SEED_TYPE_IDS.workRepair,
};

const PERSON_NAME: Record<MemberKey, string> = {
  me: '오르빗',
  kimUnyeong: '김운영',
  parkSeojun: '박서준',
  leeJieun: '이지은',
  songJihwan: '송지환',
  yangSeohui: '양서희',
  kimMinsu: '김민수',
  kimMinjun: '김민준',
  leeMinjun: '이민준',
  hongGildong: '홍길동',
  kimTaehun: '김태훈',
  parkSeoyeon: '박서연',
  leeCheolho: '이철호',
  leeJunhyeok: '이준혁',
  choiDonguk: '최동욱',
};

const TECHNICIAN_KEYS = new Set<MemberKey>([
  'kimMinsu',
  'kimMinjun',
  'leeMinjun',
  'hongGildong',
  'kimTaehun',
  'parkSeoyeon',
  'leeCheolho',
  'leeJunhyeok',
  'choiDonguk',
]);

/** 이력 처리자 표기: 기사는 '이름 기사', 직원은 이름 */
const actor = (key: MemberKey) => (TECHNICIAN_KEYS.has(key) ? `${PERSON_NAME[key]} 기사` : PERSON_NAME[key]);

const CUSTOMERS = {
  leeJeongho: ['이정호', '010-1234-5678', '04043', '서울시 마포구 합정동 123-4', '2층'],
  parkJihun: ['박지훈', '010-2345-6789', '06234', '서울시 강남구 역삼동 678-12', '3층 301호'],
  choiYuri: ['최유리', '010-3456-7890', '05551', '서울시 송파구 잠실동 45-6', '102동 1503호'],
  jeongMinho: ['정민호', '010-4567-8901', '06611', '서울시 서초구 서초동 1305-7', '상가 1층'],
  hanSohui: ['한소희', '010-5678-9012', '04400', '서울시 용산구 한남동 72-1', ''],
  ohJunseok: ['오준석', '010-6789-0123', '04782', '서울시 성동구 성수동2가 289-5', '4층'],
  yunSeoa: ['윤서아', '010-7890-1234', '07327', '서울시 영등포구 여의도동 22', '1203호'],
  kimHajun: ['김하준', '010-8901-2345', '01690', '서울시 노원구 상계동 1032', '201동 704호'],
  jangMirae: ['장미래', '010-9012-3456', '03305', '서울시 은평구 불광동 281-3', ''],
  kangDoyun: ['강도윤', '010-1357-2468', '05066', '서울시 광진구 자양동 680-63', '2층'],
  seoJia: ['서지아', '010-2468-1357', '06978', '서울시 동작구 상도동 512', 'B동 302호'],
  munTaeyang: ['문태양', '010-3579-2468', '07702', '서울시 강서구 화곡동 1067-12', ''],
  baeSujin: ['배수진', '010-4680-1357', '04536', '서울시 중구 명동2가 33-1', '5층'],
  shinDongha: ['신동하', '010-5791-3468', '03053', '서울시 종로구 삼청동 63-4', ''],
  imHaneul: ['임하늘', '010-6802-4579', '08787', '서울시 관악구 봉천동 1570-1', '1층 상가'],
  kwonSoyeon: ['권소연', '010-2581-4703', '03986', '서울시 마포구 연남동 239-12', '301호'],
  leeSeungwoo: ['이승우', '010-3692-5814', '02841', '서울시 성북구 안암동5가 102-4', ''],
  parkMinji: ['박민지', '010-4703-6925', '06035', '서울시 강남구 신사동 549-8', '7층'],
  kimDohyun: ['김도현', '010-5814-7036', '05854', '서울시 송파구 문정동 642', '1101호'],
  songHayoon: ['송하윤', '010-6925-8147', '01811', '서울시 노원구 공릉동 381', '3동 202호'],
  ohYejin: ['오예진', '010-7036-9258', '02455', '서울시 동대문구 회기동 60-17', ''],
  leeSeoyoung: ['이서영', '010-8147-0369', '04157', '서울시 마포구 도화동 179-11', '2층'],
  hanJiwon: ['한지원', '010-9258-1470', '07995', '서울시 양천구 목동 916', '목동아파트 5단지 503호'],
} as const satisfies Record<string, readonly [string, string, string, string, string]>;

type CustomerKey = keyof typeof CUSTOMERS;

function customer(key: CustomerKey): TaskCustomer {
  const [name, phone, zipCode, address, addressDetail] = CUSTOMERS[key];
  return { name, phone, zipCode, address, addressDetail };
}

/**
 * 목업 사진(현장 사진·완료 보고 사진·첨부 파일). 외부 파일 없이 쓰도록 SVG data URI로 만든다.
 * Figma 시안의 사진 자리처럼 회색 바탕 가운데 이미지 기호만 그린다.
 */
export function mockPhotoUrl(variant: number): string {
  const tones = [
    ['#e9e9ea', '#aaaaaa'],
    ['#f1f1f6', '#9b9b9b'],
    ['#ededed', '#aaaaaa'],
    ['#f5f6f8', '#9b9b9b'],
  ];
  const [bg, fg] = tones[Math.abs(variant) % tones.length];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360">` +
    `<rect width="600" height="360" fill="${bg}"/>` +
    `<g fill="none" stroke="${fg}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">` +
    `<rect x="270" y="150" width="60" height="60" rx="8"/><circle cx="288" cy="168" r="6"/>` +
    `<path d="M274 204l18-18 12 12 10-10 12 12"/></g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface RejectionSpec {
  by: MemberKey;
  reason: string;
  /** 거절된 배정의 '배정 알림 발송됨' 시각 */
  assigned: IsoDateTime;
  /** 거절 시각 */
  at: IsoDateTime;
}

interface TaskSpec {
  id: string;
  title: string;
  work: WorkKey | null;
  status: TaskStatus;
  tech?: MemberKey;
  /** 작업 날짜(오늘 기준 일수) */
  day?: number;
  start?: HourMinute;
  minutes: number;
  customer: CustomerKey | null;
  price: number | null;
  payment: string | null;
  /** 등록자(직원) */
  by: MemberKey;
  created: IsoDateTime;
  assigned?: IsoDateTime;
  accepted?: IsoDateTime;
  started?: IsoDateTime;
  report?: { at: IsoDateTime; memo: string; parts: string };
  /** 현재 거절 상태(등록 + 거절 배지). 기사·시간은 비워진다. */
  rejection?: RejectionSpec;
  /** 이전에 거절됐다가 다른 기사에게 다시 배정된 이력(이력에만 남는다) */
  pastRejection?: RejectionSpec;
  rescheduled?: { at: IsoDateTime; by: MemberKey };
  delayed?: boolean;
  cancellation?: { reason: string; detail?: string; at: IsoDateTime; by: MemberKey };
  /** 등록 때 첨부한 현장 사진 수(첨부 파일 탭) */
  photos?: number;
}

function buildTask(spec: TaskSpec, baseDate: string): Task {
  const registrant = SEED_MEMBER_IDS[spec.by];
  const history: TaskHistoryEntry[] = [
    { at: spec.created, label: HISTORY_LABEL.registered, actor: actor(spec.by) },
  ];
  for (const rejection of [spec.pastRejection, spec.rejection]) {
    if (!rejection) continue;
    history.push({ at: rejection.assigned, label: HISTORY_LABEL.assigned, actor: actor(spec.by) });
    history.push({ at: rejection.at, label: HISTORY_LABEL.rejected, actor: actor(rejection.by) });
  }
  if (spec.assigned) history.push({ at: spec.assigned, label: HISTORY_LABEL.assigned, actor: actor(spec.by) });
  if (spec.accepted && spec.tech) history.push({ at: spec.accepted, label: HISTORY_LABEL.accepted, actor: actor(spec.tech) });
  if (spec.rescheduled) {
    history.push({ at: spec.rescheduled.at, label: HISTORY_LABEL.rescheduled, actor: actor(spec.rescheduled.by) });
  }
  if (spec.started && spec.tech) history.push({ at: spec.started, label: HISTORY_LABEL.started, actor: actor(spec.tech) });
  if (spec.report && spec.tech) history.push({ at: spec.report.at, label: HISTORY_LABEL.reported, actor: actor(spec.tech) });
  if (spec.cancellation) {
    history.push({ at: spec.cancellation.at, label: HISTORY_LABEL.canceled, actor: actor(spec.cancellation.by) });
  }
  history.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  const photoCount = spec.photos ?? 0;
  const sitePhotoUrls = Array.from({ length: photoCount }, (_, i) => mockPhotoUrl(i));
  const attachments: TaskAttachment[] = sitePhotoUrls.map((url, i) => ({
    id: `${spec.id}-file-${i + 1}`,
    name: `현장사진_${String(i + 1).padStart(2, '0')}.jpg`,
    sizeBytes: 1_250_000 + ((i * 437_000) % 2_100_000),
    url,
    uploadedAt: spec.created,
  }));

  return {
    id: spec.id,
    title: spec.title,
    workTypeId: spec.work ? WORK_TYPE_ID[spec.work] : null,
    status: spec.status,
    technicianId: spec.tech ? SEED_MEMBER_IDS[spec.tech] : null,
    date: spec.day == null ? null : addDays(baseDate, spec.day),
    startTime: spec.start ?? null,
    durationMinutes: spec.minutes,
    customer: spec.customer ? customer(spec.customer) : null,
    price: spec.price,
    paymentMethod: spec.payment,
    sitePhotoUrls,
    registrantId: registrant,
    createdAt: spec.created,
    updatedAt: history[history.length - 1].at,
    rejection: spec.rejection
      ? { reason: spec.rejection.reason, at: spec.rejection.at, technicianId: SEED_MEMBER_IDS[spec.rejection.by] }
      : null,
    delayed: spec.delayed ?? false,
    report: spec.report
      ? {
          submittedAt: spec.report.at,
          content: joinReportContent(spec.report.memo, spec.report.parts),
          photoUrls: [mockPhotoUrl(0), mockPhotoUrl(1)],
        }
      : null,
    reportRequestedAt: null,
    attachments,
    history,
    cancellation: spec.cancellation
      ? {
          reason: spec.cancellation.reason,
          detail: spec.cancellation.detail ?? '',
          at: spec.cancellation.at,
          actorId: SEED_MEMBER_IDS[spec.cancellation.by],
        }
      : null,
  };
}

/**
 * 시나리오에 맞는 시드 데이터를 만든다.
 * @param now 기준 시각(epoch ms). 오늘 날짜와 '오늘' 사건 시각을 정한다.
 */
export function createSeed(scenario: Scenario, now: number = clockNow()): SeedData {
  const T = today(now);
  const startToday = startOfDayMs(T);
  const latest = Math.max(startToday, now - 60_000);

  /** 오늘 기준 dayOffset일의 HH:mm 사건 시각. 아직 오지 않은 시각이면 1분 전으로 당긴다. */
  const at = (dayOffset: number, hm: HourMinute): IsoDateTime =>
    toIsoDateTime(Math.min(startOfDayMs(addDays(T, dayOffset)) + hmToMinutes(hm) * 60_000, latest));
  /** 오늘 사건을 '지금부터 N분 전'으로 만든다. 자정 직후에는 floor분 이후로 맞춰 순서를 지키되 현재를 넘지 않는다. */
  const ago = (minutes: number, floor: number): IsoDateTime =>
    toIsoDateTime(Math.min(latest, Math.max(startToday + floor * 60_000, now - minutes * 60_000)));

  const isStaff = scenario.role === 'staff';
  const isEmpty = scenario.data === 'empty';
  const isNewUser = scenario.user === 'new';

  // ── 발주사·소속 ────────────────────────────────────────────────
  const companies: Company[] = [
    {
      id: PRIMARY_COMPANY_ID,
      name: 'OO건설',
      industry: '냉난방 설비',
      joinCode: isEmpty ? null : 'ORBIT-7K2M',
      joinLink: isEmpty ? null : 'https://orbit.app/join/ORBIT-7K2M',
    },
  ];
  const memberships: CompanyMembership[] = [
    { companyId: PRIMARY_COMPANY_ID, companyName: 'OO건설', role: isStaff ? 'STAFF' : 'OWNER' },
  ];
  if (scenario.companies === 2) {
    companies.push({ id: PARTNER_COMPANY_ID, name: '협력 발주사', industry: '종합 시설관리', joinCode: null, joinLink: null });
    memberships.push({ companyId: PARTNER_COMPANY_ID, companyName: '협력 발주사', role: 'STAFF' });
  }

  const session: Session = {
    loggedIn: !isNewUser,
    userId: CURRENT_USER_ID,
    isNewUser,
    termsAgreed: !isNewUser,
    currentCompanyId: PRIMARY_COMPANY_ID,
  };

  // ── 유형 ───────────────────────────────────────────────────────
  const typeAt = (days: number) => at(-days, '10:00');
  const types: TypeItem[] = isEmpty
    ? []
    : [
        { id: SEED_TYPE_IDS.employeeAdmin, category: 'EMPLOYEE', name: '관리자', color: null, active: true, createdAt: typeAt(230) },
        { id: SEED_TYPE_IDS.employeeDispatch, category: 'EMPLOYEE', name: '배차 담당', color: null, active: true, createdAt: typeAt(230) },
        { id: SEED_TYPE_IDS.employeeOffice, category: 'EMPLOYEE', name: '사무 지원', color: null, active: true, createdAt: typeAt(229) },
        { id: SEED_TYPE_IDS.employeeField, category: 'EMPLOYEE', name: '현장 담당', color: null, active: false, createdAt: typeAt(180) },
        { id: SEED_TYPE_IDS.technicianExpert, category: 'TECHNICIAN', name: '전문 기사', color: null, active: true, createdAt: typeAt(230) },
        { id: SEED_TYPE_IDS.technicianInstall, category: 'TECHNICIAN', name: '설치 기사', color: null, active: true, createdAt: typeAt(230) },
        { id: SEED_TYPE_IDS.technicianService, category: 'TECHNICIAN', name: 'A/S 기사', color: null, active: true, createdAt: typeAt(229) },
        { id: SEED_TYPE_IDS.technicianElectric, category: 'TECHNICIAN', name: '전기 기사', color: null, active: true, createdAt: typeAt(200) },
        { id: SEED_TYPE_IDS.technicianAssistant, category: 'TECHNICIAN', name: '보조 기사', color: null, active: false, createdAt: typeAt(150) },
        { id: SEED_TYPE_IDS.workInstall, category: 'WORK', name: '설치', color: 'PURPLE', active: true, createdAt: typeAt(230) },
        { id: SEED_TYPE_IDS.workInspect, category: 'WORK', name: '점검', color: 'BLUE', active: true, createdAt: typeAt(230) },
        { id: SEED_TYPE_IDS.workRepair, category: 'WORK', name: '수리', color: 'YELLOW', active: true, createdAt: typeAt(230) },
        { id: SEED_TYPE_IDS.workCleaning, category: 'WORK', name: '세척', color: 'GREEN', active: false, createdAt: typeAt(120) },
      ];

  // ── 인력 ───────────────────────────────────────────────────────
  const person = (
    key: MemberKey,
    phone: string,
    kind: MemberKind,
    typeId: string | null,
    joinedDaysAgo: number,
    extra: Partial<Member> = {},
  ): Member => ({
    id: SEED_MEMBER_IDS[key],
    name: PERSON_NAME[key],
    phone,
    kind,
    typeId: isEmpty ? null : typeId,
    isOwner: false,
    status: 'ACTIVE',
    joinedAt: at(-joinedDaysAgo, '09:00'),
    avatarUrl: null,
    ...extra,
  });

  const me = person('me', '010-1234-5678', 'EMPLOYEE', isStaff ? SEED_TYPE_IDS.employeeDispatch : SEED_TYPE_IDS.employeeAdmin, 230, {
    isOwner: !isStaff,
  });
  const parkSeojun = person('parkSeojun', '010-3958-2041', 'EMPLOYEE', isStaff ? SEED_TYPE_IDS.employeeAdmin : SEED_TYPE_IDS.employeeDispatch, 187, {
    isOwner: isStaff,
  });

  const members: Member[] = isEmpty
    ? [me, ...(isStaff ? [parkSeojun] : [])]
    : [
        me,
        person('kimUnyeong', '010-2847-1934', 'EMPLOYEE', SEED_TYPE_IDS.employeeDispatch, 214),
        parkSeojun,
        person('leeJieun', '010-4169-3152', 'EMPLOYEE', SEED_TYPE_IDS.employeeOffice, 96),
        person('songJihwan', '010-5270-4263', 'EMPLOYEE', SEED_TYPE_IDS.employeeDispatch, 61),
        person('yangSeohui', '010-6381-5374', 'EMPLOYEE', SEED_TYPE_IDS.employeeOffice, 23),
        person('kimMinsu', '010-7492-6485', 'TECHNICIAN', SEED_TYPE_IDS.technicianExpert, 205),
        person('kimMinjun', '010-8503-7596', 'TECHNICIAN', SEED_TYPE_IDS.technicianInstall, 176),
        person('leeMinjun', '010-9614-8607', 'TECHNICIAN', SEED_TYPE_IDS.technicianService, 158),
        person('hongGildong', '010-2725-9718', 'TECHNICIAN', SEED_TYPE_IDS.technicianInstall, 140),
        person('kimTaehun', '010-3836-1829', 'TECHNICIAN', SEED_TYPE_IDS.technicianElectric, 122),
        person('parkSeoyeon', '010-4947-2930', 'TECHNICIAN', SEED_TYPE_IDS.technicianInstall, 98),
        person('leeCheolho', '010-5058-3041', 'TECHNICIAN', SEED_TYPE_IDS.technicianInstall, 84),
        person('leeJunhyeok', '010-6169-4152', 'TECHNICIAN', SEED_TYPE_IDS.technicianElectric, 45),
        person('choiDonguk', '010-7270-5263', 'TECHNICIAN', SEED_TYPE_IDS.technicianService, 150, { status: 'INACTIVE' }),
      ];

  if (isEmpty) {
    return {
      session,
      companies,
      memberships,
      members,
      types,
      tasks: [],
      notifications: [],
      joinRequests: [],
      network: scenario.network,
    };
  }

  // ── 오늘 알림과 연결된 사건 시각 ────────────────────────────────
  const N1 = ago(8, 4); // 신규 배정: 에어컨 점검 → 홍길동(안 읽음)
  const N2 = ago(36, 3); // 일정 변경: 보일러 수리 오후 2시(안 읽음)
  const N3 = ago(74, 2); // 작업 취소: 정수기 필터 교체
  const N4 = ago(128, 1); // 수락 완료: 냉장고 수리 ← 이민준

  // ── 작업 ───────────────────────────────────────────────────────
  const specs: TaskSpec[] = [
    // 오늘 — 완료
    {
      id: DEMO_TASK_IDS.completed,
      title: '시스템 에어컨 설치',
      work: 'install',
      status: 'COMPLETED',
      tech: 'kimMinjun',
      day: 0,
      start: '09:00',
      minutes: 120,
      customer: 'parkJihun',
      price: 450000,
      payment: '카드 결제',
      by: 'kimUnyeong',
      created: at(-3, '10:12'),
      assigned: at(-3, '10:20'),
      accepted: at(-3, '11:02'),
      started: at(0, '09:04'),
      report: {
        at: at(0, '11:08'),
        memo: '거실·안방 시스템 에어컨 2대 설치를 마쳤습니다. 배관 연결부 누수 점검과 시운전까지 확인했고, 고객에게 리모컨 사용법을 안내했습니다.',
        parts: '냉매 배관 15m, 드레인 호스 8m, 배관 테이프 2롤',
      },
      photos: 6,
    },
    {
      id: 'task-01',
      title: '인덕션 설치',
      work: 'install',
      status: 'COMPLETED',
      tech: 'kimMinsu',
      day: 0,
      start: '09:00',
      minutes: 90,
      customer: 'choiYuri',
      price: 180000,
      payment: '현장 결제',
      by: 'parkSeojun',
      created: at(-2, '14:30'),
      assigned: at(-2, '14:36'),
      accepted: at(-2, '16:10'),
      started: at(0, '09:02'),
      report: {
        at: at(0, '10:41'),
        memo: '기존 가스레인지를 철거하고 3구 인덕션을 설치했습니다. 전용 차단기 작동과 화구별 출력을 확인했습니다.',
        parts: '전용 차단기 1개, 전원 케이블 3m',
      },
      photos: 2,
    },
    {
      id: 'task-02',
      title: '정수기 설치',
      work: 'install',
      status: 'COMPLETED',
      tech: 'hongGildong',
      day: 0,
      start: '09:00',
      minutes: 60,
      customer: 'hanSohui',
      price: 80000,
      payment: '계좌 이체',
      by: 'kimUnyeong',
      created: at(-4, '09:30'),
      assigned: at(-4, '09:40'),
      accepted: at(-3, '08:55'),
      started: at(0, '09:05'),
      report: {
        at: at(0, '10:02'),
        memo: '주방 싱크대 하부에 직수형 정수기를 설치하고 수압과 누수 여부를 확인했습니다.',
        parts: '분기 밸브 1개, 급수 호스 2m',
      },
    },
    {
      id: 'task-03',
      title: '건조기 설치',
      work: 'install',
      status: 'COMPLETED',
      tech: 'parkSeoyeon',
      day: 0,
      start: '09:30',
      minutes: 90,
      customer: 'ohJunseok',
      price: 150000,
      payment: '카드 결제',
      by: 'kimUnyeong',
      created: at(-2, '11:05'),
      assigned: at(-2, '11:12'),
      accepted: at(-2, '13:40'),
      started: at(0, '09:33'),
      report: {
        at: at(0, '11:02'),
        memo: '세탁기 위에 직렬 키트로 건조기를 설치하고 배기·배수 연결을 마쳤습니다.',
        parts: '직렬 설치 키트 1세트, 배수 호스 1.5m',
      },
    },
    // 오늘 — 작업중
    {
      id: DEMO_TASK_IDS.inProgress,
      title: '보일러 배관 교체',
      work: 'repair',
      status: 'IN_PROGRESS',
      tech: 'leeMinjun',
      day: 0,
      start: '10:00',
      minutes: 120,
      customer: 'yunSeoa',
      price: 230000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-3, '15:20'),
      assigned: at(-3, '15:28'),
      accepted: at(-2, '09:12'),
      started: at(0, '10:03'),
    },
    {
      id: DEMO_TASK_IDS.delayed,
      title: '식기세척기 설치',
      work: 'install',
      status: 'IN_PROGRESS',
      delayed: true,
      tech: 'leeCheolho',
      day: 0,
      start: '09:00',
      minutes: 120,
      customer: 'kimHajun',
      price: 200000,
      payment: '현장 결제',
      by: 'parkSeojun',
      created: at(-5, '10:40'),
      assigned: at(-5, '10:46'),
      accepted: at(-4, '18:05'),
      started: at(0, '09:41'),
    },
    {
      id: 'task-04',
      title: '서초 상가 전기 공사',
      work: 'install',
      status: 'IN_PROGRESS',
      tech: 'leeJunhyeok',
      day: 0,
      start: '10:00',
      minutes: 180,
      customer: 'jeongMinho',
      price: 380000,
      payment: '계좌 이체',
      by: 'kimUnyeong',
      created: at(-6, '13:00'),
      assigned: at(-6, '13:10'),
      accepted: at(-5, '09:20'),
      started: at(0, '10:05'),
    },
    {
      id: 'task-05',
      title: '욕실 환풍기 교체',
      work: 'repair',
      status: 'IN_PROGRESS',
      tech: 'hongGildong',
      day: 0,
      start: '11:00',
      minutes: 60,
      customer: 'jangMirae',
      price: 70000,
      payment: '현장 결제',
      by: 'me',
      created: at(-1, '09:15'),
      assigned: at(-1, '09:20'),
      accepted: at(-1, '10:02'),
      started: at(0, '11:04'),
    },
    // 오늘 — 작업전
    {
      id: DEMO_TASK_IDS.accepted,
      title: '냉장고 수리',
      work: 'repair',
      status: 'ACCEPTED',
      tech: 'leeMinjun',
      day: 0,
      start: '15:00',
      minutes: 90,
      customer: 'seoJia',
      price: 95000,
      payment: '카드 결제',
      by: 'kimUnyeong',
      created: at(-1, '16:20'),
      assigned: at(-1, '16:25'),
      accepted: N4,
    },
    {
      id: 'task-07',
      title: '조명 교체',
      work: 'install',
      status: 'ACCEPTED',
      tech: 'kimTaehun',
      day: 0,
      start: '14:00',
      minutes: 90,
      customer: 'baeSujin',
      price: 110000,
      payment: '계좌 이체',
      by: 'kimUnyeong',
      created: at(-4, '14:00'),
      assigned: at(-4, '14:05'),
      accepted: at(-3, '10:20'),
    },
    {
      id: DEMO_TASK_IDS.conflict,
      title: '세탁기 설치',
      work: 'install',
      status: 'ACCEPTED',
      tech: 'leeCheolho',
      day: 0,
      start: '13:00',
      minutes: 120,
      customer: 'shinDongha',
      price: 130000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-2, '09:05'),
      assigned: at(-2, '09:20'),
      accepted: at(-1, '08:40'),
    },
    {
      id: 'task-08',
      title: '콘센트 증설',
      work: 'install',
      status: 'ACCEPTED',
      tech: 'leeJunhyeok',
      day: 0,
      start: '15:00',
      minutes: 90,
      customer: 'imHaneul',
      price: 90000,
      payment: '현장 결제',
      by: 'parkSeojun',
      created: at(-3, '16:00'),
      assigned: at(-3, '16:05'),
      accepted: at(-2, '08:30'),
    },
    // 오늘 — 배정됨
    {
      id: DEMO_TASK_IDS.pending,
      title: '배관 누수 점검 및 교체',
      work: 'repair',
      status: 'PENDING_ACCEPT',
      tech: 'kimMinjun',
      day: 0,
      start: '15:00',
      minutes: 120,
      customer: 'leeJeongho',
      price: 120000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-1, '08:45'),
      assigned: at(-1, '08:50'),
    },
    {
      id: 'task-06',
      title: '에어컨 실외기 점검 및 세척',
      work: 'inspect',
      status: 'PENDING_ACCEPT',
      tech: 'kimMinsu',
      day: 0,
      start: '13:00',
      minutes: 120,
      customer: 'kangDoyun',
      price: 120000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-2, '09:40'),
      assigned: at(-2, '09:45'),
    },
    {
      id: 'task-09',
      title: '보일러 수리',
      work: 'repair',
      status: 'PENDING_ACCEPT',
      tech: 'parkSeoyeon',
      day: 0,
      start: '14:00',
      minutes: 120,
      customer: 'munTaeyang',
      price: 160000,
      payment: '현장 결제',
      by: 'parkSeojun',
      created: at(-3, '09:10'),
      assigned: at(-3, '09:18'),
      accepted: at(-3, '11:45'),
      rescheduled: { at: N2, by: 'parkSeojun' },
    },
    {
      id: 'task-10',
      title: '에어컨 점검',
      work: 'inspect',
      status: 'PENDING_ACCEPT',
      tech: 'hongGildong',
      day: 0,
      start: '16:00',
      minutes: 60,
      customer: 'kwonSoyeon',
      price: 60000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-1, '17:10'),
      assigned: N1,
    },
    {
      id: 'task-11',
      title: '가스레인지 점검',
      work: 'inspect',
      status: 'PENDING_ACCEPT',
      tech: 'kimMinsu',
      day: 0,
      start: '16:00',
      minutes: 60,
      customer: 'leeSeungwoo',
      price: 40000,
      payment: '현장 결제',
      by: 'me',
      created: at(0, '08:30'),
      assigned: at(0, '08:35'),
    },
    {
      id: 'task-12',
      title: '에어컨 이전 설치',
      work: 'install',
      status: 'PENDING_ACCEPT',
      tech: 'leeCheolho',
      day: 0,
      start: '16:00',
      minutes: 120,
      customer: 'parkMinji',
      price: 260000,
      payment: '카드 결제',
      by: 'kimUnyeong',
      created: at(-1, '13:30'),
      assigned: at(-1, '13:40'),
    },
    // 어제
    {
      id: DEMO_TASK_IDS.noReport,
      title: '세탁기 배수 펌프 수리',
      work: 'repair',
      status: 'IN_PROGRESS',
      tech: 'leeMinjun',
      day: -1,
      start: '14:00',
      minutes: 120,
      customer: 'choiYuri',
      price: 85000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-3, '11:30'),
      assigned: at(-3, '11:36'),
      accepted: at(-2, '14:20'),
      started: at(-1, '14:06'),
    },
    {
      id: 'task-13',
      title: '에어컨 설치',
      work: 'install',
      status: 'COMPLETED',
      tech: 'parkSeoyeon',
      day: -1,
      start: '10:00',
      minutes: 120,
      customer: 'kimDohyun',
      price: 300000,
      payment: '카드 결제',
      by: 'kimUnyeong',
      created: at(-4, '15:00'),
      assigned: at(-4, '15:06'),
      accepted: at(-3, '09:30'),
      started: at(-1, '10:02'),
      report: {
        at: at(-1, '12:20'),
        memo: '벽걸이 에어컨 1대를 설치했습니다. 실외기 앵글 고정과 배관 보온 작업을 마쳤습니다.',
        parts: '실외기 앵글 1세트, 냉매 배관 5m',
      },
    },
    {
      id: 'task-14',
      title: '보일러 점검',
      work: 'inspect',
      status: 'COMPLETED',
      tech: 'kimMinsu',
      day: -1,
      start: '09:00',
      minutes: 60,
      customer: 'songHayoon',
      price: 50000,
      payment: '현장 결제',
      by: 'parkSeojun',
      created: at(-3, '10:00'),
      assigned: at(-3, '10:05'),
      accepted: at(-3, '13:00'),
      started: at(-1, '09:01'),
      report: { at: at(-1, '09:58'), memo: '보일러 연소 상태와 배기통 연결을 점검했습니다. 이상 없습니다.', parts: '' },
    },
    {
      id: 'task-15',
      title: '냉난방기 필터 교체',
      work: 'repair',
      status: 'COMPLETED',
      tech: 'hongGildong',
      day: -1,
      start: '13:00',
      minutes: 60,
      customer: 'ohYejin',
      price: 60000,
      payment: '계좌 이체',
      by: 'kimUnyeong',
      created: at(-3, '14:10'),
      assigned: at(-3, '14:15'),
      accepted: at(-2, '09:40'),
      started: at(-1, '13:03'),
      report: { at: at(-1, '14:05'), memo: '냉난방기 2대의 필터를 교체하고 송풍 상태를 확인했습니다.', parts: '필터 2개' },
    },
    {
      id: 'task-16',
      title: '전기 배선 점검',
      work: 'inspect',
      status: 'COMPLETED',
      tech: 'kimTaehun',
      day: -1,
      start: '10:00',
      minutes: 120,
      customer: 'jeongMinho',
      price: 140000,
      payment: '계좌 이체',
      by: 'me',
      created: at(-4, '11:00'),
      assigned: at(-4, '11:05'),
      accepted: at(-4, '15:30'),
      started: at(-1, '10:04'),
      report: { at: at(-1, '12:10'), memo: '분전반과 상가 내부 배선을 점검했고 누전 차단기 1개를 교체했습니다.', parts: '누전 차단기 1개' },
    },
    {
      id: 'task-17',
      title: '수도 배관 교체',
      work: 'repair',
      status: 'COMPLETED',
      tech: 'leeCheolho',
      day: -1,
      start: '15:00',
      minutes: 120,
      customer: 'leeSeoyoung',
      price: 210000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-3, '17:00'),
      assigned: at(-3, '17:05'),
      accepted: at(-2, '08:50'),
      started: at(-1, '15:02'),
      report: { at: at(-1, '17:15'), memo: '노후 수도 배관을 교체하고 통수 테스트를 마쳤습니다.', parts: 'PB 배관 8m, 연결 소켓 6개' },
    },
    {
      id: 'task-18',
      title: '전기레인지 설치',
      work: 'install',
      status: 'COMPLETED',
      tech: 'kimMinjun',
      day: -1,
      start: '11:00',
      minutes: 90,
      customer: 'hanJiwon',
      price: 170000,
      payment: '카드 결제',
      by: 'parkSeojun',
      created: at(-3, '12:00'),
      assigned: at(-3, '12:05'),
      accepted: at(-3, '15:00'),
      started: at(-1, '11:03'),
      report: { at: at(-1, '12:40'), memo: '빌트인 전기레인지를 설치하고 전용 회로를 연결했습니다.', parts: '전원 케이블 2m' },
    },
    // 내일·모레
    {
      id: 'task-19',
      title: '빌트인 오븐 설치',
      work: 'install',
      status: 'ACCEPTED',
      tech: 'kimMinjun',
      day: 1,
      start: '10:00',
      minutes: 120,
      customer: 'jangMirae',
      price: 240000,
      payment: '카드 결제',
      by: 'kimUnyeong',
      created: at(-2, '15:40'),
      assigned: at(-2, '15:45'),
      accepted: at(-1, '10:40'),
    },
    {
      id: 'task-20',
      title: '에어컨 분해 세척',
      work: 'repair',
      status: 'PENDING_ACCEPT',
      tech: 'hongGildong',
      day: 1,
      start: '09:00',
      minutes: 120,
      customer: 'songHayoon',
      price: 110000,
      payment: '현장 결제',
      by: 'parkSeojun',
      created: at(-1, '15:00'),
      assigned: at(0, '08:20'),
    },
    {
      id: 'task-21',
      title: '김치냉장고 설치',
      work: 'install',
      status: 'ACCEPTED',
      tech: 'parkSeoyeon',
      day: 1,
      start: '13:00',
      minutes: 90,
      customer: 'ohYejin',
      price: 90000,
      payment: '카드 결제',
      by: 'kimUnyeong',
      created: at(-2, '10:30'),
      assigned: at(-2, '10:35'),
      accepted: at(-2, '12:00'),
    },
    {
      id: 'task-22',
      title: '정수기 점검',
      work: 'inspect',
      status: 'ACCEPTED',
      tech: 'kimMinsu',
      day: 1,
      start: '10:00',
      minutes: 60,
      customer: 'hanSohui',
      price: 40000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-1, '11:00'),
      assigned: at(-1, '11:05'),
      accepted: at(-1, '13:15'),
    },
    {
      id: 'task-23',
      title: '보일러 교체',
      work: 'install',
      status: 'PENDING_ACCEPT',
      tech: 'leeJunhyeok',
      day: 1,
      start: '14:00',
      minutes: 180,
      customer: 'kimDohyun',
      price: 850000,
      payment: '계좌 이체',
      by: 'me',
      created: at(-1, '14:20'),
      assigned: at(-1, '14:25'),
    },
    {
      id: 'task-24',
      title: '스탠드 에어컨 설치',
      work: 'install',
      status: 'ACCEPTED',
      tech: 'leeCheolho',
      day: 2,
      start: '10:00',
      minutes: 120,
      customer: 'leeSeungwoo',
      price: 280000,
      payment: '카드 결제',
      by: 'kimUnyeong',
      created: at(-2, '16:00'),
      assigned: at(-2, '16:05'),
      accepted: at(-1, '09:10'),
    },
    // 지난 완료 작업(기사 작업이력)
    {
      id: 'task-25',
      title: '배관 설치',
      work: 'install',
      status: 'COMPLETED',
      tech: 'kimMinsu',
      day: -2,
      start: '13:00',
      minutes: 120,
      customer: 'kimHajun',
      price: 190000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-5, '09:00'),
      assigned: at(-5, '09:10'),
      accepted: at(-5, '11:00'),
      started: at(-2, '13:02'),
      report: { at: at(-2, '15:30'), memo: '주방 급수·배수 배관을 새로 설치하고 누수 테스트를 마쳤습니다.', parts: 'PB 배관 6m, 엘보 4개' },
    },
    {
      id: 'task-26',
      title: '전기 콘센트 교체',
      work: 'repair',
      status: 'COMPLETED',
      tech: 'leeJunhyeok',
      day: -3,
      start: '11:00',
      minutes: 60,
      customer: 'seoJia',
      price: 50000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-6, '10:00'),
      assigned: at(-6, '10:05'),
      accepted: at(-6, '14:00'),
      started: at(-3, '11:01'),
      report: { at: at(-3, '12:10'), memo: '거실 콘센트 3구를 교체하고 접지 상태를 확인했습니다.', parts: '매입 콘센트 3개' },
    },
    {
      id: 'task-27',
      title: '가스보일러 설치',
      work: 'install',
      status: 'COMPLETED',
      tech: 'parkSeoyeon',
      day: -4,
      start: '10:00',
      minutes: 180,
      customer: 'kwonSoyeon',
      price: 920000,
      payment: '계좌 이체',
      by: 'kimUnyeong',
      created: at(-9, '10:00'),
      assigned: at(-9, '10:10'),
      accepted: at(-8, '09:30'),
      started: at(-4, '10:05'),
      report: { at: at(-4, '13:20'), memo: '콘덴싱 가스보일러를 설치하고 배기통 기밀 점검을 마쳤습니다.', parts: '배기통 1세트, 분배기 1개' },
    },
    {
      id: 'task-28',
      title: '주방 수전 교체',
      work: 'repair',
      status: 'COMPLETED',
      tech: 'hongGildong',
      day: -5,
      start: '10:00',
      minutes: 60,
      customer: 'leeJeongho',
      price: 70000,
      payment: '현장 결제',
      by: 'parkSeojun',
      created: at(-8, '09:00'),
      pastRejection: { by: 'parkSeoyeon', reason: '개인 사정', assigned: at(-8, '09:10'), at: at(-7, '18:20') },
      assigned: at(-6, '09:00'),
      accepted: at(-6, '11:30'),
      started: at(-5, '10:02'),
      report: { at: at(-5, '11:05'), memo: '싱크대 수전을 교체하고 냉·온수 연결을 확인했습니다.', parts: '원홀 수전 1개' },
    },
    {
      id: 'task-29',
      title: '에어컨 가스 충전',
      work: 'repair',
      status: 'COMPLETED',
      tech: 'leeMinjun',
      day: -5,
      start: '15:00',
      minutes: 60,
      customer: 'parkJihun',
      price: 80000,
      payment: '카드 결제',
      by: 'kimUnyeong',
      created: at(-7, '13:00'),
      assigned: at(-7, '13:05'),
      accepted: at(-7, '16:00'),
      started: at(-5, '15:03'),
      report: { at: at(-5, '16:02'), memo: '냉매 압력을 측정하고 가스를 보충했습니다.', parts: 'R410A 냉매 1kg' },
    },
    {
      id: 'task-30',
      title: '벽걸이 에어컨 설치',
      work: 'install',
      status: 'COMPLETED',
      tech: 'parkSeoyeon',
      day: -8,
      start: '13:00',
      minutes: 120,
      customer: 'munTaeyang',
      price: 250000,
      payment: '카드 결제',
      by: 'kimUnyeong',
      created: at(-12, '10:00'),
      assigned: at(-12, '10:05'),
      accepted: at(-11, '09:00'),
      started: at(-8, '13:04'),
      report: { at: at(-8, '15:10'), memo: '안방 벽걸이 에어컨을 설치하고 시운전을 마쳤습니다.', parts: '냉매 배관 4m' },
    },
    {
      id: 'task-31',
      title: '건조기 배기 점검',
      work: 'inspect',
      status: 'COMPLETED',
      tech: 'parkSeoyeon',
      day: -12,
      start: '10:00',
      minutes: 60,
      customer: 'shinDongha',
      price: 45000,
      payment: '현장 결제',
      by: 'parkSeojun',
      created: at(-15, '10:00'),
      assigned: at(-15, '10:05'),
      accepted: at(-14, '09:00'),
      started: at(-12, '10:02'),
      report: { at: at(-12, '10:58'), memo: '배기 호스 막힘을 청소하고 건조 성능을 확인했습니다.', parts: '' },
    },
    {
      id: 'task-32',
      title: '냉장고 설치',
      work: 'install',
      status: 'COMPLETED',
      tech: 'parkSeoyeon',
      day: -21,
      start: '14:00',
      minutes: 90,
      customer: 'baeSujin',
      price: 120000,
      payment: '카드 결제',
      by: 'kimUnyeong',
      created: at(-25, '09:00'),
      assigned: at(-25, '09:05'),
      accepted: at(-24, '10:00'),
      started: at(-21, '14:03'),
      report: { at: at(-21, '15:28'), memo: '양문형 냉장고를 설치하고 수평과 급수를 확인했습니다.', parts: '급수 호스 3m' },
    },
    {
      id: 'task-33',
      title: '냉장고 소음 점검',
      work: 'inspect',
      status: 'COMPLETED',
      tech: 'choiDonguk',
      day: -30,
      start: '10:00',
      minutes: 60,
      customer: 'kangDoyun',
      price: 40000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-33, '10:00'),
      assigned: at(-33, '10:05'),
      accepted: at(-32, '09:00'),
      started: at(-30, '10:02'),
      report: { at: at(-30, '10:55'), memo: '압축기 고정 볼트를 조이고 소음이 줄어든 것을 확인했습니다.', parts: '' },
    },
    // 등록(대기함) — 기사·시간 미지정, 거절, 일부 정보만 있는 작업
    {
      id: DEMO_TASK_IDS.stale,
      title: '인덕션 교체',
      work: 'install',
      status: 'REGISTERED',
      minutes: 120,
      customer: 'kimDohyun',
      price: 200000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-3, '10:00'),
    },
    {
      id: 'task-34',
      title: '배관 점검',
      work: 'inspect',
      status: 'REGISTERED',
      minutes: 60,
      customer: 'seoJia',
      price: 50000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-2, '09:30'),
    },
    {
      id: DEMO_TASK_IDS.rejected,
      title: '세탁기 점검',
      work: 'inspect',
      status: 'REGISTERED',
      minutes: 60,
      customer: 'parkMinji',
      price: 50000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-4, '11:00'),
      rejection: { by: 'kimTaehun', reason: '일정 중복', assigned: at(-2, '14:00'), at: at(-1, '15:15') },
    },
    {
      id: 'task-35',
      title: '가스보일러 점검',
      work: 'inspect',
      status: 'REGISTERED',
      minutes: 60,
      customer: 'songHayoon',
      price: 60000,
      payment: '계좌 이체',
      by: 'parkSeojun',
      created: at(-5, '10:00'),
      rejection: { by: 'leeCheolho', reason: '이동 거리 초과', assigned: at(-4, '09:00'), at: at(-3, '16:40') },
    },
    {
      id: 'task-36',
      title: '에어컨 배관 청소',
      work: 'repair',
      status: 'REGISTERED',
      minutes: 90,
      customer: 'ohYejin',
      price: 90000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-3, '13:00'),
      rejection: { by: 'hongGildong', reason: '부품 수급 지연', assigned: at(-3, '13:10'), at: at(-2, '10:05') },
    },
    {
      id: 'task-37',
      title: '욕실 수전 교체',
      work: 'repair',
      status: 'REGISTERED',
      tech: 'parkSeoyeon',
      minutes: 60,
      customer: 'leeSeoyoung',
      price: 70000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-1, '14:00'),
    },
    {
      id: 'task-38',
      title: '주방 후드 설치',
      work: 'install',
      status: 'REGISTERED',
      tech: 'kimMinsu',
      minutes: 120,
      customer: 'hanJiwon',
      price: 150000,
      payment: '카드 결제',
      by: 'me',
      created: at(-2, '11:00'),
      photos: 2,
    },
    {
      id: 'task-39',
      title: '천장형 에어컨 점검',
      work: 'inspect',
      status: 'REGISTERED',
      day: 3,
      start: '10:00',
      minutes: 120,
      customer: 'jeongMinho',
      price: 130000,
      payment: '계좌 이체',
      by: 'parkSeojun',
      created: at(-1, '10:30'),
    },
    {
      id: 'task-40',
      title: '전기 콘센트 수리',
      work: 'repair',
      status: 'REGISTERED',
      minutes: 60,
      customer: 'kwonSoyeon',
      price: 50000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-5, '15:00'),
    },
    {
      id: 'task-41',
      title: '음식물 처리기 설치',
      work: 'install',
      status: 'REGISTERED',
      minutes: 90,
      customer: 'yunSeoa',
      price: 160000,
      payment: '카드 결제',
      by: 'kimUnyeong',
      created: at(-1, '18:00'),
    },
    // 취소(목록·보드·타임테이블에서 숨김, 알림 상세에서만 보임)
    {
      id: 'task-42',
      title: '정수기 필터 교체',
      work: 'repair',
      status: 'CANCELED',
      minutes: 60,
      customer: 'hanSohui',
      price: 30000,
      payment: '현장 결제',
      by: 'kimUnyeong',
      created: at(-1, '11:20'),
      cancellation: { reason: '고객 요청', at: N3, by: 'kimUnyeong' },
    },
    {
      id: 'task-43',
      title: '에어컨 철거',
      work: 'install',
      status: 'CANCELED',
      tech: 'kimMinsu',
      day: 1,
      start: '08:00',
      minutes: 60,
      customer: 'kangDoyun',
      price: 70000,
      payment: '현장 결제',
      by: 'parkSeojun',
      created: at(-4, '10:00'),
      assigned: at(-4, '10:05'),
      accepted: at(-3, '09:00'),
      cancellation: { reason: '중복 등록', at: at(-2, '17:30'), by: 'parkSeojun' },
    },
  ];
  const tasks = specs.map((spec) => buildTask(spec, T));

  // ── 알림(최신순) ───────────────────────────────────────────────
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const notice = (
    id: string,
    type: NotificationType,
    taskId: string,
    createdAt: IsoDateTime,
    read: boolean,
    extra: { technician?: MemberKey; reason?: string } = {},
  ): AppNotification => {
    const task = taskById.get(taskId)!;
    return {
      id,
      type,
      taskId,
      message: notificationMessage(type, {
        title: task.title,
        technicianName: extra.technician ? PERSON_NAME[extra.technician] : undefined,
        reason: extra.reason,
        schedule: task.date && task.startTime ? scheduleChangePhrase(task.date, task.startTime, null) : undefined,
      }),
      createdAt,
      read,
    };
  };
  const notifications: AppNotification[] = [
    notice('n-01', 'ASSIGNED', 'task-10', N1, false, { technician: 'hongGildong' }),
    notice('n-02', 'SCHEDULE_CHANGED', 'task-09', N2, false),
    notice('n-03', 'CANCELED', 'task-42', N3, true),
    notice('n-04', 'ACCEPTED', DEMO_TASK_IDS.accepted, N4, true, { technician: 'leeMinjun' }),
    notice('n-05', 'REJECTED', DEMO_TASK_IDS.rejected, at(-1, '15:15'), true, { technician: 'kimTaehun', reason: '일정 중복' }),
    notice('n-06', 'REPORTED', 'task-13', at(-1, '12:20'), true, { technician: 'parkSeoyeon' }),
    notice('n-07', 'ACCEPTED', 'task-19', at(-1, '10:40'), true, { technician: 'kimMinjun' }),
    notice('n-08', 'REPORTED', 'task-25', at(-2, '15:30'), true, { technician: 'kimMinsu' }),
    notice('n-09', 'REJECTED', 'task-36', at(-2, '10:05'), true, { technician: 'hongGildong', reason: '부품 수급 지연' }),
    notice('n-10', 'ASSIGNED', DEMO_TASK_IDS.conflict, at(-2, '09:20'), true, { technician: 'leeCheolho' }),
    notice('n-11', 'REJECTED', 'task-35', at(-3, '16:40'), true, { technician: 'leeCheolho', reason: '이동 거리 초과' }),
    notice('n-12', 'REPORTED', 'task-26', at(-3, '12:10'), true, { technician: 'leeJunhyeok' }),
  ];

  // ── 승인대기(최신순) ───────────────────────────────────────────
  const joinRequests: JoinRequest[] = [
    { id: 'jr-01', name: '정하늘', phone: '010-2938-4756', desiredKind: 'TECHNICIAN', confirmedKind: 'TECHNICIAN', requestedAt: at(-1, '14:40'), channel: 'CODE' },
    { id: 'jr-02', name: '오세훈', phone: '010-3049-5867', desiredKind: 'TECHNICIAN', confirmedKind: 'EMPLOYEE', requestedAt: at(-1, '09:12'), channel: 'LINK' },
    { id: 'jr-03', name: '한지우', phone: '010-4150-6978', desiredKind: 'EMPLOYEE', confirmedKind: 'EMPLOYEE', requestedAt: at(-2, '16:22'), channel: 'QR' },
    { id: 'jr-04', name: '윤도현', phone: '010-5261-7089', desiredKind: 'TECHNICIAN', confirmedKind: 'TECHNICIAN', requestedAt: at(-2, '10:05'), channel: 'CODE' },
    { id: 'jr-05', name: '서민재', phone: '010-6372-8190', desiredKind: 'EMPLOYEE', confirmedKind: 'TECHNICIAN', requestedAt: at(-3, '11:48'), channel: 'CODE' },
    { id: 'jr-06', name: '장예린', phone: '010-7483-9201', desiredKind: 'TECHNICIAN', confirmedKind: 'TECHNICIAN', requestedAt: at(-4, '09:30'), channel: 'LINK' },
    { id: 'jr-07', name: '임채원', phone: '010-8594-0312', desiredKind: 'EMPLOYEE', confirmedKind: 'EMPLOYEE', requestedAt: at(-6, '13:15'), channel: 'QR' },
  ];

  return {
    session,
    companies,
    memberships,
    members,
    types,
    tasks,
    notifications,
    joinRequests,
    network: scenario.network,
  };
}
