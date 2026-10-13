import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';

import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import styles from './IconButton.module.css';

export interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  icon: IconName;
  /** 아이콘 가로 크기(px). 기본은 아이콘 원래 크기 */
  size?: number;
  /** 아이콘 색. 기본 currentColor */
  color?: string;
  /** 접근성 이름(필수, aria-label). 예: '닫기', '더보기', '대기함 접기'. 시안에 없는 브라우저 툴팁(title)은 띄우지 않는다 */
  label: string;
}

/** 배경 없는 아이콘 단독 버튼. 모달 닫기(close 28), 더보기(more-vertical 20), 대기함 접기(sidebar-left) 등 */
export function IconButton({ icon, size, color, label, type = 'button', className, ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} className={clsx(styles.iconButton, className)} {...rest}>
      <Icon name={icon} size={size} color={color} />
    </button>
  );
}
