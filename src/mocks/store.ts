import { create } from 'zustand';

import { nowIso } from '@/lib/date';
import { HISTORY_LABEL, MAX_SITE_PHOTOS, TYPE_COLOR_ORDER } from '@/mocks/constants';
import {
  actorName,
  hasFullAssignment,
  notificationMessage,
  scheduleChangePhrase,
  UNSTARTED_ASSIGNED_STATUSES,
} from '@/mocks/rules';
import { readScenario } from '@/mocks/scenario';
import { createSeed, SEED_MEMBER_IDS } from '@/mocks/seed';
import type {
  AppNotification,
  Company,
  CompanyMembership,
  ID,
  IsoDateTime,
  JoinRequest,
  Member,
  MemberKind,
  MemberStatus,
  NotificationType,
  Scenario,
  Session,
  Task,
  TaskAssignment,
  TaskAttachment,
  TaskInput,
  TypeCategory,
  TypeColor,
  TypeItem,
} from '@/mocks/types';

/**
 * 앱 전역 목업 스토어 계약. 인터페이스(AppState)는 모든 섹션이 공유하므로 이름·시그니처를 바꾸지 않는다.
 * 초기 상태는 시나리오(URL 쿼리, src/mocks/scenario.ts)와 시드(src/mocks/seed.ts)로 만든다.
 * 데이터 변경은 메모리에만 있고 새로고침하면 시드로 돌아간다. 사용법은 docs/data-layer.md.
 */
export interface AppState {
  scenario: Scenario;
  session: Session;
  /** 로그인 사용자가 속한 발주사(1곳 또는 2곳). 현재 발주사는 session.currentCompanyId */
  companies: Company[];
  memberships: CompanyMembership[];
  /** 현재 발주사 인력(직원·기사). 로그인 사용자 포함 */
  members: Member[];
  types: TypeItem[];
  tasks: Task[];
  notifications: AppNotification[];
  joinRequests: JoinRequest[];
  network: 'online' | 'offline';

  // 인증·온보딩
  /** 카카오 로그인(목업). 첫 사용자면 needsOnboarding=true → 약관 동의 모달부터 진행 */
  loginWithKakao: () => { needsOnboarding: boolean };
  logout: () => void;
  agreeTerms: (marketingAgreed: boolean) => void;
  registerProfile: (input: { name: string; phone: string }) => void;
  createCompany: (input: { name: string; industry: string }) => void;
  /** 온보딩 마지막 단계 완료(건너뛰기 포함) */
  finishOnboarding: () => void;
  switchCompany: (companyId: ID) => void;
  updateProfile: (input: { name: string; phone: string; avatarUrl: string | null }) => void;
  withdrawAccount: (reason: string) => void;

  // 발주사
  updateCompany: (input: { name: string; industry: string }) => void;
  issueJoinCode: () => void;
  regenerateJoinCode: () => void;

  // 인력
  changeMemberKind: (memberId: ID, kind: MemberKind, typeId: ID | null) => void;
  setMemberType: (memberId: ID, typeId: ID | null) => void;
  setMemberStatus: (memberId: ID, status: MemberStatus) => void;
  /** 총관리자 지정(기존 총관리자는 해제) */
  assignOwner: (memberId: ID) => void;
  /** 총관리자 해제 */
  releaseOwner: (memberId: ID) => void;
  setJoinRequestKind: (requestId: ID, kind: MemberKind) => void;
  approveJoinRequests: (requestIds: ID[]) => void;
  rejectJoinRequests: (requestIds: ID[], reason: string) => void;

  // 유형
  addType: (category: TypeCategory, name: string, color?: TypeColor | null) => ID;
  updateType: (typeId: ID, patch: { name?: string; color?: TypeColor | null }) => void;
  setTypeActive: (typeId: ID, active: boolean) => void;
  deleteType: (typeId: ID) => void;

  // 작업
  createTask: (input: TaskInput) => ID;
  updateTask: (taskId: ID, patch: Partial<TaskInput>) => void;
  assignTask: (taskId: ID, assignment: TaskAssignment) => void;
  cancelTask: (taskId: ID, reason: string, detail: string) => void;
  requestReport: (taskId: ID) => void;

  // 알림
  markNotificationRead: (notificationId: ID) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (notificationId: ID) => void;

  // 네트워크(목업)
  setNetwork: (network: 'online' | 'offline') => void;
}

// ── 내부 도우미 ─────────────────────────────────────────────────────

/**
 * 삭제된 유형 보관함. 작업중·완료 작업은 삭제된 유형 ID를 그대로 유지하므로(Figma 주석 1924:15794)
 * 이름·색을 계속 보여줄 수 있게 남겨 둔다. 셀렉터 selectTypeById가 함께 조회한다.
 */
const deletedTypes = new Map<ID, TypeItem>();

/** 삭제된 유형 조회(작업중·완료 작업의 유형 표시용). 현재 유형 목록에 없을 때만 의미가 있다. */
export function getDeletedType(typeId: ID): TypeItem | undefined {
  return deletedTypes.get(typeId);
}

let idSequence = 0;
function newId(prefix: string): ID {
  idSequence += 1;
  return `${prefix}-${Date.now().toString(36)}${idSequence.toString(36)}`;
}

const JOIN_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateJoinCode(previous: string | null): string {
  for (;;) {
    let suffix = '';
    for (let i = 0; i < 4; i += 1) suffix += JOIN_CODE_CHARS[Math.floor(Math.random() * JOIN_CODE_CHARS.length)];
    const code = `ORBIT-${suffix}`;
    if (code !== previous) return code;
  }
}
const joinLinkFor = (code: string) => `https://orbit.app/join/${code}`;

/** data URL이면 대략적인 바이트 수, 아니면 0 */
function estimateBytes(url: string): number {
  const comma = url.indexOf(',');
  if (!url.startsWith('data:') || comma === -1) return 0;
  const body = url.slice(comma + 1);
  if (url.slice(0, comma).endsWith(';base64')) return Math.floor((body.length * 3) / 4);
  try {
    return decodeURIComponent(body).length;
  } catch {
    return body.length;
  }
}

/** 현장 사진 URL 목록과 첨부 파일 목록을 맞춘다. 남아 있는 사진의 첨부 정보는 유지한다. */
function syncAttachments(taskId: ID, urls: string[], previous: TaskAttachment[], at: IsoDateTime): TaskAttachment[] {
  return urls.map((url, index) => {
    const kept = previous.find((file) => file.url === url);
    if (kept) return kept;
    return {
      id: newId(`${taskId}-file`),
      name: `현장사진_${String(index + 1).padStart(2, '0')}.jpg`,
      sizeBytes: estimateBytes(url),
      url,
      uploadedAt: at,
    };
  });
}

function makeNotification(type: NotificationType, taskId: ID, message: string, at: IsoDateTime): AppNotification {
  return { id: newId('n'), type, taskId, message, createdAt: at, read: false };
}

const TASK_INPUT_KEYS = [
  'title',
  'workTypeId',
  'technicianId',
  'date',
  'startTime',
  'durationMinutes',
  'customer',
  'price',
  'paymentMethod',
  'sitePhotoUrls',
] as const satisfies readonly (keyof TaskInput)[];

const ASSIGNMENT_KEYS = ['technicianId', 'date', 'startTime', 'durationMinutes'] as const;

/** 현재 사용자의 총관리자 여부에 맞춰 현재 발주사 소속 역할을 맞춘다(사이드바·마이페이지 표시 기준). */
function syncMyMembership(state: Pick<AppState, 'memberships' | 'session'>, members: Member[]): CompanyMembership[] {
  const me = members.find((m) => m.id === state.session.userId);
  if (!me) return state.memberships;
  const role = me.isOwner ? 'OWNER' : 'STAFF';
  return state.memberships.map((ms) =>
    ms.companyId === state.session.currentCompanyId && ms.role !== role ? { ...ms, role } : ms,
  );
}

function createInitialState(): Pick<
  AppState,
  | 'scenario'
  | 'session'
  | 'companies'
  | 'memberships'
  | 'members'
  | 'types'
  | 'tasks'
  | 'notifications'
  | 'joinRequests'
  | 'network'
> {
  const scenario = readScenario();
  return { scenario, ...createSeed(scenario) };
}

// ── 스토어 ─────────────────────────────────────────────────────────

/** 앱 전역 목업 스토어. 셀렉터·훅은 src/mocks/selectors.ts, 사용법은 docs/data-layer.md */
export const useAppStore = create<AppState>()((set, get) => {
  const currentUser = () => {
    const { members, session } = get();
    return members.find((m) => m.id === session.userId);
  };
  /** 이력 처리자 이름(현재 사용자) */
  const myActorName = () => actorName(currentUser());
  const memberName = (id: ID | null) => (id ? get().members.find((m) => m.id === id)?.name ?? '' : '');

  const replaceTask = (task: Task, notification?: AppNotification) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === task.id ? task : t)),
      notifications: notification ? [notification, ...s.notifications] : s.notifications,
    }));

  const updateCurrentCompany = (patch: Partial<Company>) =>
    set((s) => {
      const companyId = s.session.currentCompanyId;
      return {
        companies: s.companies.map((c) => (c.id === companyId ? { ...c, ...patch } : c)),
        memberships:
          patch.name === undefined
            ? s.memberships
            : s.memberships.map((ms) => (ms.companyId === companyId ? { ...ms, companyName: patch.name! } : ms)),
      };
    });

  const updateMember = (memberId: ID, patch: Partial<Member>) =>
    set((s) => ({ members: s.members.map((m) => (m.id === memberId ? { ...m, ...patch } : m)) }));

  const setOwners = (isOwner: (member: Member) => boolean) =>
    set((s) => {
      const members = s.members.map((m) => {
        const next = m.kind === 'EMPLOYEE' && isOwner(m);
        return m.isOwner === next ? m : { ...m, isOwner: next };
      });
      return { members, memberships: syncMyMembership(s, members) };
    });

  /** 배정 알림(신규 배정 또는 같은 기사 일정 변경) */
  const assignmentNotification = (task: Task, previous: Task | null, at: IsoDateTime): AppNotification => {
    const sameTechnician = Boolean(
      previous &&
        previous.technicianId === task.technicianId &&
        UNSTARTED_ASSIGNED_STATUSES.includes(previous.status),
    );
    if (sameTechnician && task.date && task.startTime) {
      const schedule = scheduleChangePhrase(task.date, task.startTime, previous?.date ?? null);
      return makeNotification(
        'SCHEDULE_CHANGED',
        task.id,
        notificationMessage('SCHEDULE_CHANGED', { title: task.title, schedule }),
        at,
      );
    }
    return makeNotification(
      'ASSIGNED',
      task.id,
      notificationMessage('ASSIGNED', { title: task.title, technicianName: memberName(task.technicianId) }),
      at,
    );
  };

  return {
    ...createInitialState(),

    // ── 인증·온보딩 ──
    loginWithKakao: () => {
      const { session } = get();
      if (session.isNewUser) return { needsOnboarding: true };
      set({ session: { ...session, loggedIn: true } });
      return { needsOnboarding: false };
    },

    logout: () => set((s) => ({ session: { ...s.session, loggedIn: false } })),

    agreeTerms: (_marketingAgreed) => set((s) => ({ session: { ...s.session, termsAgreed: true } })),

    registerProfile: ({ name, phone }) => updateMember(get().session.userId, { name: name.trim(), phone }),

    createCompany: ({ name, industry }) => updateCurrentCompany({ name: name.trim(), industry }),

    finishOnboarding: () =>
      set((s) => ({ session: { ...s.session, isNewUser: false, termsAgreed: true, loggedIn: true } })),

    switchCompany: (companyId) => {
      const s = get();
      const membership = s.memberships.find((ms) => ms.companyId === companyId);
      if (!membership || companyId === s.session.currentCompanyId) return;
      const userId = s.session.userId;
      const iAmOwner = membership.role === 'OWNER';
      let members = s.members.map((m) => {
        const isOwner = m.id === userId ? iAmOwner : iAmOwner ? false : m.isOwner;
        return m.isOwner === isOwner ? m : { ...m, isOwner };
      });
      if (!iAmOwner && !members.some((m) => m.isOwner)) {
        // 선택한 발주사에서 나는 직원이므로 다른 직원이 총관리자를 맡는다(시드 기준 박서준).
        const fallback =
          members.find((m) => m.id === SEED_MEMBER_IDS.parkSeojun) ??
          members.find((m) => m.id !== userId && m.kind === 'EMPLOYEE' && m.status === 'ACTIVE');
        if (fallback) members = members.map((m) => (m.id === fallback.id ? { ...m, isOwner: true } : m));
      }
      set({ session: { ...s.session, currentCompanyId: companyId }, members });
    },

    updateProfile: ({ name, phone, avatarUrl }) =>
      updateMember(get().session.userId, { name: name.trim(), phone, avatarUrl }),

    withdrawAccount: (_reason) => set((s) => ({ session: { ...s.session, loggedIn: false } })),

    // ── 발주사 ──
    updateCompany: ({ name, industry }) => updateCurrentCompany({ name: name.trim(), industry }),

    issueJoinCode: () => {
      const company = get().companies.find((c) => c.id === get().session.currentCompanyId);
      if (!company || company.joinCode) return;
      const code = generateJoinCode(null);
      updateCurrentCompany({ joinCode: code, joinLink: joinLinkFor(code) });
    },

    regenerateJoinCode: () => {
      const company = get().companies.find((c) => c.id === get().session.currentCompanyId);
      if (!company) return;
      const code = generateJoinCode(company.joinCode);
      updateCurrentCompany({ joinCode: code, joinLink: joinLinkFor(code) });
    },

    // ── 인력 ──
    changeMemberKind: (memberId, kind, typeId) =>
      set((s) => {
        const member = s.members.find((m) => m.id === memberId);
        if (!member) return {};
        const at = nowIso();
        const actor = myActorName();
        // 기사 → 직원: 아직 시작하지 않은 배정(배정됨·작업전)은 풀려 대기함으로 돌아간다(Figma 2008:31713).
        const tasks =
          member.kind === 'TECHNICIAN' && kind === 'EMPLOYEE'
            ? s.tasks.map((t) =>
                t.technicianId === memberId && UNSTARTED_ASSIGNED_STATUSES.includes(t.status)
                  ? {
                      ...t,
                      technicianId: null,
                      status: 'REGISTERED' as const,
                      updatedAt: at,
                      history: [...t.history, { at, label: HISTORY_LABEL.unassigned, actor }],
                    }
                  : t,
              )
            : s.tasks;
        const members = s.members.map((m) =>
          m.id === memberId ? { ...m, kind, typeId, isOwner: kind === 'EMPLOYEE' ? m.isOwner : false } : m,
        );
        return { members, tasks, memberships: syncMyMembership(s, members) };
      }),

    setMemberType: (memberId, typeId) => updateMember(memberId, { typeId }),

    setMemberStatus: (memberId, status) => updateMember(memberId, { status }),

    assignOwner: (memberId) => {
      // 총관리자는 직원만 맡을 수 있다. 기사·없는 인력이면 바꾸지 않는다.
      const target = get().members.find((m) => m.id === memberId);
      if (!target || target.kind !== 'EMPLOYEE') return;
      setOwners((m) => m.id === memberId);
    },

    releaseOwner: (memberId) => setOwners((m) => m.isOwner && m.id !== memberId),

    setJoinRequestKind: (requestId, kind) =>
      set((s) => ({ joinRequests: s.joinRequests.map((r) => (r.id === requestId ? { ...r, confirmedKind: kind } : r)) })),

    approveJoinRequests: (requestIds) =>
      set((s) => {
        const ids = new Set(requestIds);
        const at = nowIso();
        const approved = s.joinRequests.filter((r) => ids.has(r.id));
        const newMembers: Member[] = approved.map((r) => ({
          id: newId('m'),
          name: r.name,
          phone: r.phone,
          kind: r.confirmedKind,
          typeId: null,
          isOwner: false,
          status: 'ACTIVE',
          joinedAt: at,
          avatarUrl: null,
        }));
        return {
          members: [...s.members, ...newMembers],
          joinRequests: s.joinRequests.filter((r) => !ids.has(r.id)),
        };
      }),

    rejectJoinRequests: (requestIds, _reason) =>
      set((s) => {
        const ids = new Set(requestIds);
        return { joinRequests: s.joinRequests.filter((r) => !ids.has(r.id)) };
      }),

    // ── 유형 ──
    addType: (category, name, color) => {
      const id = newId('type');
      set((s) => {
        let nextColor: TypeColor | null = null;
        if (category === 'WORK') {
          const used = new Set(s.types.filter((t) => t.category === 'WORK').map((t) => t.color));
          nextColor = color ?? TYPE_COLOR_ORDER.find((c) => !used.has(c)) ?? 'GRAY';
        }
        const type: TypeItem = { id, category, name: name.trim(), color: nextColor, active: true, createdAt: nowIso() };
        return { types: [...s.types, type] };
      });
      return id;
    },

    updateType: (typeId, patch) =>
      set((s) => ({
        types: s.types.map((t) => {
          if (t.id !== typeId) return t;
          const next = { ...t };
          if (patch.name !== undefined) next.name = patch.name.trim();
          if (patch.color !== undefined && t.category === 'WORK') next.color = patch.color;
          return next;
        }),
      })),

    setTypeActive: (typeId, active) =>
      set((s) => ({ types: s.types.map((t) => (t.id === typeId ? { ...t, active } : t)) })),

    deleteType: (typeId) =>
      set((s) => {
        const type = s.types.find((t) => t.id === typeId);
        if (!type) return {};
        deletedTypes.set(typeId, type);
        // 인력은 '유형 없음'으로. 작업은 기사가 시작하기 전(작업중·완료 제외)만 '유형 없음'으로(Figma 1924:15794).
        return {
          types: s.types.filter((t) => t.id !== typeId),
          members: s.members.map((m) => (m.typeId === typeId ? { ...m, typeId: null } : m)),
          tasks: s.tasks.map((t) =>
            t.workTypeId === typeId && t.status !== 'IN_PROGRESS' && t.status !== 'COMPLETED'
              ? { ...t, workTypeId: null }
              : t,
          ),
        };
      }),

    // ── 작업 ──
    createTask: (input) => {
      const s = get();
      const id = newId('task');
      const at = nowIso();
      const actor = myActorName();
      const full = hasFullAssignment(input);
      const sitePhotoUrls = input.sitePhotoUrls.slice(0, MAX_SITE_PHOTOS);
      const task: Task = {
        id,
        title: input.title.trim(),
        workTypeId: input.workTypeId,
        status: full ? 'PENDING_ACCEPT' : 'REGISTERED',
        technicianId: input.technicianId,
        date: input.date,
        startTime: input.startTime,
        durationMinutes: input.durationMinutes,
        customer: input.customer,
        price: input.price,
        paymentMethod: input.paymentMethod,
        sitePhotoUrls,
        registrantId: s.session.userId,
        createdAt: at,
        updatedAt: at,
        rejection: null,
        delayed: false,
        report: null,
        reportRequestedAt: null,
        attachments: syncAttachments(id, sitePhotoUrls, [], at),
        history: [
          { at, label: HISTORY_LABEL.registered, actor },
          ...(full ? [{ at, label: HISTORY_LABEL.assigned, actor }] : []),
        ],
        cancellation: null,
      };
      set({
        tasks: [...s.tasks, task],
        notifications: full ? [assignmentNotification(task, null, at), ...s.notifications] : s.notifications,
      });
      return id;
    },

    updateTask: (taskId, patch) => {
      const task = get().tasks.find((t) => t.id === taskId);
      if (!task || task.status === 'CANCELED') return;
      const at = nowIso();
      const next: Task = { ...task };
      let changed = false;
      for (const key of TASK_INPUT_KEYS) {
        const value = patch[key];
        if (value === undefined || value === task[key]) continue;
        (next as Record<(typeof TASK_INPUT_KEYS)[number], unknown>)[key] = value;
        changed = true;
      }
      if (!changed) return;
      if (patch.sitePhotoUrls) {
        next.sitePhotoUrls = patch.sitePhotoUrls.slice(0, MAX_SITE_PHOTOS);
        next.attachments = syncAttachments(task.id, next.sitePhotoUrls, task.attachments, at);
      }
      if (patch.title !== undefined) next.title = patch.title.trim();

      let label: string = HISTORY_LABEL.edited;
      let notification: AppNotification | undefined;
      const assignable = task.status === 'REGISTERED' || UNSTARTED_ASSIGNED_STATUSES.includes(task.status);
      if (assignable) {
        const full = hasFullAssignment(next);
        const assignmentChanged = ASSIGNMENT_KEYS.some((key) => next[key] !== task[key]);
        if (!full && task.status !== 'REGISTERED') {
          next.status = 'REGISTERED';
          label = HISTORY_LABEL.unassigned;
        } else if (full && (task.status === 'REGISTERED' || assignmentChanged)) {
          next.status = 'PENDING_ACCEPT';
          next.rejection = null;
          next.delayed = false;
          notification = assignmentNotification(next, task.status === 'REGISTERED' ? null : task, at);
          label = notification.type === 'SCHEDULE_CHANGED' ? HISTORY_LABEL.rescheduled : HISTORY_LABEL.assigned;
        }
      }
      next.updatedAt = at;
      next.history = [...task.history, { at, label, actor: myActorName() }];
      replaceTask(next, notification);
    },

    assignTask: (taskId, assignment) => {
      const task = get().tasks.find((t) => t.id === taskId);
      if (!task || (task.status !== 'REGISTERED' && !UNSTARTED_ASSIGNED_STATUSES.includes(task.status))) return;
      const unchanged =
        task.status !== 'REGISTERED' && ASSIGNMENT_KEYS.every((key) => task[key] === assignment[key]);
      if (unchanged) return;
      const at = nowIso();
      const next: Task = {
        ...task,
        technicianId: assignment.technicianId,
        date: assignment.date,
        startTime: assignment.startTime,
        durationMinutes: assignment.durationMinutes,
        status: 'PENDING_ACCEPT',
        rejection: null,
        delayed: false,
        updatedAt: at,
      };
      const notification = assignmentNotification(next, task.status === 'REGISTERED' ? null : task, at);
      const label = notification.type === 'SCHEDULE_CHANGED' ? HISTORY_LABEL.rescheduled : HISTORY_LABEL.assigned;
      next.history = [...task.history, { at, label, actor: myActorName() }];
      replaceTask(next, notification);
    },

    cancelTask: (taskId, reason, detail) => {
      const s = get();
      const task = s.tasks.find((t) => t.id === taskId);
      if (!task || task.status === 'CANCELED') return;
      const at = nowIso();
      const next: Task = {
        ...task,
        status: 'CANCELED',
        cancellation: { reason, detail, at, actorId: s.session.userId },
        updatedAt: at,
        history: [...task.history, { at, label: HISTORY_LABEL.canceled, actor: myActorName() }],
      };
      replaceTask(
        next,
        makeNotification('CANCELED', task.id, notificationMessage('CANCELED', { title: task.title }), at),
      );
    },

    requestReport: (taskId) => {
      const task = get().tasks.find((t) => t.id === taskId);
      if (!task) return;
      const at = nowIso();
      replaceTask({
        ...task,
        reportRequestedAt: at,
        updatedAt: at,
        history: [...task.history, { at, label: HISTORY_LABEL.reportRequested, actor: myActorName() }],
      });
    },

    // ── 알림 ──
    markNotificationRead: (notificationId) =>
      set((s) => ({
        notifications: s.notifications.map((n) => (n.id === notificationId && !n.read ? { ...n, read: true } : n)),
      })),

    markAllNotificationsRead: () =>
      set((s) => ({ notifications: s.notifications.map((n) => (n.read ? n : { ...n, read: true })) })),

    deleteNotification: (notificationId) =>
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== notificationId) })),

    // ── 네트워크 ──
    setNetwork: (network) => set({ network }),
  };
});
