import clsx from 'clsx';
import { useRef, useState } from 'react';

import { Icon, Popover } from '@/design-system';
import { CANCEL_REASONS } from '@/data/constants';

import styles from './CancelReasonSelect.module.css';

export type CancelReason = (typeof CANCEL_REASONS)[number];

interface CancelReasonSelectProps {
  value: CancelReason | null;
  onChange: (value: CancelReason) => void;
  id?: string;
}

/**
 * 작업 취소 사유 선택(Figma 785:7932 닫힘, 1282:2614 열림).
 * DS SelectField와 다른 점: 고른 값 Gray900, 열리면 ▲, 옵션 패널이 시안 1282:2978 모양
 * (Gray200 1px, radius 12, 그림자 0 0 12 8%, 항목 50px·16/500 Gray900·radius 8, 트리거 아래 4px)이라 지역 컴포넌트로 둔다.
 */
export function CancelReasonSelect({ value, onChange, id }: CancelReasonSelectProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={anchorRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={clsx(styles.trigger, open && styles.open)}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={clsx(styles.value, !value && styles.placeholder)}>
          {value ?? '고객 요청 / 기사 사정 / 중복 등록 / 기타'}
        </span>
        <span className={clsx(styles.caret, open && styles.caretOpen)}>
          <Icon name="caret-down" color="#727272" />
        </span>
      </button>
      <Popover open={open} anchorRef={anchorRef} onClose={() => setOpen(false)} offset={4} matchWidth>
        <div role="listbox" aria-label="취소 사유" className={styles.panel}>
          {CANCEL_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              role="option"
              aria-selected={reason === value}
              className={clsx(styles.option, reason === value && styles.selected)}
              onClick={() => {
                onChange(reason);
                setOpen(false);
              }}
            >
              {reason}
            </button>
          ))}
        </div>
      </Popover>
    </>
  );
}
