import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

import styles from './InfoBox.module.css';

/**
 * 모달·화면 안의 회색 안내 상자. 유형 삭제 확인(1951:24074) '삭제된 유형은 복구할 수 없습니다.'
 * Background/3 배경, radius 10, padding 16, 16/500 Gray600.
 */
export function InfoBox({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx(styles.box, className)} {...rest} />;
}
