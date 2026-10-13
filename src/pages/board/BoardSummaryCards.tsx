import clsx from 'clsx';

import type { BoardSummary } from '@/mocks/selectors';

import styles from './BoardSummaryCards.module.css';

type SummaryKey = 'total' | 'inProgress' | 'delayed' | 'completed';

/** 575:3298 — 총 작업(어두운 카드)·진행중·지연·완료. 집계 정의는 getBoardSummary(docs/data-layer.md §5) */
const CARDS: { key: SummaryKey; label: string; dark?: boolean }[] = [
  { key: 'total', label: '총 작업', dark: true },
  { key: 'inProgress', label: '진행중' },
  { key: 'delayed', label: '지연' },
  { key: 'completed', label: '완료' },
];

export default function BoardSummaryCards({ summary }: { summary: BoardSummary }) {
  return (
    <ul className={styles.cards}>
      {CARDS.map((card) => (
        <li key={card.key} className={clsx(styles.card, card.dark && styles.dark)}>
          <span className={styles.label}>{card.label}</span>
          <span className={styles.count}>{summary[card.key]}</span>
          <span className={clsx('t-body-l-bold', styles.unit)}>건</span>
        </li>
      ))}
    </ul>
  );
}
