import clsx from 'clsx';
import type { ComponentPropsWithRef, ReactNode } from 'react';

import { Icon } from '../Icon/Icon';
import styles from './Checkbox.module.css';

export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'size' | 'children'> {
  checked: boolean;
  /** 체크박스 오른쪽 글자(스타일은 labelClassName 또는 부모 글자 스타일) */
  label?: ReactNode;
  /**
   * 미선택 모양
   * - box: Gray400 빈 사각형(승인대기 목록 1888:10735)
   * - check: Gray500 테두리 체크(octicon:checkbox-16, 계정 탈퇴 동의 전 1325:8951)
   */
  uncheckedIcon?: 'box' | 'check';
  /** 선택 색. 기본 Secondary(약관 동의·승인대기 mingcute:checkbox-fill). */
  color?: string;
  /** 체크박스와 글자 간격(px). 기본 8 — 약관 항목 8, 전체 동의 12, 승인대기 이름 26 */
  gap?: number;
  className?: string;
  labelClassName?: string;
}

/** 24px 체크박스. 실제 input은 시각적으로 숨기고 Figma 아이콘으로 그린다. */
export function Checkbox({
  checked,
  label,
  uncheckedIcon = 'box',
  color = 'var(--color-secondary)',
  gap = 8,
  className,
  labelClassName,
  disabled,
  ...rest
}: CheckboxProps) {
  const icon = checked
    ? 'checkbox-checked'
    : uncheckedIcon === 'check'
      ? 'checkbox-outline-checked'
      : 'checkbox-unchecked';
  const iconColor = checked ? color : uncheckedIcon === 'check' ? 'var(--color-gray-500)' : 'var(--color-gray-400)';
  return (
    <label className={clsx(styles.checkbox, disabled && styles.disabled, className)} style={{ gap }}>
      <input type="checkbox" className={styles.input} checked={checked} disabled={disabled} {...rest} />
      <Icon name={icon} size={24} color={iconColor} className={styles.box} />
      {label !== undefined && <span className={labelClassName}>{label}</span>}
    </label>
  );
}
