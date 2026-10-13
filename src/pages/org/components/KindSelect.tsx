import clsx from 'clsx';
import { useRef, useState } from 'react';

import { Icon, Menu, MenuItem, Popover } from '@/design-system';
import { MEMBER_KIND_LABEL, type MemberKind } from '@/mocks/types';

import styles from './KindSelect.module.css';

const KINDS: MemberKind[] = ['EMPLOYEE', 'TECHNICIAN'];

export interface KindSelectProps {
  value: MemberKind;
  onChange: (kind: MemberKind) => void;
  /** 총관리자 행: Gray500 글자·셰브론, 열리지 않는다(`직원 유형` ReadOnly) */
  readOnly?: boolean;
  /** 승인대기 표처럼 칸 배경이 있는 곳은 흰 바탕(1888:10467 bg Gray0) */
  filled?: boolean;
  'aria-label'?: string;
}

/**
 * 표 안의 직원/기사 선택(Figma `직원 유형` 1377:7883, 인력관리 1951:19161·승인대기 1888:10087).
 * DS CompactSelect와 같은 모양이지만, 시안의 열린 목록(Drop Down=o)은 현재 값을 강조하지 않고
 * 가리킨 항목(기사)만 Gray50으로 칠해 지역 컴포넌트로 둔다(DS 보완 필요: 현재 값 강조 끄기 옵션).
 * 값을 고르면 onChange만 부른다(역할 변경 확인 모달은 화면이 띄운다).
 */
export function KindSelect({ value, onChange, readOnly = false, filled = false, 'aria-label': ariaLabel }: KindSelectProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={readOnly}
        className={clsx(styles.trigger, open && styles.open, readOnly && styles.readOnly, filled && styles.filled)}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{MEMBER_KIND_LABEL[value]}</span>
        <Icon name="chevron-down-sm" />
      </button>
      <Popover open={open} anchorRef={anchorRef} onClose={() => setOpen(false)} offset={17} matchWidth>
        <Menu role="listbox">
          {KINDS.map((kind) => (
            <MenuItem
              key={kind}
              aria-selected={kind === value}
              onClick={() => {
                setOpen(false);
                if (kind !== value) onChange(kind);
              }}
            >
              {MEMBER_KIND_LABEL[kind]}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </>
  );
}
