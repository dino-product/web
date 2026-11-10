import clsx from 'clsx';
import type { CSSProperties } from 'react';

import styles from './Avatar.module.css';

export interface AvatarProps {
  /** 지름(px). 기본 36 */
  size?: number;
  /** 표시할 이름(첫 글자만 표시) */
  text: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Accepted/2 원 + 첫 글자(Secondary, 14/500 @36px, 24/500 @62px) — 발주사 전환 팝오버 36px, 기사 작업이력 62px.
 */
export function Avatar({ size = 36, text, alt = '', className, style }: AvatarProps) {
  // Figma 글자 크기·줄 높이는 정수: 36px 원 → 14/20(1921:11035), 62px 원 → 24/34(기사 작업이력 1674:8157)
  const fontSize = Math.round((size * 14) / 36);
  return (
    <span
      className={clsx(styles.avatar, className)}
      style={{ width: size, height: size, fontSize, lineHeight: `${Math.round(fontSize * 1.4)}px`, ...style }}
      aria-hidden={alt ? undefined : true}
      aria-label={alt || undefined}
    >
      {Array.from(text)[0] ?? ''}
    </span>
  );
}
