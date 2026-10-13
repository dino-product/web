import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { type UnderlineTab, UnderlineTabs } from '@/design-system';
import { today } from '@/lib/date';
import { formatBoardDate } from '@/lib/format';
import { type BoardSummary, selectIsOffline, useBoardSummary, useTasksByDate } from '@/mocks/selectors';
import { useAppStore } from '@/mocks/store';
import { TASK_STATUS_LABEL } from '@/mocks/types';

import BoardHeader from './BoardHeader';
import BoardOffline from './BoardOffline';
import styles from './BoardPage.module.css';
import BoardSummaryCards from './BoardSummaryCards';
import BoardTaskTable from './BoardTaskTable';
import { preloadTaskDetailModal } from './taskDetailModalLoader';

type StatusTab = keyof BoardSummary['byStatus'];
type BoardTab = 'ALL' | StatusTab;

/** 진행 보드 탭: 전체 + 새 표기 4종(디자이너 전달사항 2026.10.08 — 옛 표기 수락대기·수락됨·작업완료 대신) */
const BOARD_TABS: { key: BoardTab; text: string }[] = [
  { key: 'ALL', text: '전체' },
  ...(['PENDING_ACCEPT', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'] as const).map((status) => ({
    key: status,
    text: TASK_STATUS_LABEL[status],
  })),
];

/**
 * 진행 보드(560:2831). /board/:taskId 상세 모달은 <Outlet>으로 보드 위에 그린다.
 * 네트워크 실패(?network=offline)면 실패 화면(1472:7414)만 보여 준다.
 */
export default function BoardPage() {
  const offline = useAppStore(selectIsOffline);
  useEffect(preloadTaskDetailModal, []);
  if (offline) return <BoardOffline />;
  return (
    <>
      <BoardContent />
      <Outlet />
    </>
  );
}

function BoardContent() {
  const date = today();
  const summary = useBoardSummary(date);
  const tasks = useTasksByDate(date);
  const [tab, setTab] = useState<BoardTab>('ALL');

  const rows = useMemo(() => (tab === 'ALL' ? tasks : tasks.filter((task) => task.status === tab)), [tasks, tab]);

  // 목록 없음 시안(2043:35796)은 탭 건수를 표시하지 않는다.
  const showCounts = summary.total > 0;
  const tabs: UnderlineTab<BoardTab>[] = BOARD_TABS.map(({ key, text }, index) => {
    // 560:2848: 활성 탭은 라벨·건수 간격 2(DS 기본 6).
    // 셋째~다섯째 탭(Component 15~17)은 47px 탭 인스턴스(y=0)라 DS tall 탭으로 그린다(라벨 1px 위).
    const count = key === 'ALL' ? summary.total : summary.byStatus[key];
    return {
      key,
      label: key === tab && showCounts ? <span className={styles.activeTabLabel}>{text}</span> : text,
      count: showCounts ? count : undefined,
      tall: index >= 2,
    };
  });

  return (
    <div className={styles.page}>
      <div className={styles.overview}>
        <BoardHeader dateLabel={formatBoardDate(date)} />
        <BoardSummaryCards summary={summary} />
      </div>
      <section className={styles.status} aria-labelledby="board-status-title">
        <div className={styles.statusHead}>
          <h2 id="board-status-title" className={clsx('t-body-xl-bold', styles.statusTitle)}>
            작업 상태
          </h2>
          <UnderlineTabs tabs={tabs} value={tab} onChange={setTab} aria-label="작업 상태" />
        </div>
        <BoardTaskTable tasks={rows} />
      </section>
    </div>
  );
}
