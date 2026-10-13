import { useEffect, useRef } from 'react';

import { Icon } from '@/design-system';

import indeterminateIcon from '../assets/checkbox-indeterminate.svg';
import styles from './TriCheckbox.module.css';

export interface TriCheckboxProps {
  checked: boolean;
  /** 일부 선택(승인대기 머리줄 1951:20025 — 보라 사각형 + 흰 가로선) */
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  'aria-label'?: string;
}

/**
 * 승인대기 표의 24px 체크박스(mingcute:checkbox-fill). 선택 Secondary, 미선택 Gray400 빈 사각형,
 * 일부 선택은 DS Checkbox에 없는 모양이라 시안 SVG를 그대로 쓴다(DS 보완 필요).
 */
export function TriCheckbox({ checked, indeterminate = false, onChange, 'aria-label': ariaLabel }: TriCheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  const mixed = indeterminate && !checked;
  return (
    <label className={styles.box}>
      <input
        ref={inputRef}
        type="checkbox"
        className={styles.input}
        checked={checked}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.checked)}
      />
      {mixed ? (
        <img src={indeterminateIcon} width={24} height={24} alt="" className={styles.icon} />
      ) : (
        <Icon
          name={checked ? 'checkbox-checked' : 'checkbox-unchecked'}
          size={24}
          color={checked ? 'var(--color-secondary)' : 'var(--color-gray-400)'}
          className={styles.icon}
        />
      )}
    </label>
  );
}
