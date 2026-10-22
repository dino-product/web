import { type ReactNode, useRef, useState } from 'react';

import { Menu, MenuItem } from '../Menu/Menu';
import { Popover, type PopoverPlacement } from '../Popover/Popover';
import { SelectButton } from '../SelectButton/SelectButton';

export interface FilterOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface BaseProps<T extends string> {
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
}

interface SingleProps<T extends string> extends BaseProps<T> {
  multiple?: false;
  value: T | null;
  /** 이미 선택된 값을 다시 누르면 null(필터 해제) */
  onChange: (value: T | null) => void;
}

interface MultipleProps<T extends string> extends BaseProps<T> {
  multiple: true;
  value: T[];
  onChange: (value: T[]) => void;
}

export type FilterSelectProps<T extends string> = SingleProps<T> | MultipleProps<T>;

/**
 * 필터 드롭다운 = SelectButton(Figma Select 449:2597) + Menu 패널(직원 유형 Drop Down=o 모양).
 * 단일 선택은 고르면 닫히고, multiple은 항목을 토글하며 열린 채로 둔다. 선택지가 없으면 패널을 열지 않는다.
 */
export function FilterSelect<T extends string>(props: FilterSelectProps<T>) {
  const { label, options, placement = 'bottom-start', matchWidth = true, menuMinWidth, className, disabled } = props;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  // 선택지가 없으면(예: 기사·유형이 없는 발주사의 담당기사·유형) 빈 메뉴 상자를 열지 않는다(시안에 없는 모양).
  const hasOptions = options.length > 0;
  const isSelected = (value: T) => (props.multiple ? props.value.includes(value) : props.value === value);

  const select = (value: T) => {
    if (props.multiple) {
      const next = props.value.includes(value) ? props.value.filter((v) => v !== value) : [...props.value, value];
      props.onChange(next);
      return;
    }
    props.onChange(props.value === value ? null : value);
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
        <Menu role="listbox" aria-multiselectable={props.multiple || undefined} style={{ minWidth: menuMinWidth }}>
          {options.map((option) => (
            <MenuItem key={option.value} selected={isSelected(option.value)} onClick={() => select(option.value)}>
              {option.label}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </>
  );
}
