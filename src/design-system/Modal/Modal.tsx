import clsx from 'clsx';
import { type ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { useOverlayRoot } from '../internal/useOverlayRoot';
import styles from './Modal.module.css';

export interface ModalProps {
  open: boolean;
  /** Esc·바깥 클릭으로 닫을 때 호출 */
  onClose?: () => void;
  /** 어두운 배경 클릭으로 닫기. 기본 false(시안에 동작 정의 없음) */
  closeOnOverlayClick?: boolean;
  /** Esc로 닫기. 기본 true(onClose가 있을 때) */
  closeOnEsc?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** 가운데 내용 상자 className */
  className?: string;
  children: ReactNode;
}

/**
 * 모달 바탕. #overlay-root로 포털해 캔버스 전체(사이드바 포함)를 #000 40%로 덮고 내용을 가운데 둔다.
 * 확인형 모달은 Dialog, 큰 모달(새 작업 등록 등)은 ModalPanel을 안에 넣는다.
 */
export function Modal({
  open,
  onClose,
  closeOnOverlayClick = false,
  closeOnEsc = true,
  className,
  children,
  ...aria
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const root = useOverlayRoot();

  useEffect(() => {
    if (!open) return;
    contentRef.current?.focus({ preventScroll: true });
    if (!onClose || !closeOnEsc) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, closeOnEsc, root]);

  if (!open || !root) return null;

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (closeOnOverlayClick && onClose && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={clsx(styles.content, className)}
        {...aria}
      >
        {children}
      </div>
    </div>,
    root,
  );
}
