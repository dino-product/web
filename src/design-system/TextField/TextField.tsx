import clsx from 'clsx';
import { type ComponentPropsWithRef, type ReactNode, useState } from 'react';

import control from '../internal/control.module.css';
import styles from './TextField.module.css';

/**
 * - default: 높이 50, radius 8, 16/500 — 새 작업 등록 입력(작업명·고객명·연락처·상세 주소)
 * - modal: 높이 56, radius 12, 16/500 — 모달 안 입력
 * - profile: 높이 55, radius 14, 18/500 — 마이페이지 이름·연락처
 * - large: 높이 59, radius 12, 바깥 Gray300 테두리 — 발주사 정보
 * - filled: 높이 52, radius 12, Background/2 채움 — 온보딩
 */
export type ControlAppearance = 'default' | 'modal' | 'profile' | 'large' | 'filled';

export interface TextFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'size'> {
  appearance?: ControlAppearance;
  /** 입력 오른쪽 고정 문구. 예: 작업 금액 '원'(16/500 Gray900) */
  suffix?: ReactNode;
  /** 오류 테두리(Warning/1) */
  invalid?: boolean;
  /** 모서리 반경(px). 기본은 appearance 값(배정 확인 모달처럼 화면마다 다른 경우에만 지정) */
  radius?: number;
  /** 바깥 상자 className(너비 지정 등) */
  className?: string;
  /** input 요소 className */
  inputClassName?: string;
}

/** 텍스트 입력. 플레이스홀더 Gray500, 입력값 Gray900. 읽기 전용·비활성은 Gray50 배경(우편번호·기본 주소). */
export function TextField({
  appearance = 'default',
  suffix,
  invalid = false,
  radius,
  className,
  inputClassName,
  readOnly,
  disabled,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className={clsx(
        control.box,
        control[appearance],
        (readOnly || disabled) && control.readOnly,
        focused && !readOnly && control.focused,
        invalid && control.invalid,
        className,
      )}
      style={radius === undefined ? undefined : { borderRadius: radius }}
    >
      <input
        className={clsx(styles.input, inputClassName)}
        readOnly={readOnly}
        disabled={disabled}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...rest}
      />
      {suffix && <span className={styles.suffix}>{suffix}</span>}
    </div>
  );
}
