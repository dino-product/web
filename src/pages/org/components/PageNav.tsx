import clsx from 'clsx';

import { Icon } from '@/design-system';

import styles from './PageNav.module.css';

export interface PageNavProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  /** 한 번에 보이는 번호 수(시안 1~5) */
  maxPages?: number;
}

/**
 * 기사 작업이력 페이지 번호(1951:21712): [이전 32][번호 32x32 간격 6][다음 32], 간격 8.
 * 현재 쪽 Gray100 배경 + Gray800, 나머지 흰 배경 + Gray100 안쪽 1px + Gray700(16/500).
 * DS Pagination(작업 목록 460:4679: 현재 #e0e0ee + Secondary, 테두리 없음)과 모양이 달라 지역 컴포넌트로 둔다(DS 보완 필요).
 */
export function PageNav({ page, pageCount, onChange, maxPages = 5 }: PageNavProps) {
  const total = Math.max(1, pageCount);
  const current = Math.min(Math.max(1, page), total);
  const size = Math.min(maxPages, total);
  const start = Math.min(Math.max(1, current - Math.floor(size / 2)), total - size + 1);
  const pages = Array.from({ length: size }, (_, i) => start + i);
  const canPrev = current > 1;
  const canNext = current < total;

  return (
    <nav className={styles.nav} aria-label="페이지">
      <button
        type="button"
        className={styles.arrow}
        disabled={!canPrev}
        aria-label="이전 페이지"
        onClick={() => onChange(current - 1)}
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
        onClick={() => onChange(current + 1)}
      >
        <Icon name="page-next" color={canNext ? 'var(--color-gray-900)' : 'var(--color-gray-300)'} />
      </button>
    </nav>
  );
}
