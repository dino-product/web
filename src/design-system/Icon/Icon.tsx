import clsx from 'clsx';
import { type CSSProperties, type HTMLAttributes, useId, useMemo } from 'react';

import { prepareSvg } from '../internal/inlineSvg';
import styles from './Icon.module.css';
import { type IconName, ICONS } from './icons';

export interface IconProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color' | 'children'> {
  /** 아이콘 이름(docs/design-system.md 아이콘 표) */
  name: IconName;
  /**
   * 가로 크기(px). 세로는 원본 비율을 따른다. 지정하지 않으면 Figma에서 내보낸 원래 크기.
   * 예: users(28)를 42로 그리면 Figma `Icon / Type=인력`과 같다.
   */
  size?: number;
  /** 단색 아이콘의 색(CSS 색 또는 var(--color-*)). 기본은 currentColor. 다색 아이콘에는 적용되지 않는다. */
  color?: string;
  /** 접근성 이름. 없으면 장식용(aria-hidden). */
  title?: string;
}

/** Figma 아이콘(SVG)을 인라인으로 그린다. 단색 아이콘은 color(기본 currentColor)로 색을 바꾼다. */
export function Icon({ name, size, color, title, className, style, ...rest }: IconProps) {
  const uid = useId();
  const source = ICONS[name];
  const width = size ?? source.width;
  const height = size === undefined ? source.height : (size * source.height) / source.width;
  const html = useMemo(
    () => prepareSvg(source.svg, uid, size === undefined ? undefined : width, size === undefined ? undefined : height),
    [source.svg, uid, size, width, height],
  );
  const mergedStyle: CSSProperties = { width, height, ...(color ? { color } : null), ...style };
  return (
    <span
      {...rest}
      className={clsx(styles.icon, className)}
      style={mergedStyle}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
