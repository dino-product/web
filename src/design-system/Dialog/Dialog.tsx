import clsx from 'clsx';
import { type ReactNode, useId } from 'react';

import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import { IconButton } from '../IconButton/IconButton';
import { Modal } from '../Modal/Modal';
import styles from './Dialog.module.css';

/**
 * 제목 앞 아이콘(28px)
 * - success: check-circle-fill Gray900 — 배정 확인(1325:8954)
 * - danger: warning-triangle-fill Warning/1 — 일정 충돌(1325:10373)
 * - cancel: close-circle-fill Primary — 작업 취소 확인(785:7691)
 * - notice: alert-circle-fill Repair/1(#f59e0a) — 변경된 정보입니다(1325:11695)
 */
export type DialogTone = 'success' | 'danger' | 'cancel' | 'notice';

const TONE_ICON: Record<DialogTone, { name: IconName; color: string }> = {
  success: { name: 'check-circle-fill', color: 'var(--color-gray-900)' },
  danger: { name: 'warning-triangle-fill', color: 'var(--color-warning-1)' },
  cancel: { name: 'close-circle-fill', color: 'var(--color-primary)' },
  notice: { name: 'alert-circle-fill', color: 'var(--color-repair-1)' },
};

/**
 * 설명 글자
 * - default: 20/500 Gray800(배정 확인·작업 취소·일정 충돌)
 * - muted: 20/500 Gray700(유형 삭제·총관리자 지정·승인 거절)
 * - subtle: 20/500 Gray600(약관 동의 부제)
 * - regular: 20/400 Gray800(계정 탈퇴 확인)
 */
export type DialogDescriptionTone = 'default' | 'muted' | 'subtle' | 'regular';

export interface DialogProps {
  open: boolean;
  /** Esc·닫기 버튼으로 닫을 때 */
  onClose?: () => void;
  title: ReactNode;
  tone?: DialogTone;
  description?: ReactNode;
  descriptionTone?: DialogDescriptionTone;
  /** 제목 줄과 설명 사이 간격(px). 기본 23 — 유형 삭제·승인 거절 12, 총관리자 지정·약관 동의 16 */
  headerGap?: number;
  /** 머리말(제목·설명)과 본문 사이 간격(px). 기본 24 — 약관 동의 16 */
  bodyGap?: number;
  /** 제목 오른쪽 닫기(X) 버튼 — 약관 동의(1453:7505) */
  showClose?: boolean;
  /** 본문(필드·안내 상자 등) */
  children?: ReactNode;
  /** 하단 버튼들. 오른쪽 정렬, 간격 12 */
  actions?: ReactNode;
  /** 카드 너비(px). 기본 575, 약관 동의 519 */
  width?: number;
  closeOnOverlayClick?: boolean;
  className?: string;
}

/**
 * 확인형 모달(Figma 상태 모달·확인 모달 공통 셸). 흰 카드, radius 18, padding 30, 세로 간격 24.
 * 제목 24/700 Gray900(아이콘이 있으면 28px 아이콘 + 간격 12).
 */
export function Dialog({
  open,
  onClose,
  title,
  tone,
  description,
  descriptionTone = 'default',
  headerGap = 23,
  bodyGap = 24,
  showClose = false,
  children,
  actions,
  width = 575,
  closeOnOverlayClick = false,
  className,
}: DialogProps) {
  const titleId = useId();
  const icon = tone ? TONE_ICON[tone] : null;
  return (
    <Modal open={open} onClose={onClose} closeOnOverlayClick={closeOnOverlayClick} aria-labelledby={titleId}>
      <div className={clsx(styles.card, className)} style={{ width }}>
        <div className={styles.section} style={{ gap: bodyGap }}>
          <div className={styles.header} style={{ gap: headerGap }}>
            <div className={styles.titleRow}>
              <div className={styles.titleGroup}>
                {icon && <Icon name={icon.name} size={28} color={icon.color} />}
                <h2 id={titleId} className={styles.title}>
                  {title}
                </h2>
              </div>
              {showClose && onClose && (
                <IconButton icon="close" size={28} color="var(--color-gray-600)" label="닫기" onClick={onClose} />
              )}
            </div>
            {description && <p className={clsx(styles.description, styles[descriptionTone])}>{description}</p>}
          </div>
          {children}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </Modal>
  );
}
