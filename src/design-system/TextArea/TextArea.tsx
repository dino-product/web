import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';

import styles from './TextArea.module.css';

export interface TextAreaProps extends ComponentPropsWithRef<'textarea'> {
  /** 높이(px). 기본 188 — 승인 거절 사유(1951:23292) */
  height?: number;
  invalid?: boolean;
}

/** 여러 줄 입력. Gray200 테두리, radius 12, padding 16/12, 16/500 Gray800, 플레이스홀더 Gray500. 크기 조절 핸들 없음. */
export function TextArea({ height = 188, invalid = false, className, style, ...rest }: TextAreaProps) {
  return (
    <textarea
      className={clsx(styles.textarea, invalid && styles.invalid, className)}
      style={{ height, ...style }}
      {...rest}
    />
  );
}
