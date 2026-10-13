import clsx from 'clsx';
import { type CSSProperties, type HTMLAttributes, useId, useMemo } from 'react';

import lockupSvg from '@/assets/logo/orbit-lockup.svg?raw';
import markSvg from '@/assets/logo/orbit-mark.svg?raw';
import heroSvg from '@/assets/logo/orbit-wordmark-hero.svg?raw';
import wordmarkSvg from '@/assets/logo/orbit-wordmark.svg?raw';

import { prepareSvg } from '../internal/inlineSvg';
import styles from './Logo.module.css';

/**
 * - lockup: 마크 + 'Orbit' 워드마크(125×32). 사이드바 로고(Figma `Side bar` 456:4284 / Frame 3).
 * - wordmark: 'Orbit' 글자만(KIMM_Bold 32px 글자 외곽, 84×25).
 * - hero: 로그인 화면의 큰 'Orbit'(KIMM_Bold 123.6px, 323×94, 2423:12794).
 * - mark: 둥근 사각형 마크(28×28, radius 8).
 */
export type LogoVariant = 'lockup' | 'wordmark' | 'hero' | 'mark';

const SOURCES: Record<LogoVariant, { svg: string; width: number; height: number }> = {
  lockup: { svg: lockupSvg.trim(), width: 125, height: 32 },
  wordmark: { svg: wordmarkSvg.trim(), width: 84, height: 25 },
  hero: { svg: heroSvg.trim(), width: 323, height: 94 },
  mark: { svg: markSvg.trim(), width: 28, height: 28 },
};

export interface LogoProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color' | 'children'> {
  variant?: LogoVariant;
  /** 세로 크기(px). 가로는 비율대로. 기본은 원래 크기. */
  height?: number;
  /** 로고 색. 기본 currentColor. 사이드바는 var(--color-gray-0), 로그인은 var(--color-primary). */
  color?: string;
  /** 접근성 이름. 기본 'Orbit' */
  title?: string;
}

/** Orbit 로고. KIMM_Bold 글꼴 대신 Figma에서 외곽선으로 내보낸 SVG를 쓴다. */
export function Logo({ variant = 'lockup', height, color, title = 'Orbit', className, style, ...rest }: LogoProps) {
  const uid = useId();
  const source = SOURCES[variant];
  const h = height ?? source.height;
  const w = (source.width * h) / source.height;
  const html = useMemo(
    () => prepareSvg(source.svg, uid, height === undefined ? undefined : w, height === undefined ? undefined : h),
    [source.svg, uid, height, w, h],
  );
  const mergedStyle: CSSProperties = { width: w, height: h, ...(color ? { color } : null), ...style };
  return (
    <span
      {...rest}
      className={clsx(styles.logo, className)}
      style={mergedStyle}
      role="img"
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
