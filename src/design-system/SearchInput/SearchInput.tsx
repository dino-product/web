import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';

import { Icon } from '../Icon/Icon';
import styles from './SearchInput.module.css';

export interface SearchInputProps extends Omit<ComponentPropsWithRef<'input'>, 'size' | 'type'> {
  /** 바깥 상자 className(너비 지정 — 인력관리 701px) */
  className?: string;
}

/**
 * 인력관리 '이름 검색'(1951:19170): 높이 50, padding 10/16, radius 12, Gray200 테두리, 흰 배경,
 * 돋보기(search 28, 플레이스홀더와 같은 #b5b5b5 — 1951:19172) + 간격 9 + 20/500 입력(값 Gray800 — 1951:22730). 플레이스홀더 #b5b5b5.
 */
export function SearchInput({ className, ...rest }: SearchInputProps) {
  return (
    <label className={clsx(styles.box, className)}>
      <Icon name="search" size={28} color="#b5b5b5" />
      <input type="search" className={styles.input} {...rest} />
    </label>
  );
}
