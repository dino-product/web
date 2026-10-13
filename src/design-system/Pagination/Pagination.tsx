import clsx from 'clsx';
import type { ReactNode } from 'react';

import { Icon } from '../Icon/Icon';
import styles from './Pagination.module.css';

export interface PaginationProps {
  /** 현재 페이지(1부터) */
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  /** 왼쪽 요약 문구(16/500 Gray600). 예: '15건 중 5건 표시' */
  summary?: ReactNode;
  /** 한 번에 보이는 페이지 번호 수. 기본 5 */
  maxPages?: number;
  className?: string;
}

/**
 * 작업 목록 페이지네이션(460:4679 · 2110:9745). 높이 32 줄, 왼쪽 요약 · 오른쪽 [이전][번호…][다음](간격 8, 번호 간격 6).
 * 번호 32x32 radius 8, 16/500 Gray700 · 현재 페이지 #e0e0ee 배경 + Secondary 글자.
 * 이전·다음 화살표는 갈 수 없으면 Gray300, 갈 수 있으면 Gray900.
 */
export function Pagination({ page, pageCount, onChange, summary, maxPages = 5, className }: PaginationProps) {
  const total = Math.max(1, pageCount);
  const current = Math.min(Math.max(1, page), total);
  const windowSize = Math.min(maxPages, total);
  const start = Math.min(Math.max(1, current - Math.floor(windowSize / 2)), total - windowSize + 1);
  const pages = Array.from({ length: windowSize }, (_, i) => start + i);
  const canPrev = current > 1;
  const canNext = current < total;

  return (
    <div className={clsx(styles.row, className)}>
      <span className={styles.summary}>{summary}</span>
      <nav className={styles.pager} aria-label="페이지">
        <button
          type="button"
          className={styles.arrow}
          disabled={!canPrev}
          aria-label="이전 페이지"
          onClick={() => canPrev && onChange(current - 1)}
        >
          <Icon name="page-prev" color={canPrev ? 'var(--color-gray-900)' : 'var(--color-gray-300)'} />
        </button>
        <span className={styles.pages}>
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              aria-current={p === current ? 'page' : undefined}
              className={clsx(styles.page, p === current && styles.current)}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          ))}
        </span>
        <button
          type="button"
          className={styles.arrow}
          disabled={!canNext}
          aria-label="다음 페이지"
          onClick={() => canNext && onChange(current + 1)}
        >
          <Icon name="page-next" color={canNext ? 'var(--color-gray-900)' : 'var(--color-gray-300)'} />
        </button>
      </nav>
    </div>
  );
}
