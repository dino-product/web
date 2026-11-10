import clsx from 'clsx';

import styles from './BoardHeader.module.css';

interface BoardHeaderProps {
  /** 예: '2026년 10월 13일 (오늘)' */
  dateLabel: string;
}

/**
 * 진행 보드 머리말(1892:12832): 제목과 날짜.
 * 시안의 '실시간 갱신 중'(560:2859)·'연결 끊김 안내'(560:2862)는 요청에 따라 그리지 않는다.
 * 작업이 저장되면 실시간 연결(src/data/realtime.ts)이 보드를 다시 읽는 동작은 그대로다.
 */
export default function BoardHeader({ dateLabel }: BoardHeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={clsx('t-title-s', styles.title)}>진행 보드</h1>
      <p className={clsx('t-body-m-semibold', styles.date)}>{dateLabel}</p>
    </header>
  );
}
