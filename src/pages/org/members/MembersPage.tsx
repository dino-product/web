import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon, MemberStatusChip, type PillTab, PillTabs, SearchInput, StateMessage } from '@/design-system';
import { formatJoinDate } from '@/lib/format';
import { getTechnicianOpenTasks, selectIsOwner, useMembers } from '@/mocks/selectors';
import { useAppStore } from '@/mocks/store';
import type { ID, Member, MemberKind } from '@/mocks/types';

import { KindSelect } from '../components/KindSelect';
import { useTypeName } from '../useTypeName';
import styles from './MembersPage.module.css';
import { OwnerAssignDialog, OwnerReleaseDialog } from './OwnerDialogs';
import { RoleChangeDialog } from './RoleChangeDialog';

type KindFilter = 'ALL' | MemberKind;

interface RoleChange {
  memberId: ID;
  toKind: MemberKind;
}

/**
 * 조직 설정 > 인력관리(Figma 1951:19161 · 등록된 인력 없음 650:2568 · 검색 결과 없음 1951:22730,
 * 역할 변경 2008:30734·2008:31040·2008:31376·2008:31713, 총관리자 2232:9741·2232:10017·2232:10293).
 * - 이름 검색, 전체·직원·기사 필터(건수는 검색과 무관). 시안의 모든 인력관리 프레임이 '직원' 선택 상태라 기본값을 직원으로 둔다.
 * - 직원유형 선택을 바꾸면 즉시 저장하지 않고 역할 변경 모달 → changeMemberKind. 총관리자 행은 읽기 전용.
 * - 상세보기 → /org/members/:memberId(기사 작업이력).
 * - 총관리자 지정·해제: 인력관리 이전 시안(1951:18412 등) 오른쪽 아래 버튼 → 총관리자 지정(직원 선택) → 지정 해제 확인 → assignOwner.
 */
export default function MembersPage() {
  const navigate = useNavigate();
  const members = useMembers();
  const isOwner = useAppStore(selectIsOwner);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<KindFilter>('EMPLOYEE');
  const [roleChange, setRoleChange] = useState<RoleChange | null>(null);
  const [ownerStep, setOwnerStep] = useState<'assign' | 'release' | null>(null);
  const [nextOwnerId, setNextOwnerId] = useState<ID | null>(null);

  const counts = useMemo(
    () => ({
      ALL: members.length,
      EMPLOYEE: members.filter((m) => m.kind === 'EMPLOYEE').length,
      TECHNICIAN: members.filter((m) => m.kind === 'TECHNICIAN').length,
    }),
    [members],
  );

  const tabs: PillTab<KindFilter>[] = [
    { key: 'ALL', label: '전체', count: counts.ALL },
    { key: 'EMPLOYEE', label: '직원', count: counts.EMPLOYEE },
    { key: 'TECHNICIAN', label: '기사', count: counts.TECHNICIAN },
  ];

  const rows = useMemo(() => {
    const keyword = query.trim();
    return members.filter((m) => (filter === 'ALL' || m.kind === filter) && (!keyword || m.name.includes(keyword)));
  }, [members, filter, query]);

  /** 총관리자로 지정할 수 있는 직원(현재 총관리자 제외, 활성 직원) */
  const ownerCandidates = useMemo(
    () => members.filter((m) => m.kind === 'EMPLOYEE' && !m.isOwner && m.status === 'ACTIVE'),
    [members],
  );

  const requestKindChange = (member: Member, toKind: MemberKind) => setRoleChange({ memberId: member.id, toKind });

  const confirmKindChange = (typeId: ID | null) => {
    if (!roleChange) return;
    useAppStore.getState().changeMemberKind(roleChange.memberId, roleChange.toKind, typeId);
    setRoleChange(null);
  };

  const openOwnerFlow = () => {
    setNextOwnerId(ownerCandidates[0]?.id ?? null);
    setOwnerStep('assign');
  };

  const confirmOwnerRelease = () => {
    if (nextOwnerId) useAppStore.getState().assignOwner(nextOwnerId);
    setOwnerStep(null);
  };

  const roleMember = roleChange ? members.find((m) => m.id === roleChange.memberId) : undefined;

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <SearchInput
          className={styles.search}
          placeholder="이름 검색"
          aria-label="이름 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <PillTabs tabs={tabs} value={filter} onChange={setFilter} aria-label="인력 구분" />
      </div>

      <div className={styles.table} role="table" aria-label="인력 목록">
        <div className={styles.head} role="row">
          <span role="columnheader" style={{ left: 36 }}>
            이름
          </span>
          <span role="columnheader" style={{ left: 200 }}>
            직원유형
          </span>
          <span role="columnheader" style={{ left: 375 }}>
            세부 유형
          </span>
          <span role="columnheader" style={{ left: 1061.5 }}>
            상태
          </span>
          <span role="columnheader" style={{ left: 1216 }}>
            참여일
          </span>
          <span role="columnheader" style={{ left: 1391 }}>
            관리
          </span>
        </div>
        {rows.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            onKindChange={(kind) => requestKindChange(member, kind)}
            onDetail={() => navigate(`/org/members/${member.id}`)}
          />
        ))}
      </div>

      {rows.length === 0 ? (
        <StateMessage
          variant="list"
          className={styles.empty}
          icon={<Icon name="users" size={42} color="var(--color-gray-500)" />}
          title="등록된 이름이 없습니다"
        />
      ) : (
        <div className={styles.footer}>
          <p className={styles.notice}>
            <Icon name="info-circle" size={24} color="var(--color-gray-500)" />
            다른 역할을 고르면 즉시 저장하지 않고 역할 변경 확인 창을 띄웁니다.
          </p>
          {isOwner && (
            <button type="button" className={styles.ownerButton} onClick={openOwnerFlow}>
              총관리자 지정·해제
            </button>
          )}
        </div>
      )}

      {roleChange && roleMember && (
        <RoleChangeDialogContainer
          key={`${roleChange.memberId}-${roleChange.toKind}`}
          member={roleMember}
          toKind={roleChange.toKind}
          onClose={() => setRoleChange(null)}
          onConfirm={confirmKindChange}
          onShowTasks={() => navigate('/tasks')}
        />
      )}

      <OwnerAssignDialog
        open={ownerStep === 'assign'}
        candidates={ownerCandidates}
        value={nextOwnerId}
        onChange={setNextOwnerId}
        onClose={() => setOwnerStep(null)}
        onConfirm={() => setOwnerStep('release')}
      />
      <OwnerReleaseDialog
        open={ownerStep === 'release'}
        onClose={() => setOwnerStep(null)}
        onConfirm={confirmOwnerRelease}
      />
    </div>
  );
}

interface MemberRowProps {
  member: Member;
  onKindChange: (kind: MemberKind) => void;
  onDetail: () => void;
}

function MemberRow({ member, onKindChange, onDetail }: MemberRowProps) {
  const typeName = useTypeName(member.typeId);
  return (
    <div className={styles.row} role="row">
      <span role="cell" className={styles.name}>
        <span className={styles.nameText}>{member.name}</span>
        {member.isOwner && (
          <span className={styles.crown} role="img" aria-label="총관리자">
            <Icon name="crown" color="var(--color-secondary)" />
          </span>
        )}
      </span>
      <span role="cell" className={styles.kind}>
        <KindSelect value={member.kind} onChange={onKindChange} readOnly={member.isOwner} aria-label="직원유형" />
      </span>
      <span role="cell" className={styles.text} style={{ left: 375 }}>
        {typeName}
      </span>
      <span role="cell" className={styles.status}>
        <MemberStatusChip status={member.status} />
      </span>
      <span role="cell" className={styles.text} style={{ left: 1217 }}>
        {formatJoinDate(member.joinedAt)}
      </span>
      <span role="cell" className={styles.manage}>
        <button type="button" className={styles.detail} onClick={onDetail}>
          <Icon name="external-link" size={24} color="var(--color-gray-900)" />
          상세보기
        </button>
      </span>
    </div>
  );
}

interface RoleChangeDialogContainerProps {
  member: Member;
  toKind: MemberKind;
  onClose: () => void;
  onConfirm: (typeId: ID | null) => void;
  onShowTasks: () => void;
}

/** 모달을 연 순간의 기사 작업 현황으로 변형(변경 불가·예정 작업·기본)을 고른다. */
function RoleChangeDialogContainer({ member, toKind, onClose, onConfirm, onShowTasks }: RoleChangeDialogContainerProps) {
  const [openTasks] = useState(() =>
    member.kind === 'TECHNICIAN' && toKind === 'EMPLOYEE'
      ? getTechnicianOpenTasks(useAppStore.getState().tasks, member.id)
      : { inProgress: [], scheduled: [] },
  );
  return (
    <RoleChangeDialog
      member={member}
      toKind={toKind}
      inProgress={openTasks.inProgress}
      scheduled={openTasks.scheduled}
      onClose={onClose}
      onConfirm={onConfirm}
      onShowTasks={onShowTasks}
    />
  );
}
