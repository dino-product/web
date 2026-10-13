import clsx from 'clsx';
import { useRef, useState } from 'react';

import { Menu, MenuItem, Popover } from '@/design-system';

import caretSrc from './assets/select-caret.svg';
import styles from './TypeSelect.module.css';

export interface TypeSelectOption<T extends string> {
  value: T;
  label: string;
}

export interface TypeSelectProps<T extends string> {
  value: T | null;
  options: TypeSelectOption<T>[];
  onChange: (value: T) => void;
  'aria-label'?: string;
}

/**
 * 기사유형 변경 모달의 선택 상자(Figma `직원 유형` 2008:34190).
 * 515x56, Gray200 1px 테두리(레이아웃 포함), radius 12, padding 16/12, 값 16/500 Gray800, 오른쪽 Polygon 2(14x8, Gray500).
 * DS SelectField와 값 색(Gray700)·▼ 모양(caret-down 13x8 #727272)이 달라 지역 컴포넌트로 둔다.
 * 옵션 패널·열림 테두리(Secondary)는 DS SelectField와 같게 Popover + Menu로 그린다.
 */
export function TypeSelect<T extends string>({ value, options, onChange, 'aria-label': ariaLabel }: TypeSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const current = options.find((option) => option.value === value);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={clsx(styles.trigger, open && styles.open)}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={clsx('t-body-xs-medium', styles.value)}>{current?.label ?? ''}</span>
        <span className={styles.caret} aria-hidden>
          <img className={styles.caretImage} src={caretSrc} alt="" />
        </span>
      </button>
      <Popover open={open} anchorRef={anchorRef} onClose={() => setOpen(false)} matchWidth>
        <Menu role="listbox">
          {options.map((option) => (
            <MenuItem
              key={option.value}
              selected={option.value === value}
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
