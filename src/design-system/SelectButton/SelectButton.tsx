import clsx from 'clsx';
import type { ComponentPropsWithRef, ReactNode } from 'react';

import { Icon } from '../Icon/Icon';
import styles from './SelectButton.module.css';

export interface SelectButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** 버튼 글자. 예: '상태', '담당기사', '일반 기사', '점검' */
  label: ReactNode;
  /** 열림 상태(aria-expanded). Figma에는 열림 모양 차이가 없다. */
  open?: boolean;
}

/**
 * Figma `Select` 449:2597 — 필터 버튼. 높이 50, padding 10/16, radius 12, Gray200 테두리,
 * 18/500 Primary 글자 + chevron-down(Icon Type=Toggle) 28. 너비는 글자에 맞춰진다(상태 103, 담당기사 133).
 * 옵션 패널은 Popover + Menu로 붙인다(FilterSelect 참고).
 */
export function SelectButton({ label, open, type = 'button', className, ...rest }: SelectButtonProps) {
  return (
    <button
      type={type}
      aria-haspopup="listbox"
      aria-expanded={open}
      className={clsx(styles.select, className)}
      {...rest}
    >
      <span className={styles.label}>{label}</span>
      <Icon name="chevron-down" size={28} color="var(--color-gray-900)" />
    </button>
  );
}
