import clsx from 'clsx';
import { type ReactNode, useRef, useState } from 'react';

import { Icon, Popover } from '@/design-system';

import styles from './ListSelect.module.css';

export interface ListSelectOption<T extends string> {
  value: T;
  label: ReactNode;
}

/**
 * 조직 설정의 선택 상자. 옵션 목록이 DS Menu(48px·18px)와 다른 시안이라 지역 컴포넌트로 둔다(DS 보완 필요).
 * - industry: 발주사 정보 업종 — 트리거 650:2840(1447x59, 바깥 Gray300, 글자 x=16, ▼ 오른쪽 24), 목록 1951:17646
 * - owner: 총관리자 지정 직원 선택 — 트리거 2008:24436(값이 있거나 열리면 Secondary 테두리), 목록 1921:10948
 * - roleType: 역할 변경 직원/기사 유형 — 트리거 2008:31026(Gray200 테두리, 값 Gray800, ▼ 14x8 Gray500).
 *   열린 목록 시안이 없어 같은 모달의 owner 목록 모양을 쓴다.
 * 목록: 흰 배경, Gray200 안쪽 1px, radius 12, 그림자 0 0 12 8%, 항목 50px·radius 8·16/500 Gray900, 선택 Gray50.
 */
export type ListSelectVariant = 'industry' | 'owner' | 'roleType';

export interface ListSelectProps<T extends string> {
  variant: ListSelectVariant;
  value: T | null;
  options: ListSelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: ReactNode;
  id?: string;
  'aria-label'?: string;
}

/**
 * 트리거 아래 목록 간격: 업종 508-501(1951:17646), 직원 선택 622-613.5(1921:10948).
 * 총관리자 지정 모달은 시안에서 y=364.5(반 픽셀)이고 화면에서는 364라 트리거 아래 끝이 613이다. 9로 두어 목록을 시안과 같은 y=622에 맞춘다.
 */
const OFFSET: Record<ListSelectVariant, number> = { industry: 7, owner: 9, roleType: 8 };

export function ListSelect<T extends string>({
  variant,
  value,
  options,
  onChange,
  placeholder,
  id,
  'aria-label': ariaLabel,
}: ListSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const current = options.find((option) => option.value === value);

  return (
    <>
      <button
        ref={anchorRef}
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={clsx(styles.trigger, styles[variant], open && styles.open, current && styles.filled)}
        onClick={() => setOpen((v) => !v && options.length > 0)}
      >
        <span className={clsx(styles.value, !current && styles.placeholder)}>{current ? current.label : placeholder}</span>
        <span className={styles.caret}>
          {variant === 'roleType' ? (
            <Icon name="caret-down" size={10} color="var(--color-gray-500)" />
          ) : (
            <Icon name="caret-down" color="#727272" />
          )}
        </span>
      </button>
      <Popover open={open} anchorRef={anchorRef} onClose={() => setOpen(false)} offset={OFFSET[variant]} matchWidth>
        <div role="listbox" className={clsx(styles.list, variant === 'industry' ? styles.wideList : styles.modalList)}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={clsx(styles.item, option.value === value && styles.selected)}
              onClick={() => {
                setOpen(false);
                onChange(option.value);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Popover>
    </>
  );
}
