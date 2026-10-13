import clsx from 'clsx';
import type { ReactNode } from 'react';

import styles from './Field.module.css';

/**
 * 라벨 모양 프리셋(Figma 화면별 값).
 * - default: 16/500 Gray800, 간격 8 — 새 작업 등록(1325:5516)
 * - modal: 18/500 Gray900, 간격 8 — 배정 확인·작업 취소·총관리자 지정 모달 필드
 * - title: 20/500 Gray900, 간격 12 — 승인 거절 '거절 사유 (선택)'
 * - profile: 20/500 Gray700, 간격 8 — 마이페이지 이름·연락처(463:5655)
 * - large: 20/500 Gray900 80% 불투명, 간격 8 — 발주사 정보(650:2840)
 * - caption: 14/500 Gray600 + 오른쪽 hint 12/500 Gray500, 간격 12 — 온보딩 프로필 등록(1453:12440)
 */
export type FieldLabelStyle = 'default' | 'modal' | 'title' | 'profile' | 'large' | 'caption';

export interface FieldProps {
  label: ReactNode;
  /** 라벨 뒤 회색 보조 문구. 예: '(선택)', '(필수)'는 라벨에 포함 */
  labelSuffix?: ReactNode;
  /** 라벨 줄 오른쪽 문구. 예: '필수 항목'(caption 스타일) */
  hint?: ReactNode;
  labelStyle?: FieldLabelStyle;
  /** 라벨과 입력 사이 간격(px). 기본은 labelStyle 값 */
  gap?: number;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

const LABEL_CLASS: Record<FieldLabelStyle, string> = {
  default: styles.default,
  modal: styles.modal,
  title: styles.title,
  profile: styles.profile,
  large: styles.large,
  caption: styles.caption,
};

/** 라벨 + 입력 컨트롤 세로 묶음 */
export function Field({
  label,
  labelSuffix,
  hint,
  labelStyle = 'default',
  gap,
  htmlFor,
  className,
  children,
}: FieldProps) {
  return (
    <div
      className={clsx(styles.field, LABEL_CLASS[labelStyle], className)}
      style={gap === undefined ? undefined : { gap }}
    >
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
          {labelSuffix && <span className={styles.suffix}> {labelSuffix}</span>}
        </label>
        {hint && <span className={styles.hint}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
