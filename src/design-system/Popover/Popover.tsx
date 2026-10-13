import clsx from 'clsx';
import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { useOverlayRoot } from '../internal/useOverlayRoot';
import styles from './Popover.module.css';

export type PopoverPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

export interface PopoverProps {
  open: boolean;
  /** 기준 요소(트리거). 위치는 이 요소의 캔버스 좌표로 계산한다. */
  anchorRef: RefObject<HTMLElement | null>;
  /** 바깥 클릭·Esc로 닫힐 때 호출 */
  onClose: () => void;
  placement?: PopoverPlacement;
  /** 트리거와의 간격(캔버스 px). 기본 6 (작업 목록 필터 드롭다운 1883:14092 기준) */
  offset?: number;
  /** 패널 너비를 트리거 너비와 맞춘다(직원 유형 드롭다운 118px) */
  matchWidth?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

interface Position {
  top: number;
  left: number;
  width?: number;
}

/**
 * #overlay-root(캔버스 안, 함께 zoom됨)로 포털하는 위치 지정 패널.
 * AppStage의 zoom을 고려해 트리거 위치를 캔버스 좌표로 바꿔 배치하고, 스크롤·리사이즈 때 다시 계산한다.
 */
export function Popover({
  open,
  anchorRef,
  onClose,
  placement = 'bottom-start',
  offset = 6,
  matchWidth = false,
  className,
  style,
  children,
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const root = useOverlayRoot();

  const update = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel || !root) return;
    const rootRect = root.getBoundingClientRect();
    const scale = root.offsetWidth ? rootRect.width / root.offsetWidth : 1;
    const rect = anchor.getBoundingClientRect();
    const ax = (rect.left - rootRect.left) / scale;
    const ay = (rect.top - rootRect.top) / scale;
    const aw = rect.width / scale;
    const ah = rect.height / scale;
    const pw = matchWidth ? aw : panel.offsetWidth;
    const ph = panel.offsetHeight;
    const left = placement.endsWith('end') ? ax + aw - pw : ax;
    const top = placement.startsWith('top') ? ay - offset - ph : ay + ah + offset;
    setPosition({ top, left, width: matchWidth ? aw : undefined });
  }, [anchorRef, matchWidth, offset, placement, root]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    update();
  }, [open, update]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    // 캡처 단계에서 처리하고 기본 동작을 막아, 같은 Esc로 바깥 Modal까지 닫히지 않게 한다.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    // AppStage가 창 크기 변경 때 zoom을 바꾼 다음 프레임에 다시 잰다.
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('scroll', update, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('scroll', update, true);
    };
  }, [open, onClose, anchorRef, update]);

  if (!open || !root) return null;

  return createPortal(
    <div
      ref={panelRef}
      className={clsx(styles.popover, className)}
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        width: position?.width,
        visibility: position ? 'visible' : 'hidden',
        ...style,
      }}
    >
      {children}
    </div>,
    root,
  );
}
