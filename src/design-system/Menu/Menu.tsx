import clsx from 'clsx';
import type { ComponentPropsWithRef, HTMLAttributes } from 'react';

import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import styles from './Menu.module.css';

/**
 * 드롭다운 패널. Figma `직원 유형` Drop Down=o(1377:7883), 작업 목록 등록자 필터(1883:14092),
 * 유형 설정 더보기 메뉴(2008:27440)와 같은 모양: 흰 배경, radius 10, padding 6, 항목 간격 2, 그림자 0 0 8.2 rgba(0,0,0,.17).
 */
export function Menu({ className, role = 'menu', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div role={role} className={clsx(styles.menu, className)} {...rest} />;
}

/**
 * - option: 선택지 목록(직원/기사, 등록자). 기본 Gray600 글자, 선택·호버 시 Gray50 배경 + Gray800 글자
 * - action: 동작 메뉴(비활성화·활성화). Gray800 글자, 호버 시 Gray50 배경
 * - danger: 삭제. Warning/1 글자, 호버 시 Gray50 배경
 */
export type MenuItemTone = 'option' | 'action' | 'danger';

export interface MenuItemProps extends ComponentPropsWithRef<'button'> {
  tone?: MenuItemTone;
  /** 선택된 옵션(Gray50 배경, Gray800 글자) */
  selected?: boolean;
  /** 앞 아이콘 24px(간격 8) — 더보기 메뉴의 ban·check-circle·trash */
  icon?: IconName;
  /** 아이콘 색. 기본은 글자색(danger는 Warning/1) */
  iconColor?: string;
}

const TONE_CLASS: Record<MenuItemTone, string> = {
  option: styles.option,
  action: styles.action,
  danger: styles.danger,
};

export function MenuItem({
  tone = 'option',
  selected = false,
  icon,
  iconColor,
  type = 'button',
  className,
  children,
  ...rest
}: MenuItemProps) {
  return (
    <button
      type={type}
      role={tone === 'option' ? 'option' : 'menuitem'}
      aria-selected={tone === 'option' ? selected : undefined}
      className={clsx(styles.item, TONE_CLASS[tone], selected && styles.selected, className)}
      {...rest}
    >
      {icon && <Icon name={icon} size={24} color={iconColor} />}
      <span className={styles.label}>{children}</span>
    </button>
  );
}
