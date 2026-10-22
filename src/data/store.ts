import { create } from 'zustand';

import { devLogin } from '@/api/devAuth';
import {
  authApi,
  type MemberCategoryPath,
  notificationApi,
  organizationApi,
  profileApi,
  scheduleApi,
} from '@/api/endpoints';
import { ApiError, isApiError, NetworkError } from '@/api/http';
import { clearSession, getAccessToken, getAccountId, getSavedCompanyId, saveCompanyId, saveSession } from '@/api/token';
import type { CreateWorkBody, ProfileDto, WorkBody } from '@/api/types';
import { TYPE_COLOR_ORDER } from '@/data/constants';
import {
  cancelReasonCode,
  dayRange,
  emptyTask,
  fromId,
  ID_PREFIX,
  industryCode,
  industryLabel,
  joinRequestFromDto,
  MEMBER_CATEGORY_COLOR,
  memberFromParticipant,
  notificationFromDto,
  paymentCode,
  type TaskPatch,
  taskFromBacklog,
  taskFromBoardCard,
  taskFromDetail,
  taskFromScheduled,
  taskFromSummary,
  toId,
  toUtcIso,
  typeColorHex,
  typeIdNumber,
  typesFromCategories,
} from '@/data/mappers';
import type {
  AppNotification,
  Company,
  CompanyMembership,
  ID,
  IsoDate,
  JoinRequest,
  Member,
  MemberKind,
  Session,
  Task,
  TaskAssignment,
  TaskInput,
  TypeCategory,
  TypeColor,
  TypeItem,
  TaskStatus,
} from '@/data/types';
import { formatPhone } from '@/lib/format';
import { addDays, toIsoDateTime, today } from '@/lib/date';

/** 배정 변경 결과. 'stale'은 화면을 본 뒤 다른 사람이 작업을 바꿔 서버가 거부한 경우(SCHEDULE-016 '변경된 정보입니다') */
export type AssignResult = 'applied' | 'stale' | 'failed';

/** 작업내역 출력 조건(작업 목록 필터). 비운 조건은 거르지 않는다 */
export interface TaskExportFilter {
  statuses: TaskStatus[];
  technicianId: ID | null;
  workTypeId: ID | null;
  registrantId: ID | null;
  /** 작업 날짜 구간(양 끝 포함, Asia/Seoul) */
  period: { from: IsoDate; to: IsoDate } | null;
}

/**
 * 앱 전역 스토어 계약. 상태(AppState 필드)와 액션 이름은 모든 섹션이 공유한다.
 * 값은 백엔드 API(src/api/endpoints.ts)에서 읽고, 액션은 API를 부른 뒤 다시 읽어 맞춘다. 사용법은 docs/data-layer.md,
 * 화면별 API는 저장소 루트 api-integration-guide.html.
 * 서버 API가 없는 동작(아래 액션 주석의 '화면 안에서만')은 이 탭의 메모리에만 반영되고 새로고침하면 서버 값으로 돌아간다.
 */
export interface AppState {
  session: Session;
  /** 로그인 사용자의 소속 발주사(직원·총관리자 소속). 현재 발주사는 session.currentCompanyId */
  companies: Company[];
  memberships: CompanyMembership[];
  /** 현재 발주사 인력(직원·기사). 로그인 사용자 포함 */
  members: Member[];
  types: TypeItem[];
  tasks: Task[];
  notifications: AppNotification[];
  joinRequests: JoinRequest[];
  /** 마지막 API 호출이 서버에 닿지 못하면 'offline'(타임테이블·진행 보드 연결 실패 화면) */
  network: 'online' | 'offline';
  /** 데이터를 바꾼 횟수. 화면 동기화 훅(src/data/sync.ts)이 이 값이 바뀌면 다시 읽는다. */
  revision: number;
  /** 현재 발주사 작업 목록을 한 번이라도 읽었는지. 주소로 바로 연 작업 상세가 읽기 전에 목록으로 돌아가지 않게 한다. */
  tasksLoaded: boolean;
  /** 현재 발주사 알림을 한 번이라도 읽었는지(주소로 바로 연 알림 상세용) */
  notificationsLoaded: boolean;
  /** 현재 발주사 인력·유형을 한 번이라도 읽었는지(주소로 바로 연 기사 작업이력용) */
  organizationLoaded: boolean;
  /**
   * 탈퇴 가능 여부(GET /profiles/{id}/withdrawal-eligibility). 읽기 전이면 null.
   * soleOwner: 어느 발주사의 유일한 총관리자라 탈퇴할 수 없음(탈퇴 불가 화면 921:3702)
   */
  withdrawalEligibility: { withdrawable: boolean; soleOwner: boolean } | null;

  // 인증·온보딩
  /** 카카오 로그인. 가입을 마치지 않은 계정이면 needsOnboarding=true → 약관 동의 모달부터 진행 */
  loginWithKakao: () => Promise<{ needsOnboarding: boolean }>;
  logout: () => void;
  /** 약관 동의 선택값을 기억한다. 서버는 프로필 입력 뒤에만 약관 동의를 받으므로 registerProfile이 함께 보낸다. */
  agreeTerms: (marketingAgreed: boolean) => void;
  /** 프로필 입력 후 약관 동의까지 보낸다. 성공하면 true */
  registerProfile: (input: { name: string; phone: string }) => Promise<boolean>;
  /** 성공하면 true */
  createCompany: (input: { name: string; industry: string }) => Promise<boolean>;
  /** 온보딩 마지막 단계 완료(건너뛰기 포함) */
  finishOnboarding: () => void;
  switchCompany: (companyId: ID) => void;
  /** 이름·연락처 저장. 프로필 사진은 서버 API가 없어 화면 안에서만 */
  updateProfile: (input: { name: string; phone: string; avatarUrl: string | null }) => Promise<void>;
  /** 탈퇴. 성공하면 true */
  withdrawAccount: (reason: string) => Promise<boolean>;

  // 발주사
  updateCompany: (input: { name: string; industry: string }) => Promise<void>;
  issueJoinCode: () => Promise<void>;
  regenerateJoinCode: () => Promise<void>;

  // 인력
  /** 직원↔기사 역할 변경. 서버 API가 없어 화면 안에서만 */
  changeMemberKind: (memberId: ID, kind: MemberKind, typeId: ID | null) => void;
  setMemberType: (memberId: ID, typeId: ID | null) => Promise<void>;
  /** 총관리자 지정(기존 총관리자는 해제) */
  assignOwner: (memberId: ID) => Promise<void>;
  /** 총관리자 해제 */
  releaseOwner: (memberId: ID) => Promise<void>;
  /** 승인 전 확정 유형 고르기(승인 요청에 함께 보낸다) */
  setJoinRequestKind: (requestId: ID, kind: MemberKind) => void;
  approveJoinRequests: (requestIds: ID[]) => Promise<void>;
  rejectJoinRequests: (requestIds: ID[], reason: string) => Promise<void>;

  // 유형
  addType: (category: TypeCategory, name: string, color?: TypeColor | null) => Promise<ID | null>;
  updateType: (typeId: ID, patch: { name?: string; color?: TypeColor | null }) => Promise<void>;
  /** 활성화·비활성화. 서버에 유형 활성 상태가 없어 화면 안에서만 */
  setTypeActive: (typeId: ID, active: boolean) => void;
  deleteType: (typeId: ID) => Promise<void>;

  // 작업
  /** 등록한 작업 ID. 실패하면 null */
  createTask: (input: TaskInput) => Promise<ID | null>;
  assignTask: (taskId: ID, assignment: TaskAssignment) => Promise<AssignResult>;
  cancelTask: (taskId: ID, reason: string, detail: string) => Promise<void>;
  requestReport: (taskId: ID) => Promise<void>;
  /** 작업내역 출력: 작업 목록 필터와 같은 조건의 엑셀 파일을 내려받는다. 기간은 작업 날짜 [from, to] */
  exportTasks: (filter: TaskExportFilter) => Promise<void>;

  // 알림
  markNotificationRead: (notificationId: ID) => Promise<void>;
  /** 알림 삭제. 서버 API가 없어 화면 안에서만 숨긴다 */
  deleteNotification: (notificationId: ID) => void;

  /** '다시 시도' → 온라인으로 바꾸고 다시 읽는다 */
  setNetwork: (network: 'online' | 'offline') => void;

  // 화면별 읽기(src/data/sync.ts 훅이 부른다)
  loadTaskList: () => Promise<void>;
  loadTimetable: (date: IsoDate) => Promise<void>;
  loadBoard: (date: IsoDate) => Promise<void>;
  loadTaskDetail: (taskId: ID) => Promise<void>;
  loadTechnicianHistory: (memberId: ID) => Promise<void>;
  loadNotifications: () => Promise<void>;
  loadOrganization: () => Promise<void>;
  loadWithdrawalEligibility: () => Promise<void>;
}

// ── 내부 상태(화면 계약 밖) ───────────────────────────────────────────

/**
 * 삭제된 유형 보관함. 작업중·완료 작업은 삭제된 유형 ID를 그대로 유지하므로(Figma 주석 1924:15794, 서버도 같은 규칙)
 * 이름·색을 계속 보여줄 수 있게 남겨 둔다. 셀렉터 selectTypeById가 함께 조회한다.
 */
const deletedTypes = new Map<ID, TypeItem>();

/** 삭제된 유형 조회(작업중·완료 작업의 유형 표시용). 현재 유형 목록에 없을 때만 의미가 있다. */
export function getDeletedType(typeId: ID): TypeItem | undefined {
  return deletedTypes.get(typeId);
}

/** 작업 버전(배정 변경·해제의 expectedVersion). 타임테이블·대기함·상세 응답이 준다. */
const taskVersions = new Map<ID, number>();
/** 상세를 읽은 작업(고객·이력·보고가 채워진 작업) */
const detailedTaskIds = new Set<ID>();
/** 화면 안에서만 바꾼 값(서버 API 없음). 다시 읽어도 유지한다. */
const localTypeActive = new Map<ID, boolean>();
const hiddenNotificationIds = new Set<ID>();
/** 약관 동의 모달의 마케팅 선택값(registerProfile이 약관 동의와 함께 보낸다) */
let pendingMarketingAgreed = false;
/** 로그인 사용자 프로필(연락처·이름) */
let myProfile: ProfileDto | null = null;

const LOGGED_OUT_SESSION: Session = {
  loggedIn: false,
  userId: '',
  isNewUser: false,
  termsAgreed: false,
  currentCompanyId: '',
};

const EMPTY_DATA = {
  companies: [] as Company[],
  memberships: [] as CompanyMembership[],
  members: [] as Member[],
  types: [] as TypeItem[],
  tasks: [] as Task[],
  notifications: [] as AppNotification[],
  joinRequests: [] as JoinRequest[],
};

/** 로그인 사용자가 현재 발주사 직원 목록에 없을 때(참여 인원 API는 총관리자만 볼 수 있다) 쓰는 인력 ID */
const SELF_MEMBER_ID = 'me';

function clearCaches() {
  taskVersions.clear();
  detailedTaskIds.clear();
  deletedTypes.clear();
}

function applyPatches(tasks: Task[], patches: TaskPatch[], options: { replaceAll?: boolean } = {}): Task[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const next = new Map<ID, Task>(options.replaceAll ? [] : byId);
  for (const patch of patches) {
    const previous = next.get(patch.id) ?? byId.get(patch.id) ?? emptyTask(patch.id);
    next.set(patch.id, { ...previous, ...patch.fields });
    if (patch.version !== undefined) taskVersions.set(patch.id, patch.version);
  }
  return [...next.values()];
}

/** 서버 오류는 console.error. 서버에 닿지 못한 경우는 연결 실패 화면이 이미 알리므로 console.warn으로 남긴다. */
function logError(action: string, error: unknown) {
  if (error instanceof ApiError) console.error(`[api] ${action} 실패: ${error.code} ${error.message}`);
  else if (error instanceof NetworkError) console.warn(`[api] ${action} 실패: ${error.message}`);
  else console.error(`[api] ${action} 실패: ${error instanceof Error ? error.message : String(error)}`);
}

// ── 스토어 ─────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()((set, get) => {
  const organizationId = () => fromId(get().session.currentCompanyId, ID_PREFIX.plain);
  const accountId = () => getAccountId();
  const bump = () => set((s) => ({ revision: s.revision + 1 }));

  /** 실패 처리: 서버에 닿지 못하면 network='offline', 토큰이 무효(401·COMMON-404·AUTH-004)면 로그아웃, 콘솔에 서버 오류 코드를 남긴다. */
  function handleFailure(action: string, error: unknown) {
    if (error instanceof NetworkError) {
      set({ network: 'offline' });
    } else if (
      error instanceof ApiError &&
      (error.status === 401 || error.code === 'COMMON-404' || error.code === 'AUTH-004')
    ) {
      resetSession();
    }
    logError(action, error);
  }

  /** API 호출 공통 처리. 실패하면 undefined(오류 안내 시안이 없어 화면에는 표시하지 않는다). */
  async function call<T>(action: string, run: () => Promise<T>): Promise<T | undefined> {
    try {
      const result = await run();
      if (get().network === 'offline') set({ network: 'online' });
      return result;
    } catch (error) {
      handleFailure(action, error);
      return undefined;
    }
  }

  /** 현재 발주사 조직 ID. 없으면 오류 */
  function requireOrg(): number {
    const id = organizationId();
    if (id == null) throw new Error('현재 발주사가 없습니다.');
    return id;
  }

  function resetSession() {
    clearSession();
    clearCaches();
    myProfile = null;
    set({
      session: LOGGED_OUT_SESSION,
      ...EMPTY_DATA,
      tasksLoaded: false,
      notificationsLoaded: false,
      organizationLoaded: false,
      withdrawalEligibility: null,
    });
  }

  const memberLookup = (id: ID) => get().members.find((m) => m.id === id);

  function selfMember(): Member {
    return {
      id: SELF_MEMBER_ID,
      name: myProfile?.name ?? '',
      phone: formatPhone(myProfile?.phoneNumber ?? ''),
      kind: 'EMPLOYEE',
      typeId: null,
      isOwner: false,
      status: 'ACTIVE',
      joinedAt: toIsoDateTime(myProfile?.signedUpAt ?? Date.now()),
      avatarUrl: null,
    };
  }

  /** 내 소속 목록과 현재 발주사를 읽는다. 사무실 웹이라 직원·총관리자 소속만 쓴다. */
  async function loadMemberships(): Promise<void> {
    const result = await call('내 소속 목록', () => organizationApi.myMemberships());
    if (!result) return;
    const office = result.memberships.filter((m) => m.role !== 'TECHNICIAN' && m.status === 'ACTIVE');
    const memberships: CompanyMembership[] = office.map((m) => ({
      companyId: toId(ID_PREFIX.plain, m.organizationId),
      companyName: m.organizationName,
      role: m.role === 'OWNER' ? 'OWNER' : 'STAFF',
    }));
    const saved = getSavedCompanyId();
    const current = get().session.currentCompanyId;
    const currentCompanyId =
      memberships.find((m) => m.companyId === current)?.companyId ??
      memberships.find((m) => m.companyId === saved)?.companyId ??
      memberships[0]?.companyId ??
      '';
    saveCompanyId(currentCompanyId || null);
    set((s) => ({
      memberships,
      companies: memberships.map((m) => {
        const known = s.companies.find((c) => c.id === m.companyId);
        return known ? { ...known, name: m.companyName } : { id: m.companyId, name: m.companyName, industry: '', joinCode: null, joinLink: null };
      }),
      session: { ...s.session, currentCompanyId },
    }));
  }

  /** 로그인 직후·새로고침·발주사 전환 때 현재 발주사의 모든 화면 공통 데이터를 읽는다. */
  async function loadCompanyData(): Promise<void> {
    await get().loadOrganization();
    await Promise.all([get().loadTaskList(), get().loadNotifications()]);
  }

  /** 저장된 토큰으로 세션을 되살린다(앱 시작). 가입을 마치지 않았으면 로그아웃 상태로 두고 온보딩을 이어 간다. */
  async function restoreSession(): Promise<void> {
    const id = accountId();
    if (!getAccessToken() || id == null) return;
    const me = await call('현재 계정', () => authApi.me());
    if (!me) return;
    const profile = await call('내 프로필', () => profileApi.get(id));
    if (!profile) return;
    myProfile = profile;
    if (profile.nextStep !== 'COMPLETED') {
      set({ session: { ...LOGGED_OUT_SESSION, isNewUser: true, termsAgreed: false } });
      return;
    }
    set((s) => ({ session: { ...s.session, loggedIn: true, isNewUser: false, termsAgreed: true } }));
    await loadMemberships();
    await loadCompanyData();
  }

  async function reloadWork(taskId: ID) {
    await get().loadTaskDetail(taskId);
    await get().loadTaskList();
    bump();
  }

  /** 작업 등록 본문(POST /works)의 기본정보 */
  function workBody(input: TaskInput): WorkBody {
    const { customer, price } = input;
    const method = paymentCode(input.paymentMethod);
    return {
      name: input.title.trim(),
      workTypeId: typeIdNumber(input.workTypeId),
      customer: customer
        ? {
            name: customer.name || undefined,
            phone: customer.phone || undefined,
            postalCode: customer.zipCode || undefined,
            address: customer.address || undefined,
            addressDetail: customer.addressDetail || undefined,
          }
        : null,
      payment: price != null || method ? { fee: price, method } : null,
    };
  }

  const categoryPath = (category: Exclude<TypeCategory, 'WORK'>): MemberCategoryPath =>
    category === 'EMPLOYEE' ? 'staff-categories' : 'technician-categories';

  // 앱 시작: 저장된 토큰이 있으면 로그인 상태로 그리고 서버로 확인한다.
  queueMicrotask(() => void restoreSession());

  return {
    session: { ...LOGGED_OUT_SESSION, loggedIn: Boolean(getAccessToken()), termsAgreed: Boolean(getAccessToken()) },
    ...EMPTY_DATA,
    network: 'online',
    revision: 0,
    tasksLoaded: false,
    notificationsLoaded: false,
    organizationLoaded: false,
    withdrawalEligibility: null,

    // ── 인증·온보딩 ──
    loginWithKakao: async () => {
      // TEMP-DEV-AUTH: 카카오 OAuth 설정 전 임시 로그인(src/api/devAuth.ts). 실제 연동 시 카카오 id_token → authApi.kakaoLogin으로 바꾼다.
      const login = await call('로그인', () => devLogin());
      if (!login) return { needsOnboarding: false };
      saveSession(login.accessToken, login.accountId);
      const profile = await call('내 프로필', () => profileApi.get(login.accountId));
      if (!profile) return { needsOnboarding: false };
      myProfile = profile;
      if (profile.nextStep !== 'COMPLETED') {
        set({ session: { ...LOGGED_OUT_SESSION, isNewUser: true, termsAgreed: false } });
        return { needsOnboarding: true };
      }
      set({ session: { ...LOGGED_OUT_SESSION, loggedIn: true, termsAgreed: true } });
      await loadMemberships();
      void loadCompanyData();
      return { needsOnboarding: false };
    },

    logout: () => {
      if (getAccessToken()) void authApi.logout().catch((error) => logError('로그아웃', error));
      resetSession();
    },

    agreeTerms: (marketingAgreed) => {
      pendingMarketingAgreed = marketingAgreed;
      set((s) => ({ session: { ...s.session, termsAgreed: true } }));
    },

    registerProfile: async ({ name, phone }) => {
      const id = accountId();
      if (id == null) return false;
      const saved = await call('프로필 입력', () =>
        profileApi.save(id, { name: name.trim(), phoneNumber: phone.replace(/\D/g, '') }),
      );
      if (!saved) return false;
      const agreed = await call('약관 동의', () =>
        profileApi.agreeToTerms(id, { serviceTerms: true, privacyPolicy: true, marketing: pendingMarketingAgreed }),
      );
      if (agreed) myProfile = agreed;
      return Boolean(agreed);
    },

    createCompany: async ({ name, industry }) => {
      const created = await call('발주사 생성', () =>
        organizationApi.create({ name: name.trim(), industry: industryCode(industry) }),
      );
      if (!created) return false;
      saveCompanyId(toId(ID_PREFIX.plain, created.organizationId));
      set((s) => ({ session: { ...s.session, currentCompanyId: toId(ID_PREFIX.plain, created.organizationId) } }));
      await loadMemberships();
      await loadCompanyData();
      return true;
    },

    finishOnboarding: () => {
      set((s) => ({ session: { ...s.session, isNewUser: false, termsAgreed: true, loggedIn: true } }));
      void loadMemberships().then(loadCompanyData);
    },

    switchCompany: (companyId) => {
      const s = get();
      if (companyId === s.session.currentCompanyId || !s.memberships.some((m) => m.companyId === companyId)) return;
      saveCompanyId(companyId);
      clearCaches();
      set({
        session: { ...s.session, currentCompanyId: companyId },
        members: [],
        types: [],
        tasks: [],
        notifications: [],
        joinRequests: [],
        tasksLoaded: false,
        notificationsLoaded: false,
        organizationLoaded: false,
      });
      void loadCompanyData().then(bump);
    },

    updateProfile: async ({ name, phone, avatarUrl }) => {
      const id = accountId();
      if (id == null) return;
      const saved = await call('프로필 수정', () =>
        profileApi.save(id, { name: name.trim(), phoneNumber: phone.replace(/\D/g, '') }),
      );
      if (!saved) return;
      myProfile = saved;
      const userId = get().session.userId;
      set((s) => ({
        members: s.members.map((m) =>
          m.id === userId ? { ...m, name: saved.name ?? m.name, phone: formatPhone(saved.phoneNumber ?? ''), avatarUrl } : m,
        ),
      }));
    },

    withdrawAccount: async (reason) => {
      const id = accountId();
      if (id == null) return false;
      const done = await call('탈퇴', async () => {
        await profileApi.withdraw(id, reason);
        return true;
      });
      if (done) resetSession();
      return Boolean(done);
    },

    // ── 발주사 ──
    updateCompany: async ({ name, industry }) => {
      const updated = await call('발주사 정보 수정', () =>
        organizationApi.update(requireOrg(), { name: name.trim(), industry: industryCode(industry) }),
      );
      if (!updated) return;
      const companyId = get().session.currentCompanyId;
      set((s) => ({
        companies: s.companies.map((c) =>
          c.id === companyId ? { ...c, name: updated.name, industry: industryLabel(updated.industry) } : c,
        ),
        memberships: s.memberships.map((m) => (m.companyId === companyId ? { ...m, companyName: updated.name } : m)),
      }));
    },

    issueJoinCode: async () => {
      // 서버는 발주사를 만들 때 회사 코드를 함께 발급한다. 코드가 아직 화면에 없으면 조회만 한다.
      await get().loadOrganization();
    },

    regenerateJoinCode: async () => {
      const changed = await call('회사 코드 변경', () => organizationApi.changeCompanyCode(requireOrg()));
      if (!changed) return;
      const companyId = get().session.currentCompanyId;
      set((s) => ({
        companies: s.companies.map((c) =>
          c.id === companyId ? { ...c, joinCode: changed.companyCode, joinLink: joinLinkFor(changed.companyCode) } : c,
        ),
      }));
    },

    // ── 인력 ──
    changeMemberKind: (memberId, kind, typeId) =>
      set((s) => ({
        members: s.members.map((m) =>
          m.id === memberId ? { ...m, kind, typeId, isOwner: kind === 'EMPLOYEE' ? m.isOwner : false } : m,
        ),
      })),

    setMemberType: async (memberId, typeId) => {
      const staff = fromId(memberId, ID_PREFIX.staff);
      const technician = fromId(memberId, ID_PREFIX.technician);
      const categoryId = typeIdNumber(typeId);
      const done = await call('세부 유형 지정', async () => {
        if (staff != null) await organizationApi.assignStaffCategory(requireOrg(), staff, categoryId);
        else if (technician != null) await organizationApi.assignTechnicianCategory(requireOrg(), technician, categoryId);
        return true;
      });
      if (done) await get().loadOrganization();
    },

    assignOwner: async (memberId) => {
      const target = fromId(memberId, ID_PREFIX.staff);
      if (target == null) return;
      const previousOwners = get()
        .members.filter((m) => m.isOwner && m.id !== memberId)
        .map((m) => fromId(m.id, ID_PREFIX.staff))
        .filter((id): id is number => id != null);
      const done = await call('총관리자 지정', async () => {
        const org = requireOrg();
        await organizationApi.designateOwner(org, target);
        for (const owner of previousOwners) await organizationApi.revokeOwner(org, owner);
        return true;
      });
      if (!done) return;
      await loadMemberships();
      await get().loadOrganization();
    },

    releaseOwner: async (memberId) => {
      const target = fromId(memberId, ID_PREFIX.staff);
      if (target == null) return;
      const done = await call('총관리자 해제', async () => {
        await organizationApi.revokeOwner(requireOrg(), target);
        return true;
      });
      if (!done) return;
      await loadMemberships();
      await get().loadOrganization();
    },

    setJoinRequestKind: (requestId, kind) =>
      set((s) => ({ joinRequests: s.joinRequests.map((r) => (r.id === requestId ? { ...r, confirmedKind: kind } : r)) })),

    approveJoinRequests: async (requestIds) => {
      const ids = new Set(requestIds);
      const approvals = get()
        .joinRequests.filter((r) => ids.has(r.id))
        .map((r) => ({
          requestId: Number(r.id),
          confirmedType: r.confirmedKind === 'TECHNICIAN' ? ('TECHNICIAN' as const) : ('STAFF' as const),
        }));
      if (!approvals.length) return;
      await call('참여 요청 승인', () => organizationApi.approveRequests(requireOrg(), approvals));
      await get().loadOrganization();
    },

    rejectJoinRequests: async (requestIds, reason) => {
      if (!requestIds.length) return;
      await call('참여 요청 거절', () => organizationApi.rejectRequests(requireOrg(), requestIds.map(Number), reason.trim()));
      await get().loadOrganization();
    },

    // ── 유형 ──
    addType: async (category, name, color) => {
      const org = organizationId();
      if (org == null) return null;
      const body = { name: name.trim(), color: MEMBER_CATEGORY_COLOR };
      if (category === 'WORK') {
        const used = new Set(get().types.filter((t) => t.category === 'WORK').map((t) => t.color));
        body.color = typeColorHex(color ?? TYPE_COLOR_ORDER.find((c) => !used.has(c)) ?? 'GRAY');
      }
      const created = await call('유형 추가', async () =>
        category === 'WORK'
          ? toId(ID_PREFIX.workType, (await organizationApi.createWorkType(org, body)).workTypeId)
          : toId(
              category === 'EMPLOYEE' ? ID_PREFIX.staffType : ID_PREFIX.technicianType,
              (await organizationApi.createCategory(org, categoryPath(category), body)).categoryId,
            ),
      );
      await get().loadOrganization();
      return created ?? null;
    },

    updateType: async (typeId, patch) => {
      const type = get().types.find((t) => t.id === typeId);
      const numeric = typeIdNumber(typeId);
      if (!type || numeric == null) return;
      const body = {
        name: (patch.name ?? type.name).trim(),
        color: type.category === 'WORK' ? typeColorHex(patch.color !== undefined ? patch.color : type.color) : MEMBER_CATEGORY_COLOR,
      };
      await call('유형 수정', async () => {
        if (type.category === 'WORK') await organizationApi.updateWorkType(requireOrg(), numeric, body);
        else await organizationApi.updateCategory(requireOrg(), categoryPath(type.category), numeric, body);
      });
      await get().loadOrganization();
    },

    setTypeActive: (typeId, active) => {
      localTypeActive.set(typeId, active);
      set((s) => ({ types: s.types.map((t) => (t.id === typeId ? { ...t, active } : t)) }));
    },

    deleteType: async (typeId) => {
      const type = get().types.find((t) => t.id === typeId);
      const numeric = typeIdNumber(typeId);
      if (!type || numeric == null) return;
      const done = await call('유형 삭제', async () => {
        if (type.category === 'WORK') await organizationApi.deleteWorkType(requireOrg(), numeric);
        else await organizationApi.deleteCategory(requireOrg(), categoryPath(type.category), numeric);
        return true;
      });
      if (!done) return;
      deletedTypes.set(typeId, type);
      await get().loadOrganization();
      if (type.category === 'WORK') {
        await get().loadTaskList();
        bump();
      }
    },

    // ── 작업 ──
    createTask: async (input) => {
      const org = organizationId();
      if (org == null) return null;
      const scheduled = input.technicianId || input.startTime || input.durationMinutes;
      const body: CreateWorkBody = {
        // 사진 업로드 API가 없어 고른 현장 사진(sitePhotoUrls)은 보낼 수 없다(sitePhotoIds는 업로드를 마친 파일 식별자).
        ...workBody(input),
        schedule: scheduled
          ? {
              technicianId: fromId(input.technicianId, ID_PREFIX.technician),
              startTime: input.date && input.startTime ? toUtcIso(input.date, input.startTime) : null,
              expectedDurationMinutes: input.durationMinutes,
              // 등록 모달에는 일정 충돌 확인 시안이 없어 겹쳐도 그대로 등록한다(연동 전과 같은 동작).
              conflictConfirmed: true,
            }
          : undefined,
      };
      const created = await call('작업 등록', () => scheduleApi.create(org, body));
      if (!created?.workId) return null;
      const id = toId(ID_PREFIX.plain, created.workId);
      await reloadWork(id);
      return id;
    },

    assignTask: async (taskId, assignment) => {
      const technicianNumber = fromId(assignment.technicianId, ID_PREFIX.technician);
      if (!taskVersions.has(taskId)) await get().loadTaskDetail(taskId);
      const version = taskVersions.get(taskId);
      if (technicianNumber == null || version === undefined) return 'failed';
      try {
        const result = await scheduleApi.changeAssignment(requireOrg(), Number(taskId), {
          technicianId: technicianNumber,
          startTime: toUtcIso(assignment.date, assignment.startTime),
          expectedDurationMinutes: assignment.durationMinutes,
          // 타임테이블은 놓기 전에 일정 충돌 경고(1325:10373)로 사용자 확인을 받으므로 확인한 것으로 보낸다.
          conflictConfirmed: true,
          expectedVersion: version,
        });
        await reloadWork(taskId);
        return result.applied ? 'applied' : 'failed';
      } catch (error) {
        if (isApiError(error, 'SCHEDULE-016')) return 'stale';
        if (isApiError(error, 'SCHEDULE-008')) return 'applied'; // 같은 기사·같은 시간: 바뀐 것이 없다
        handleFailure('배정 변경', error);
        return 'failed';
      }
    },

    cancelTask: async (taskId, reason, detail) => {
      const code = cancelReasonCode(reason);
      await call('작업 취소', () =>
        scheduleApi.cancel(requireOrg(), Number(taskId), { reason: code, note: code === 'OTHER' ? detail.trim() : undefined }),
      );
      await reloadWork(taskId);
    },

    requestReport: async (taskId) => {
      await call('완료 보고 요청', () => scheduleApi.requestCompletionReport(requireOrg(), Number(taskId)));
      await reloadWork(taskId);
    },

    exportTasks: async (filter) => {
      const org = organizationId();
      if (org == null) return;
      const blob = await call('작업내역 출력', () =>
        scheduleApi.exportWorks(org, {
          statuses: filter.statuses,
          technicianId: fromId(filter.technicianId, ID_PREFIX.technician) ?? undefined,
          workTypeId: typeIdNumber(filter.workTypeId) ?? undefined,
          registrarId: fromId(filter.registrantId, ID_PREFIX.staff) ?? undefined,
          startFrom: filter.period ? toUtcIso(filter.period.from, '00:00') : undefined,
          startTo: filter.period ? toUtcIso(addDays(filter.period.to, 1), '00:00') : undefined,
          sort: 'LAST_MODIFIED_DESC',
        }),
      );
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `작업내역_${today()}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    },

    // ── 알림 ──
    markNotificationRead: async (notificationId) => {
      const target = get().notifications.find((n) => n.id === notificationId);
      if (!target || target.read) return;
      set((s) => ({ notifications: s.notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n)) }));
      await call('알림 읽음', () => notificationApi.read(Number(notificationId)));
    },

    deleteNotification: (notificationId) => {
      hiddenNotificationIds.add(notificationId);
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== notificationId) }));
    },

    setNetwork: (network) => {
      set({ network });
      // 실패한 동안 못 읽은 공통 데이터(소속·인력·유형·작업·알림)를 다시 읽고, 보고 있는 화면도 다시 읽게 한다.
      if (network === 'online') void loadMemberships().then(loadCompanyData).then(bump);
    },

    // ── 화면별 읽기 ──
    loadOrganization: async () => {
      const org = organizationId();
      const membership = get().memberships.find((m) => m.companyId === get().session.currentCompanyId);
      if (org == null || !membership) return;
      const owner = membership.role === 'OWNER';
      const [staffTypes, technicianTypes, workTypes, organization, code, participants, requests] = await Promise.all([
        call('직원 유형', () => organizationApi.categories(org, 'staff-categories')),
        call('기사 유형', () => organizationApi.categories(org, 'technician-categories')),
        call('작업 유형', () => organizationApi.workTypes(org)),
        // 아래 넷은 총관리자만 볼 수 있다(직원이면 ORGANIZATION-003).
        owner ? call('발주사 정보', () => organizationApi.get(org)) : undefined,
        owner ? call('회사 코드', () => organizationApi.companyCode(org)) : undefined,
        owner ? call('참여 인원', () => organizationApi.participants(org)) : undefined,
        owner ? call('승인 대기', () => organizationApi.pendingRequests(org)) : undefined,
      ]);
      const myAccount = accountId();
      const types = [
        ...typesFromCategories('EMPLOYEE', staffTypes?.categories ?? []),
        ...typesFromCategories('TECHNICIAN', technicianTypes?.categories ?? []),
        ...typesFromCategories('WORK', workTypes?.workTypes ?? []),
      ].map((t) => (localTypeActive.has(t.id) ? { ...t, active: localTypeActive.get(t.id)! } : t));
      const rows = participants?.participants ?? [];
      const mine = rows.find((p) => p.accountId === myAccount && p.role !== 'TECHNICIAN');
      const phone = formatPhone(myProfile?.phoneNumber ?? '');
      let members = rows.map((p) => {
        const member = memberFromParticipant(p);
        return p === mine ? { ...member, phone } : member;
      });
      if (!mine) members = [...members, selfMember()];
      const userId = mine ? toId(ID_PREFIX.staff, mine.memberId) : SELF_MEMBER_ID;
      set((s) => ({
        types,
        members: members.map((m) => {
          const previous = s.members.find((p) => p.id === m.id);
          return previous?.avatarUrl ? { ...m, avatarUrl: previous.avatarUrl } : m;
        }),
        joinRequests: (requests?.requests ?? []).map((r) => {
          const request = joinRequestFromDto(r);
          const previous = s.joinRequests.find((p) => p.id === request.id);
          return previous ? { ...request, confirmedKind: previous.confirmedKind } : request;
        }),
        companies: s.companies.map((c) =>
          c.id === s.session.currentCompanyId
            ? {
                ...c,
                name: organization?.name ?? c.name,
                industry: organization ? industryLabel(organization.industry) : c.industry,
                joinCode: code?.companyCode ?? c.joinCode,
                joinLink: code ? joinLinkFor(code.companyCode) : c.joinLink,
              }
            : c,
        ),
        session: { ...s.session, userId },
        organizationLoaded: true,
      }));
    },

    loadTaskList: async () => {
      const org = organizationId();
      if (org == null) return;
      // 작업 목록 화면은 기존 필터·쪽 나눔을 화면에서 하므로 취소를 포함한 모든 작업을 최근 수정 순으로 모두 읽는다.
      const result = await call('작업 목록', async () => {
        const works = [];
        for (let page = 0; ; page += 1) {
          const res = await scheduleApi.searchWorks(org, {
            statuses: ['REGISTERED', 'PENDING_ACCEPT', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'],
            sort: 'LAST_MODIFIED_DESC',
            page,
            size: 100,
          });
          works.push(...res.works);
          if ((page + 1) * res.size >= res.totalCount || res.works.length === 0) break;
        }
        const backlog = await scheduleApi.backlog(org, 0, 100);
        return { works, backlog };
      });
      if (!result) return;
      set((s) => {
        const tasks = applyPatches(s.tasks, result.works.map(taskFromSummary), { replaceAll: true });
        const byId = new Map(tasks.map((t) => [t.id, t]));
        return {
          tasksLoaded: true,
          tasks: applyPatches(
            tasks,
            result.backlog.works.map((w) => taskFromBacklog(w, byId.get(toId(ID_PREFIX.plain, w.workId)))),
          ),
        };
      });
    },

    loadTimetable: async (date) => {
      const org = organizationId();
      if (org == null) return;
      const { from, to } = dayRange(date);
      const result = await call('타임테이블', () => scheduleApi.timetable(org, from, to));
      if (!result) return;
      set((s) => {
        const byId = new Map(s.tasks.map((t) => [t.id, t]));
        return {
          tasks: applyPatches(s.tasks, [
            ...result.scheduledWorks.map(taskFromScheduled),
            ...result.backlog.map((w) => taskFromBacklog(w, byId.get(toId(ID_PREFIX.plain, w.workId)))),
          ]),
        };
      });
    },

    loadBoard: async (date) => {
      const org = organizationId();
      if (org == null) return;
      const { from, to } = dayRange(date);
      const result = await call('진행 보드', () => scheduleApi.progressBoard(org, from, to));
      if (!result) return;
      set((s) => {
        const byId = new Map(s.tasks.map((t) => [t.id, t]));
        const patches = result.columns
          // 등록 열(미리 입력한 시간이 오늘인 대기함 작업)은 화면 보드 표에 나오지 않는다(isScheduledStatus).
          .filter((column) => column.status !== 'REGISTERED')
          .flatMap((column) =>
            column.cards.map((card) => taskFromBoardCard(card, column.status, byId.get(toId(ID_PREFIX.plain, card.workId)))),
          );
        return { tasks: applyPatches(s.tasks, patches) };
      });
    },

    loadTaskDetail: async (taskId) => {
      const org = organizationId();
      const workId = fromId(taskId, ID_PREFIX.plain);
      if (org == null || workId == null) return;
      const detail = await call('작업 상세', () => scheduleApi.detail(org, workId));
      if (!detail) return;
      detailedTaskIds.add(taskId);
      set((s) => ({ tasks: applyPatches(s.tasks, [taskFromDetail(detail, memberLookup)]) }));
    },

    loadTechnicianHistory: async (memberId) => {
      // 기사 작업이력은 작업 상세의 배정 이력(완료·거절)으로 그린다. 이 기사가 맡은 작업, 완료 작업(다른 기사가 이어 완료한
      // 작업에 이 기사의 거절이 남아 있을 수 있음), 거절로 돌아온 작업의 상세를 읽는다.
      const targets = get().tasks.filter(
        (t) =>
          !detailedTaskIds.has(t.id) &&
          (t.technicianId === memberId || t.status === 'COMPLETED' || (t.status === 'REGISTERED' && t.rejection)),
      );
      await Promise.all(targets.map((t) => get().loadTaskDetail(t.id)));
    },

    loadWithdrawalEligibility: async () => {
      const id = accountId();
      if (id == null) return;
      const result = await call('탈퇴 가능 여부', () => profileApi.withdrawalEligibility(id));
      if (!result) return;
      set({
        withdrawalEligibility: {
          withdrawable: result.withdrawable,
          soleOwner: result.blocks.some((b) => b.reason === 'SOLE_OWNER'),
        },
      });
    },

    loadNotifications: async () => {
      const org = organizationId();
      const result = await call('알림 목록', async () => {
        const list = [];
        for (let page = 0; ; page += 1) {
          const res = await notificationApi.list(page, 100);
          list.push(...res.notifications);
          if ((page + 1) * res.size >= res.totalCount || res.notifications.length === 0) break;
        }
        return list;
      });
      if (!result) return;
      // 알림센터는 계정 단위라 여러 발주사 알림이 섞여 온다. 화면은 발주사별이므로 현재 발주사 알림만 보인다.
      const notifications = result
        .filter((n) => n.organizationId === org)
        .map(notificationFromDto)
        .filter((n): n is AppNotification => n !== null && !hiddenNotificationIds.has(n.id));
      set({ notifications, notificationsLoaded: true });
    },
  };
});

/** 회사 코드의 영구 참여 링크. 서버는 링크를 따로 발급하지 않고 회사 코드로 참여를 확인한다. */
function joinLinkFor(code: string): string {
  return `https://orbit.app/join/${code}`;
}
