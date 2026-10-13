import clsx from 'clsx';

import styles from './DetailTabs.module.css';

export type DetailTab = 'report' | 'attachments';

interface DetailTabsProps {
  value: DetailTab;
  onChange: (tab: DetailTab) => void;
  attachmentCount: number;
}

/**
 * 작업 상세 오른쪽 탭(Figma `Component 1` 785:5803·785:5804). 탭 108px, 간격 30, 라벨 16/500, 아래 14px에 3px 막대.
 * DS UnderlineTabs(20/500, 128px, 간격 0)와 크기·색이 달라 지역 컴포넌트로 둔다.
 * 활성 라벨 색은 시안 변형을 따른다: '완료 보고' Gray900(785:4191), '첨부 파일' #000(785:7238). 비활성은 Gray600.
 */
export function DetailTabs({ value, onChange, attachmentCount }: DetailTabsProps) {
  return (
    <div role="tablist" aria-label="작업 상세" className={styles.tabs}>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'report'}
        className={clsx(styles.tab, value === 'report' && styles.activeReport)}
        onClick={() => onChange('report')}
      >
        <span className={styles.labelRow}>
          <span className={styles.label}>완료 보고</span>
        </span>
        <span className={styles.bar} />
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'attachments'}
        className={clsx(styles.tab, value === 'attachments' && styles.activeAttachments)}
        onClick={() => onChange('attachments')}
      >
        <span className={styles.labelRow}>
          <span className={styles.label}>첨부 파일</span>
          <span className={styles.count}>{attachmentCount}</span>
        </span>
        <span className={styles.bar} />
      </button>
    </div>
  );
}
