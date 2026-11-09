import { matchPath } from 'react-router-dom';
import { create } from 'zustand';

import {
  authApi,
  type MemberCategoryPath,
  notificationApi,
  organizationApi,
  profileApi,
  scheduleApi,
} from '@/api/endpoints';
import { ApiError, isApiError, NetworkError, uploadFile } from '@/api/http';
import {
  clearSession,
  getAccessToken,
  getAccountId,
  getRefreshToken,
  getSavedCompanyId,
  saveCompanyId,
  savePendingKakaoLogin,
  saveSession,
  takePendingKakaoLogin,
} from '@/api/token';
import type { CreateWorkBody, LoginDto, ProfileDto, WorkBody, WorkHistoryStatus } from '@/api/types';
import { TYPE_COLOR_ORDER } from '@/data/constants';
import { sitePhotoContentType } from '@/data/rules';
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
  memberFromTechnician,
  monthRanges,
  notificationFromDto,
  paymentCode,
  type TaskPatch,
  taskFromBacklog,
  taskFromBoardCard,
  taskFromDetail,
  taskFromScheduled,
  taskFromSummary,
  technicianHistoryRows,
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
  TechnicianHistory,
  TechnicianHistoryRow,
  TypeCategory,
  TypeColor,
  TypeItem,
  TaskStatus,
} from '@/data/types';
import { formatPhone } from '@/lib/format';
import { addDays, startOfMonth, toIsoDateTime, today } from '@/lib/date';
import { createPkcePair } from '@/lib/pkce';

/** 카카오 웹 로그인 복귀 주소(서버 KAKAO_WEB_RETURN_URI의 경로) */
export const KAKAO_CALLBACK_PATH = '/login/kakao';

/** 카카오 웹 로그인 복귀 결과. returnTo는 로그인을 시작할 때 넘긴 경로(시작 정보가 없으면 null) */
export interface KakaoLoginResult {
  /** loggedIn: 로그인 완료, onboarding: 가입 전 계정(약관 동의부터), failed: 실패·취소 */
  status: 'loggedIn' | 'onboarding' | 'failed';
  returnTo: string | null;
}

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
  /** 마지막으로 읽은 기사 작업이력(GET /work-history). 읽기 전이면 null */
  technicianHistory: TechnicianHistory | null;

  // 인증·온보딩
  /** 카카오 웹 로그인 시작. PKCE를 만들어 이 탭에 두고 서버 authorize(→ 카카오 로그인 페이지)로 이동한다. returnTo: 로그인 뒤 갈 경로 */
  startKakaoLogin: (returnTo: string) => Promise<void>;
  /**
   * 카카오 웹 로그인 복귀(/login/kakao?code=… 또는 ?error=…). 교환 코드를 Access Token으로 바꾸고 프로필·소속을 읽는다.
   * 가입을 마치지 않은 계정이면 status='onboarding' → 약관 동의 모달부터 진행. 교환에 성공하면 이 탭의 이전 세션을 로그아웃하고,
   * 교환이 실패하면 이전 세션을 복원한다.
   */
  completeKakaoLogin: (callback: { code: string | null; error: string | null }) => Promise<KakaoLoginResult>;
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
  /** 실시간 갱신 신호(작업 저장·재연결)를 받으면 보고 있는 화면이 다시 읽게 한다 */
  refreshScreens: () => void;

  // 화면별 읽기(src/data/sync.ts 훅이 부른다)
  loadTaskList: () => Promise<void>;
  loadTimetable: (date: IsoDate) => Promise<void>;
  loadBoard: (date: IsoDate) => Promise<void>;
  loadTaskDetail: (taskId: ID) => Promise<void>;
  /** 기사 작업이력: from이 속한 달부터 이번 달까지(이번 달 집계 포함) */
  loadTechnicianHistory: (memberId: ID, from: IsoDate) => Promise<void>;
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
/** 기사 작업이력 읽기 순번. 기간을 빠르게 바꿔도 마지막 요청의 결과만 남긴다 */
let technicianHistoryRequest = 0;
/** 작업 이력의 상태 조건. 거절했다가 다시 배정받아 완료한 작업은 두 조건 모두에 들어 결과마다 따로 읽는다 */
const HISTORY_RESULTS: readonly WorkHistoryStatus[] = ['COMPLETED', 'REJECTED'];
/** 화면 안에서만 바꾼 값(서버 API 없음). 다시 읽어도 유지한다. */
const localTypeActive = new Map<ID, boolean>();
const hiddenNotificationIds = new Set<ID>();
/** 약관 동의 모달의 마케팅 선택값(registerProfile이 약관 동의와 함께 보낸다) */
let pendingMarketingAgreed = false;
/** 로그인 사용자 프로필(연락처·이름) */
let myProfile: ProfileDto | null = null;
/** 처리 중인 카카오 복귀. 같은 복귀 주소를 두 번 처리해도(StrictMode 효과 재실행) 일회성 교환 코드는 한 번만 보낸다. */
let kakaoCompletion: { key: string; result: Promise<KakaoLoginResult> } | null = null;

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
      technicianHistory: null,
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

  /** completeKakaoLogin 본체. 서버가 실패를 error(AUTH-xxx)로 돌려보냈으면 교환하지 않는다. */
  async function finishKakaoLogin({
    code,
    error,
  }: {
    code: string | null;
    error: string | null;
  }): Promise<KakaoLoginResult> {
    const pending = takePendingKakaoLogin();
    const failed: KakaoLoginResult = { status: 'failed', returnTo: pending?.returnTo ?? null };
    if (!code || !pending) {
      // 사용자가 카카오 로그인을 취소한 경우(AUTH-008)는 오류로 남기지 않는다.
      if (code) logError('카카오 로그인', new Error('이 탭에서 시작한 로그인 정보가 없습니다.'));
      else if (error !== 'AUTH-008') logError('카카오 로그인', new Error(error ?? '복귀 주소에 교환 코드가 없습니다.'));
      // 교환하지 않으므로 앱 시작에서 미룬 이전 세션 복원을 이어서 한다.
      void restoreSession();
      return failed;
    }
    // 교환이 실패하면 이전 세션을 그대로 복원한다. call()은 401을 저장된 토큰 무효로 보고 세션을 지우므로
    // (교환의 AUTH-007은 저장된 토큰과 무관) 교환만 직접 처리한다.
    const previous = { accessToken: getAccessToken(), refreshToken: getRefreshToken() };
    let login: LoginDto;
    try {
      login = await authApi.kakaoExchange({ code, codeVerifier: pending.codeVerifier });
    } catch (exchangeError) {
      if (exchangeError instanceof NetworkError) set({ network: 'offline' });
      logError('카카오 로그인', exchangeError);
      void restoreSession();
      return failed;
    }
    // 교환에 성공하면 이전 세션을 새 로그인으로 바꾼다(앱 시작에서 복원하지 않았다). 이전 기기 세션은 서버에서도 끝낸다.
    if (previous.accessToken || previous.refreshToken) {
      void authApi.logout(previous).catch((logoutError) => logError('로그아웃', logoutError));
    }
    resetSession();
    saveSession(login.accessToken, login.refreshToken, login.accountId);
    const profile = await call('내 프로필', () => profileApi.get(login.accountId));
    if (!profile) {
      // 화면은 로그아웃 상태로 돌아가므로 저장한 토큰도 지워 새로고침 뒤와 어긋나지 않게 한다.
      resetSession();
      return failed;
    }
    myProfile = profile;
    if (profile.nextStep !== 'COMPLETED') {
      set({ session: { ...LOGGED_OUT_SESSION, isNewUser: true, termsAgreed: false } });
      return { status: 'onboarding', returnTo: pending.returnTo };
    }
    set({ session: { ...LOGGED_OUT_SESSION, loggedIn: true, termsAgreed: true } });
    await loadMemberships();
    void loadCompanyData();
    return { status: 'loggedIn', returnTo: pending.returnTo };
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

  // 앱 시작: 저장된 토큰이 있으면 로그인 상태로 그리고 서버로 확인한다. 카카오 복귀 주소는 이전 토큰을 복원하지 않는다
  // (복원 응답이 새 로그인보다 늦게 와 새 세션을 덮거나 지우지 않게 한다). 복원·정리는 finishKakaoLogin이 이어서 한다.
  if (!matchPath(KAKAO_CALLBACK_PATH, window.location.pathname)) queueMicrotask(() => void restoreSession());

  return {
    session: { ...LOGGED_OUT_SESSION, loggedIn: Boolean(getAccessToken()), termsAgreed: Boolean(getAccessToken()) },
    ...EMPTY_DATA,
    network: 'online',
    revision: 0,
    tasksLoaded: false,
    notificationsLoaded: false,
    organizationLoaded: false,
    withdrawalEligibility: null,
    technicianHistory: null,

    // ── 인증·온보딩 ──
    startKakaoLogin: async (returnTo) => {
      try {
        const { codeVerifier, codeChallenge } = await createPkcePair();
        if (!savePendingKakaoLogin({ codeVerifier, returnTo })) throw new Error('로그인 시작 정보를 저장할 수 없습니다.');
        window.location.assign(authApi.kakaoAuthorizeUrl(codeChallenge));
      } catch (error) {
        logError('카카오 로그인', error);
      }
    },

    completeKakaoLogin: (callback) => {
      const key = callback.code ?? `error:${callback.error}`;
      if (kakaoCompletion?.key !== key) {
        const result = finishKakaoLogin(callback).catch((error: unknown): KakaoLoginResult => {
          logError('카카오 로그인', error);
          return { status: 'failed', returnTo: null };
        });
        kakaoCompletion = { key, result };
      }
      return kakaoCompletion.result;
    },

    logout: () => {
      const session = { accessToken: getAccessToken(), refreshToken: getRefreshToken() };
      if (session.accessToken || session.refreshToken) {
        void authApi.logout(session).catch((error) => logError('로그아웃', error));
      }
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
      // 현장 사진은 장마다 업로드 주소를 받아 저장소로 바로 올린 뒤 파일 식별자로 붙인다(고른 순서 그대로).
      // 한 장이라도 못 올리면 등록하지 않아 모달에 입력값이 남는다.
      const sitePhotoIds = await call('현장 사진 업로드', () =>
        Promise.all(
          input.sitePhotos.map(async (file) => {
            const contentType = sitePhotoContentType(file) ?? file.type;
            const ticket = await scheduleApi.issueSitePhotoUpload(org, { contentType, sizeBytes: file.size });
            await uploadFile(ticket.uploadUrl, file, ticket.requiredHeaders);
            return ticket.fileId;
          }),
        ),
      );
      if (!sitePhotoIds) return null;
      const scheduled = input.technicianId || input.startTime || input.durationMinutes;
      const body: CreateWorkBody = {
        ...workBody(input),
        sitePhotoIds: sitePhotoIds.length ? sitePhotoIds : undefined,
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

    refreshScreens: bump,

    // ── 화면별 읽기 ──
    loadOrganization: async () => {
      const org = organizationId();
      const membership = get().memberships.find((m) => m.companyId === get().session.currentCompanyId);
      if (org == null || !membership) return;
      const owner = membership.role === 'OWNER';
      const [staffTypes, technicianTypes, workTypes, organization, code, participants, requests, timetable] =
        await Promise.all([
          call('직원 유형', () => organizationApi.categories(org, 'staff-categories')),
          call('기사 유형', () => organizationApi.categories(org, 'technician-categories')),
          call('작업 유형', () => organizationApi.workTypes(org)),
          // 아래 넷은 총관리자만 볼 수 있다(직원이면 ORGANIZATION-003).
          owner ? call('발주사 정보', () => organizationApi.get(org)) : undefined,
          owner ? call('회사 코드', () => organizationApi.companyCode(org)) : undefined,
          owner ? call('참여 인원', () => organizationApi.participants(org)) : undefined,
          owner ? call('승인 대기', () => organizationApi.pendingRequests(org)) : undefined,
          // 직원은 참여 인원을 못 읽으므로 배정할 기사 목록을 타임테이블 기사 행(활성 기사)에서 얻는다.
          owner
            ? undefined
            : call('기사 목록', () => {
                const { from, to } = dayRange(today());
                return scheduleApi.timetable(org, from, to);
              }),
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
      if (timetable) members = [...members, ...timetable.technicians.map(memberFromTechnician)];
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
        const owner = s.memberships.find((m) => m.companyId === s.session.currentCompanyId)?.role === 'OWNER';
        return {
          tasks: applyPatches(s.tasks, [
            ...result.scheduledWorks.map(taskFromScheduled),
            ...result.backlog.map((w) => taskFromBacklog(w, byId.get(toId(ID_PREFIX.plain, w.workId)))),
          ]),
          // 총관리자는 참여 인원(비활성 기사 포함)이 기사 목록이다. 직원은 타임테이블 기사 행으로 기사 목록을 새로 고친다.
          ...(owner
            ? {}
            : {
                members: [
                  ...s.members.filter((m) => m.kind !== 'TECHNICIAN'),
                  ...result.technicians.map(memberFromTechnician),
                ],
              }),
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

    loadTechnicianHistory: async (memberId, from) => {
      const org = organizationId();
      const technicianNumber = fromId(memberId, ID_PREFIX.technician);
      const request = ++technicianHistoryRequest;
      const empty: TechnicianHistory = { memberId, from, rows: [], totalCompleted: 0, monthRejected: 0, monthCompleted: 0 };
      if (org == null) return;
      if (technicianNumber == null) {
        set({ technicianHistory: empty });
        return;
      }
      // 이력 API는 구간이 31일까지라 달마다 나눠 읽는다. 이번 달 집계(거절·완료)는 이번 달 구간 응답의 통계를 쓴다.
      const thisMonth = startOfMonth(today());
      const result = await call('기사 작업이력', async () => {
        const rows = new Map<string, TechnicianHistoryRow>();
        let summary = empty;
        for (const range of monthRanges(from, today())) {
          const responses = await Promise.all(
            HISTORY_RESULTS.map((status) =>
              scheduleApi.workHistory(org, { technicianId: technicianNumber, from: range.from, to: range.to, statuses: [status] }),
            ),
          );
          // 달 경계에 걸친 배정은 두 달 응답에 모두 들어 같은 줄 키로 한 번만 남긴다.
          responses.forEach((dto, i) => technicianHistoryRows(dto, HISTORY_RESULTS[i]).forEach((row) => rows.set(row.key, row)));
          summary = { ...summary, totalCompleted: responses[0].totalCompleted };
          if (range.month === thisMonth) {
            const { completed, rejected } = responses[0].statistics;
            summary = { ...summary, monthCompleted: completed, monthRejected: rejected };
          }
        }
        return { ...summary, rows: [...rows.values()].sort((a, b) => b.date.localeCompare(a.date)) };
      });
      if (!result || request !== technicianHistoryRequest) return;
      set({ technicianHistory: result });
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
