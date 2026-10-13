import clsx from 'clsx';

import { Icon } from '@/design-system';

import liveDot from './assets/live-dot.svg';
import styles from './BoardHeader.module.css';

interface BoardHeaderProps {
  /** 예: '2026년 10월 13일 (오늘)' */
  dateLabel: string;
}

/**
 * 진행 보드 머리말(1892:12832): 제목, 날짜 + '실시간 갱신 중', 오른쪽 '연결 끊김 안내'(560:2862).
 * '연결 끊김 안내'는 목적지 시안이 없어 동작하지 않는 문구로 둔다.
 */
export default function BoardHeader({ dateLabel }: BoardHeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={clsx('t-title-s', styles.title)}>진행 보드</h1>
      <div className={styles.meta}>
        <div className={styles.dateRow}>
          <p className={clsx('t-body-m-semibold', styles.date)}>{dateLabel}</p>
          <p className={styles.live}>
            <img src={liveDot} width={8} height={8} alt="" />
            <span className={clsx('t-body-s-medium', styles.liveText)}>실시간 갱신 중</span>
          </p>
        </div>
        <p className={styles.help}>
          <Icon name="help-circle" color="#141b34" />
          <span className={clsx('t-body-s-medium', styles.helpText)}>연결 끊김 안내</span>
        </p>
      </div>
    </header>
  );
}
