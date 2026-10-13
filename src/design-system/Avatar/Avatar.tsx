import clsx from 'clsx';
import type { CSSProperties } from 'react';

import { Icon } from '../Icon/Icon';
import styles from './Avatar.module.css';

/**
 * - user: Accepted/2 원 + user 아이콘(Primary100) — 사이드바 사용자 카드 50px(아이콘 28)
 * - initial: Accepted/2 원 + 첫 글자(Secondary, 14/500 @36px, 24/500 @62px) — 발주사 전환 팝오버 36px, 기사 작업이력 62px
 * - profile: #e2e2f0 원 + user-fill 아이콘(#56569D, 지름의 56%) — 마이페이지 130px
 * - image: 사진(원형 크롭). src가 없으면 profile 모양
 */
export type AvatarVariant = 'user' | 'initial' | 'profile' | 'image';

export interface AvatarProps {
  variant?: AvatarVariant;
  /** 지름(px). 기본 50 */
  size?: number;
  /** initial 변형의 글자(첫 글자만 표시) */
  text?: string;
  /** image 변형 사진 URL */
  src?: string | null;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

export function Avatar({ variant = 'user', size = 50, text = '', src, alt = '', className, style }: AvatarProps) {
  const box: CSSProperties = { width: size, height: size, ...style };
  if (variant === 'image' && src) {
    return <img className={clsx(styles.avatar, styles.image, className)} style={box} src={src} alt={alt} />;
  }
  if (variant === 'initial') {
    // Figma 글자 크기·줄 높이는 정수: 36px 원 → 14/20(1921:11035), 62px 원 → 24/34(기사 작업이력 1674:8157)
    const fontSize = Math.round((size * 14) / 36);
    return (
      <span
        className={clsx(styles.avatar, styles.initial, className)}
        style={{ ...box, fontSize, lineHeight: `${Math.round(fontSize * 1.4)}px` }}
        aria-hidden={alt ? undefined : true}
        aria-label={alt || undefined}
      >
        {Array.from(text)[0] ?? ''}
      </span>
    );
  }
  if (variant === 'user') {
    return (
      <span className={clsx(styles.avatar, styles.user, className)} style={box}>
        <Icon name="user" size={(size * 28) / 50} color="var(--color-primary-100)" />
      </span>
    );
  }
  return (
    <span className={clsx(styles.avatar, styles.profile, className)} style={box}>
      <Icon name="user-fill" size={(size * 72.8) / 130} color="#56569d" />
    </span>
  );
}
