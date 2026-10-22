import clsx from 'clsx';
import type { CSSProperties } from 'react';

import type { TypeColor } from '@/data/types';

import styles from './WorkTypeBadge.module.css';

const PALETTE: Record<TypeColor, { fg: string; bg: string }> = {
  // Figma Work Type Badge 449:2580 전용 팔레트
  PURPLE: { fg: 'var(--color-install-1)', bg: 'var(--color-install-2)' },
  BLUE: { fg: 'var(--color-inspection-1)', bg: 'var(--color-inspection-2)' },
  YELLOW: { fg: 'var(--color-repair-1)', bg: 'var(--color-repair-2)' },
  // 그 외: Type Color 글자·점 + 같은 색 20% 배경
  GRAY: { fg: 'var(--color-type-gray)', bg: 'color-mix(in srgb, var(--color-type-gray) 20%, transparent)' },
  GREEN: { fg: 'var(--color-type-green)', bg: 'color-mix(in srgb, var(--color-type-green) 20%, transparent)' },
  BROWN: { fg: 'var(--color-type-brown)', bg: 'color-mix(in srgb, var(--color-type-brown) 20%, transparent)' },
  PINK: { fg: 'var(--color-type-pink)', bg: 'color-mix(in srgb, var(--color-type-pink) 20%, transparent)' },
  RED: { fg: 'var(--color-type-red)', bg: 'color-mix(in srgb, var(--color-type-red) 20%, transparent)' },
};

export interface WorkTypeBadgeProps {
  /** 작업 유형 이름. 예: '설치', '점검', '수리' */
  name: string;
  /** TypeItem.color. null이면 GRAY */
  color: TypeColor | null;
  className?: string;
}

/**
 * Figma `Work Type Badge` 449:2580 (Installation/Inspection/Repair).
 * 높이 26, padding 4/8, radius 5, 점 6px + 간격 6, 15/600(line-height auto, 자간 0).
 * PURPLE→Install, BLUE→Inspection, YELLOW→Repair 팔레트, 나머지는 Type Color + 20% 배경.
 */
export function WorkTypeBadge({ name, color, className }: WorkTypeBadgeProps) {
  const palette = PALETTE[color ?? 'GRAY'];
  const style = { '--badge-fg': palette.fg, '--badge-bg': palette.bg } as CSSProperties;
  return (
    <span className={clsx(styles.badge, className)} style={style}>
      <span className={styles.dot} aria-hidden />
      {name}
    </span>
  );
}
