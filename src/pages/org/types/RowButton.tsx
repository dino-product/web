import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';

import { Icon } from '@/design-system';

import styles from './RowButton.module.css';

/**
 * 유형 목록 행 안의 작은 버튼(DS Button에 없는 크기 — 높이 43, radius 10, padding 6/16, 18/500).
 * - outline: 흰 배경 + Gray200 바깥 1px 테두리, Gray900 글자 — '취소'(2008:27019)·'삭제'(1924:15113)
 * - primary: Primary 배경, 흰 글자 — '변경사항 저장'(2008:27020)·'저장'(1924:15112)
 * - edit: outline 모양 + 연필 아이콘 24(간격 4), Gray800 글자 — '수정하기'(1924:16450)
 */
export type RowButtonVariant = 'outline' | 'primary' | 'edit';

export interface RowButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: RowButtonVariant;
  /** Figma 고정 너비(px). 글자 폭이 브라우저마다 조금씩 달라도 버튼 위치가 시안과 같게 둔다. */
  width?: number;
}

export function RowButton({ variant = 'outline', width, type = 'button', className, style, children, ...rest }: RowButtonProps) {
  return (
    <button
      type={type}
      className={clsx(styles.button, styles[variant], className)}
      style={width === undefined ? style : { width, ...style }}
      {...rest}
    >
      {variant === 'edit' && <Icon name="pencil-line" size={24} color="var(--color-gray-800)" />}
      {children}
    </button>
  );
}
