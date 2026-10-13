import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';

import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import styles from './Button.module.css';

/**
 * Figma `Button` 449:2601 기반.
 * - primary: Text-Filled / Icon-Filled (Primary 배경, 흰 글자)
 * - outline: Text-Stoke / Icon-Stroke (Primary 테두리·글자)
 * - secondary: Text-Secondary (Gray300 테두리, Gray900 글자) — 모달 '취소'
 * - danger: Warning/1 배경, 흰 글자 — 계정 탈퇴 확인 '탈퇴'
 * - danger-soft: Warning/2 배경, Warning/1 글자 — 유형 삭제 '삭제', 작업 취소 '작업 취소'
 * - accent: Secondary 배경, 흰 글자 — 약관 동의 '동의하고 계속하기'
 * - ghost: 배경·테두리 없음, Gray900 글자 — 작업 취소 모달 '닫기'
 */
export type ButtonVariant = 'primary' | 'outline' | 'secondary' | 'danger' | 'danger-soft' | 'accent' | 'ghost';

/** md: 높이 50, 18px(Body/S/Medium) · lg: 높이 60, 20px(Body/M/Medium) — 발주사 정보·새 작업 등록 하단 '저장/취소' */
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 글자 앞 아이콘. 28px이면 간격 8(Icon-Filled/Stroke), 24px이면 간격 10(회사 코드 관리·승인대기·조직 설정으로) */
  icon?: IconName;
  iconSize?: 24 | 28;
  /** 오른쪽 위 빨간 점(승인대기 버튼 Ellipse 257) */
  dot?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: styles.primary,
  outline: styles.outline,
  secondary: styles.secondary,
  danger: styles.danger,
  'danger-soft': styles.dangerSoft,
  accent: styles.accent,
  ghost: styles.ghost,
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconSize = 28,
  dot = false,
  fullWidth = false,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        styles.button,
        VARIANT_CLASS[variant],
        size === 'lg' && styles.lg,
        icon && (iconSize === 28 ? styles.icon28 : styles.icon24),
        fullWidth && styles.fullWidth,
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {dot && <span className={styles.dot} aria-hidden />}
    </button>
  );
}
