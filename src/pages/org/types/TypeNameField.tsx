import clsx from 'clsx';
import { type KeyboardEvent, useCallback } from 'react';

import { NAME_HELP } from './typeRules';
import styles from './TypeNameField.module.css';

export interface TypeNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** 오류 문구. 있으면 Warning/1 테두리 + 오류 문구(2008:34201), 없으면 Gray400 도움말 */
  error: string | null;
  onSubmit: () => void;
  onCancel: () => void;
  'aria-label': string;
}

/**
 * 인라인 유형 이름 입력(Figma `직원 유형 1` 187x49 + 도움말, 1924:15042).
 * 테두리 Gray200 1px(레이아웃 포함), radius 10, 글자 18/500 Gray900. 시안의 입력 중 상태(1924:15092 '정규직 ㅣ')는
 * 테두리 색이 바뀌지 않아 포커스 모양을 따로 두지 않는다. Enter는 저장, Esc는 취소.
 */
export function TypeNameField({ value, onChange, error, onSubmit, onCancel, 'aria-label': ariaLabel }: TypeNameFieldProps) {
  // 처음 그려질 때 포커스하고 커서를 글자 끝에 둔다(수정하기·새 유형 추가 직후 바로 입력).
  const focusAtEnd = useCallback((input: HTMLInputElement | null) => {
    if (!input) return;
    input.focus({ preventScroll: true });
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className={styles.field}>
      <input
        ref={focusAtEnd}
        type="text"
        className={clsx(styles.input, error && styles.invalid)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        aria-invalid={error ? true : undefined}
      />
      <p className={clsx('t-caption-m-medium', styles.message, error && styles.error)}>{error ?? NAME_HELP}</p>
    </div>
  );
}
