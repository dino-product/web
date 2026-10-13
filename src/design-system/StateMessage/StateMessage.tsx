import clsx from 'clsx';
import type { ReactNode } from 'react';

import styles from './StateMessage.module.css';

/**
 * - page: 화면 단위 빈·오류 상태. 아이콘 → 30 → 제목 28/700 Primary → 16 → 설명 20/500 Gray700 → 36 → 버튼(간격 10).
 *   네트워크 연결 실패(1338:6564·1472:7414, wifi-off-circle), 알림 없음(2053:9689, bell-circle)
 * - list: 목록 안 빈 상태. 아이콘 → 24 → 제목 20/600 Gray500 → 20 → 버튼.
 *   작업 목록 공란(1773:7704), 진행 보드 목록 없음(2043:35796)
 * - card: 카드형. 512x300, Background/3 배경, Gray200 테두리, radius 18, 그림자 0 0 12 8%.
 *   아이콘 → 16 → 제목 20/600 Gray900 → 8 → 설명 14/500 Gray600 → 20 → 버튼. 타임테이블 기사 0명(1834:10132, users-circle 46)
 */
export type StateMessageVariant = 'page' | 'list' | 'card';

export interface StateMessageProps {
  variant?: StateMessageVariant;
  /** <Icon name="wifi-off-circle" /> 등 */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** 버튼들(Button). 여러 개면 간격 10으로 가로 배치 */
  actions?: ReactNode;
  className?: string;
}

export function StateMessage({ variant = 'page', icon, title, description, actions, className }: StateMessageProps) {
  return (
    <div className={clsx(styles.root, styles[variant], className)}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.body}>
        <div className={styles.texts}>
          <p className={styles.title}>{title}</p>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}
