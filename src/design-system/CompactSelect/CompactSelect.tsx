import clsx from 'clsx';
import { type ReactNode, useRef, useState } from 'react';

import { Icon } from '../Icon/Icon';
import { Menu, MenuItem } from '../Menu/Menu';
import { Popover } from '../Popover/Popover';
import styles from './CompactSelect.module.css';

export interface CompactSelectOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface CompactSelectProps<T extends string> {
  value: T;
  options: CompactSelectOption<T>[];
  onChange: (value: T) => void;
  /** ReadOnly 상태: Gray500 글자·셰브론, 열리지 않는다(총관리자 행 등) */
  readOnly?: boolean;
  /** 트리거 너비(px). 기본 118 */
  width?: number;
  /** 옵션 패널과 트리거 사이 간격. 기본 17 — 인력관리 표에서 패널이 행 아래 경계(트리거 아래 17px)에 붙는다 */
  menuOffset?: number;
  className?: string;
  'aria-label'?: string;
}

/**
 * Figma `직원 유형` 1377:7883 — 표 안의 작은 드롭다운(직원/기사 역할 선택 등).
 * 트리거: 118×41, padding 7/12, radius 10, Gray200 테두리(Open이면 Secondary), 18/500 Gray800, 작은 셰브론 8×5.
 * 패널: Drop Down=o — Menu(radius 10, padding 6, 항목 48px), 선택 항목 Gray50 배경.
 * 값을 고르면 onChange만 호출한다. 역할 변경 확인 모달은 화면에서 띄운다.
 */
export function CompactSelect<T extends string>({
  value,
  options,
  onChange,
  readOnly = false,
  width = 118,
  menuOffset = 17,
  className,
  'aria-label': ariaLabel,
}: CompactSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-readonly={readOnly || undefined}
        disabled={readOnly}
        className={clsx(styles.trigger, open && styles.open, readOnly && styles.readOnly, className)}
        style={{ width }}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.value}>{current?.label ?? value}</span>
        <Icon name="chevron-down-sm" />
      </button>
      <Popover open={open} anchorRef={anchorRef} onClose={() => setOpen(false)} offset={menuOffset} matchWidth>
        <Menu role="listbox">
          {options.map((option) => (
            <MenuItem
              key={option.value}
              selected={option.value === value}
              onClick={() => {
                setOpen(false);
                if (option.value !== value) onChange(option.value);
              }}
            >
              {option.label}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </>
  );
}
