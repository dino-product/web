import { type ReactNode, useRef, useState } from 'react';

import { Menu, MenuItem } from '../Menu/Menu';
import { Popover, type PopoverPlacement } from '../Popover/Popover';
import { SelectButton } from '../SelectButton/SelectButton';

export interface FilterOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface FilterSelectProps<T extends string> {
  /** 트리거 글자(필터 이름). 예: '상태', '등록자' */
  label: ReactNode;
  options: FilterOption<T>[];
  /** 패널 위치. 기본 bottom-start, 트리거 아래 6px(1883:14092) */
  placement?: PopoverPlacement;
  /** 패널 너비를 트리거와 맞춘다(기본 true — 등록자 118px) */
  matchWidth?: boolean;
  /** matchWidth=false일 때 패널 최소 너비 */
  menuMinWidth?: number;
  className?: string;
  disabled?: boolean;
  value: T | null;
  /** 이미 선택된 값을 다시 누르면 null(필터 해제) */
  onChange: (value: T | null) => void;
}

/**
 * 필터 드롭다운 = SelectButton(Figma Select 449:2597) + Menu 패널(직원 유형 Drop Down=o 모양).
 * 항목마다 하나만 고르며, 고르면 닫힌다. 선택지가 없으면 패널을 열지 않는다.
 */
export function FilterSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  placement = 'bottom-start',
  matchWidth = true,
  menuMinWidth,
  className,
  disabled,
}: FilterSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  // 선택지가 없으면(예: 기사·유형이 없는 발주사의 담당기사·유형) 빈 메뉴 상자를 열지 않는다(시안에 없는 모양).
  const hasOptions = options.length > 0;

  const select = (next: T) => {
    onChange(value === next ? null : next);
    setOpen(false);
  };

  return (
    <>
      <SelectButton
        ref={anchorRef}
        label={label}
        open={open && hasOptions}
        disabled={disabled}
        className={className}
        onClick={() => setOpen((v) => !v && hasOptions)}
      />
      <Popover
        open={open && hasOptions}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        placement={placement}
        matchWidth={matchWidth}
      >
        <Menu role="listbox" style={{ minWidth: menuMinWidth }}>
          {options.map((option) => (
            <MenuItem key={option.value} selected={option.value === value} onClick={() => select(option.value)}>
              {option.label}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </>
  );
}
