import clsx from 'clsx';
import { type ReactNode, useRef, useState } from 'react';

import { Icon } from '../Icon/Icon';
import control from '../internal/control.module.css';
import { Menu, MenuItem } from '../Menu/Menu';
import { Popover } from '../Popover/Popover';
import type { ControlAppearance } from '../TextField/TextField';
import styles from './SelectField.module.css';

export interface SelectFieldOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface SelectFieldProps<T extends string> {
  value: T | null;
  options: SelectFieldOption<T>[];
  onChange: (value: T) => void;
  /** 값이 없을 때 회색 안내 문구. 예: '작업 유형 선택', '고객 요청 / 기사 사정 / 중복 등록 / 기타' */
  placeholder?: ReactNode;
  appearance?: Exclude<ControlAppearance, 'filled'>;
  /** 안내 문구 색. muted(기본) Gray500 — 새 작업 등록 · strong Gray700 — 작업 취소 사유 */
  placeholderTone?: 'muted' | 'strong';
  /** 모서리 반경(px). 기본은 appearance 값. 배정 확인 모달은 8 */
  radius?: number;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * 폼 선택 상자 — 오른쪽 ▼(Polygon 1, #727272). 배정 확인(1325:9675)·작업 취소(785:7932)·총관리자 지정(2008:24428)·
 * 새 작업 등록(1325:5516)·발주사 정보 업종(650:2840).
 * 값 Gray700(16/500, large는 Gray900), 플레이스홀더 Gray500, 열리면 Secondary 테두리 + 값 Gray900(총관리자 지정 시안).
 * 옵션 패널은 Menu(직원 유형 Drop Down=o 모양)를 트리거 너비로 6px 아래에 띄운다.
 */
export function SelectField<T extends string>({
  value,
  options,
  onChange,
  placeholder,
  appearance = 'modal',
  placeholderTone = 'muted',
  radius,
  disabled = false,
  invalid = false,
  id,
  className,
  'aria-label': ariaLabel,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const current = options.find((o) => o.value === value);
  // 선택지가 없으면 빈 메뉴 상자를 열지 않는다(시안에 없는 모양).
  const hasOptions = options.length > 0;

  return (
    <>
      <button
        ref={anchorRef}
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open && hasOptions}
        disabled={disabled}
        className={clsx(
          control.box,
          control[appearance],
          styles.trigger,
          open && hasOptions && control.focused,
          invalid && control.invalid,
          disabled && control.readOnly,
          className,
        )}
        style={radius === undefined ? undefined : { borderRadius: radius }}
        onClick={() => setOpen((v) => !v && hasOptions)}
      >
        <span
          className={clsx(
            styles.value,
            !current && (placeholderTone === 'strong' ? styles.placeholderStrong : styles.placeholder),
            current && ((open && hasOptions) || appearance === 'large') && styles.valueOpen,
          )}
        >
          {current ? current.label : placeholder}
        </span>
        <span className={styles.caret}>
          <Icon name="caret-down" color="#727272" />
        </span>
      </button>
      <Popover open={open && hasOptions} anchorRef={anchorRef} onClose={() => setOpen(false)} matchWidth>
        <Menu role="listbox">
          {options.map((option) => (
            <MenuItem
              key={option.value}
              selected={option.value === value}
              disabled={option.disabled}
              onClick={() => {
                setOpen(false);
                onChange(option.value);
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
