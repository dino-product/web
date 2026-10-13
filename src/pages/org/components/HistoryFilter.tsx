import { useRef, useState } from 'react';

import { Icon, Menu, MenuItem, Popover } from '@/design-system';

import styles from './HistoryFilter.module.css';

export interface HistoryFilterOption<T extends string> {
  value: T;
  label: string;
}

export interface HistoryFilterProps<T extends string> {
  value: T;
  options: HistoryFilterOption<T>[];
  onChange: (value: T) => void;
  'aria-label'?: string;
}

/**
 * 기사 작업이력 필터 버튼(1551:8974): 높이 47, padding 10/16, 간격 15, Gray300 안쪽 1px, radius 12,
 * 18/600 Gray800 + 셰브론(Vector 3, Gray600). DS SelectButton(50px·셰브론 28)과 달라 지역 컴포넌트로 둔다(DS 보완 필요).
 * 버튼 글자는 고른 값. 목록 패널 시안이 없어 DS Menu를 트리거 아래 6px에 띄운다.
 */
export function HistoryFilter<T extends string>({ value, options, onChange, 'aria-label': ariaLabel }: HistoryFilterProps<T>) {
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
        className={styles.button}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{current?.label ?? ''}</span>
        <span className={styles.chevron}>
          <Icon name="chevron-down-sm" color="var(--color-gray-600)" />
        </span>
      </button>
      <Popover open={open} anchorRef={anchorRef} onClose={() => setOpen(false)}>
        <Menu role="listbox" className={styles.menu}>
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
