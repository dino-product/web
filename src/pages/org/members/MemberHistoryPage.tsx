import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { Avatar, Icon, MemberStatusChip, StateMessage, StatusChip } from '@/design-system';
import { addDays, today } from '@/lib/date';
import { formatDuration, formatJoinDate } from '@/lib/format';
import { useActiveTypes, useMember, useTechnicianHistory } from '@/data/selectors';
import { useAppStore } from '@/data/store';
import { useTechnicianHistorySync } from '@/data/sync';
import { type ID, MEMBER_KIND_LABEL, type Member } from '@/data/types';

import { HistoryFilter, type HistoryFilterOption } from '../components/HistoryFilter';
import { PageNav } from '../components/PageNav';
import { useTypeName } from '../useTypeName';
import styles from './MemberHistoryPage.module.css';

const PAGE_SIZE = 10;

type PeriodKey = '1m' | '3m' | 'all';
type ResultKey = 'COMPLETED' | 'REJECTED' | 'ALL';

const PERIOD_OPTIONS: HistoryFilterOption<PeriodKey>[] = [
  { value: '1m', label: '최근 1개월' },
  { value: '3m', label: '최근 3개월' },
  { value: 'all', label: '전체 기간' },
];

const RESULT_OPTIONS: HistoryFilterOption<ResultKey>[] = [
  { value: 'COMPLETED', label: '완료' },
  { value: 'REJECTED', label: '거절' },
  { value: 'ALL', label: '전체 상태' },
];

const PERIOD_DAYS: Record<PeriodKey, number | null> = { '1m': 30, '3m': 90, all: null };

/**
 * 기사 작업이력(Figma 목록 1550:8288 · 목록 없음 1951:21731). 인력관리 '상세보기' → /org/members/:memberId.
 * - 상단 경로 '기사 관리 / 작업이력'('기사 관리' → 인력관리), 인력 카드(이니셜·이름·구분·유형·참여일·상태), 통계 3개
 * - 필터 3개(작업유형·기간·상태). 시안 표기(설치·최근 1개월·완료)를 처음 값으로 쓰고, 목록 패널은 DS Menu.
 * - 표: 작업명·작업유형·상태(완료/거절)·담당 날짜·소요시간·완료보고, 10건씩 페이지.
 */
export default function MemberHistoryPage() {
  const { memberId = '' } = useParams();
  const member = useMember(memberId);
  const loaded = useAppStore((s) => s.organizationLoaded);
  // 주소로 바로 열면 인력 목록을 읽은 뒤에 판단한다.
  if (!loaded) return null;
  if (!member) return <Navigate to="/org/members" replace />;
  return <MemberHistory key={member.id} member={member} />;
}

function MemberHistory({ member }: { member: Member }) {
  const navigate = useNavigate();
  useTechnicianHistorySync(member.id);
  const history = useTechnicianHistory(member.id);
  const typeName = useTypeName(member.typeId);
  const workTypes = useActiveTypes('WORK');

  const workOptions = useMemo<HistoryFilterOption<string>[]>(
    () => [...workTypes.map((t) => ({ value: t.id, label: t.name })), { value: 'ALL', label: '전체 유형' }],
    [workTypes],
  );
  const [workType, setWorkType] = useState<string>(() => workTypes.find((t) => t.name === '설치')?.id ?? 'ALL');
  const [period, setPeriod] = useState<PeriodKey>('1m');
  const [result, setResult] = useState<ResultKey>('COMPLETED');
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    if (!history) return [];
    const days = PERIOD_DAYS[period];
    const from = days === null ? null : addDays(today(), -days);
    return history.rows.filter(
      (row) =>
        (workType === 'ALL' || row.task.workTypeId === workType) &&
        (result === 'ALL' || row.result === result) &&
        (from === null || row.date >= from),
    );
  }, [history, workType, period, result]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const changeFilter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  const subtitle = `${MEMBER_KIND_LABEL[member.kind]} · ${typeName} · ${formatJoinDate(member.joinedAt)} 참여`;
  const empty = pageRows.length === 0;

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="경로">
        <button type="button" className={styles.crumbLink} onClick={() => navigate('/org/members')}>
          기사 관리
        </button>
        <span aria-hidden>／</span>
        <span>작업이력</span>
      </nav>
      <h1 className={`t-title-s ${styles.title}`}>기사 작업이력</h1>

      <section className={styles.card} aria-label="인력 정보">
        <div className={styles.profile}>
          <Avatar variant="initial" size={62} text={member.name} />
          <div className={styles.profileText}>
            <p className={styles.name}>{member.name}</p>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
        </div>
        <div className={styles.stats}>
          <StatCard label="전체 누적 완료" value={history?.totalCompleted ?? 0} />
          <StatCard label="이번 달 거절" value={history?.monthRejected ?? 0} />
          <StatCard label="이번 달 완료" value={history?.monthCompleted ?? 0} />
        </div>
        <span className={styles.statusChip}>
          <MemberStatusChip status={member.status} />
        </span>
      </section>

      <div className={styles.filters}>
        <HistoryFilter value={workType} options={workOptions} onChange={changeFilter(setWorkType)} aria-label="작업유형" />
        <HistoryFilter value={period} options={PERIOD_OPTIONS} onChange={changeFilter(setPeriod)} aria-label="기간" />
        <HistoryFilter value={result} options={RESULT_OPTIONS} onChange={changeFilter(setResult)} aria-label="상태" />
      </div>

      <div className={styles.table} role="table" aria-label="작업이력">
        <div className={styles.head} role="row">
          <span role="columnheader" style={{ left: 42 }}>
            작업명
          </span>
          <span role="columnheader" style={{ left: 246 }}>
            작업유형
          </span>
          <span role="columnheader" style={{ left: 407 }}>
            상태
          </span>
          <span role="columnheader" style={{ left: 915 }}>
            담당 날짜
          </span>
          <span role="columnheader" style={{ left: 1144 }}>
            소요시간
          </span>
          <span role="columnheader" style={{ left: 1409 }}>
            완료보고
          </span>
        </div>
        {pageRows.map((row) => (
          <div key={`${row.task.id}-${row.result}`} className={styles.row} role="row">
            <span role="cell" style={{ left: 35 }}>
              {row.task.title}
            </span>
            <span role="cell" style={{ left: 246 }}>
              <TypeName typeId={row.task.workTypeId} />
            </span>
            <span role="cell" className={styles.chip}>
              <StatusChip status={row.result} />
            </span>
            <span role="cell" style={{ left: 915 }}>
              {row.date}
            </span>
            <span role="cell" style={{ left: 1144 }}>
              {row.task.durationMinutes != null ? formatDuration(row.task.durationMinutes) : '-'}
            </span>
            <span role="cell" className={styles.report}>
              {row.reportSubmitted ? '제출됨' : '-'}
            </span>
          </div>
        ))}
      </div>

      {empty && (
        <StateMessage
          variant="list"
          className={styles.empty}
          icon={<Icon name="file-text" size={42} color="var(--color-gray-500)" />}
          title="작업이력이 없습니다."
        />
      )}

      <div className={clsx(styles.pager, empty && styles.pagerEmpty)}>
        <PageNav page={currentPage} pageCount={pageCount} onChange={setPage} />
      </div>
    </div>
  );
}

/** 작업 유형 이름(삭제된 유형 포함, 없으면 '유형 없음') */
function TypeName({ typeId }: { typeId: ID | null }) {
  return <>{useTypeName(typeId)}</>;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.stat}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statUnit}>건</p>
    </div>
  );
}
