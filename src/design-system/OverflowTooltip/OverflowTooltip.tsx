import clsx from 'clsx';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useOverlayRoot } from '../internal/useOverlayRoot';
import styles from './OverflowTooltip.module.css';

/** 마우스를 올리고 말풍선이 뜨기까지(ms). 지나가는 커서에는 띄우지 않는다 */
const SHOW_DELAY = 120;
/** 기준 상자와 말풍선 사이(캔버스 px) */
const GAP = 8;
/** 캔버스 가장자리와 띄울 최소 여백(캔버스 px) */
const EDGE = 8;
/** 이 속성이 있는 조상을 말풍선 기준 상자로 쓴다(없으면 잘린 글자 자신). 예: ScheduleCard는 블록 왼쪽 위에 맞춘다 */
const ANCHOR_SELECTOR = '[data-overflow-tooltip-anchor]';

interface Placement {
  top: number;
  left: number;
}

/** 한 줄로 잘린 글자(nowrap + overflow hidden|clip이고 실제로 넘침)인지 */
function isClipped(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  if (style.whiteSpace !== 'nowrap' && style.whiteSpace !== 'pre') return false;
  if (style.overflowX !== 'hidden' && style.overflowX !== 'clip') return false;
  return el.scrollWidth > el.clientWidth;
}

function findClipped(target: EventTarget | null): HTMLElement | null {
  for (let el = target as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
    if (isClipped(el)) return el;
  }
  return null;
}

/**
 * 말줄임·잘림 글자에 마우스를 올리면 기준 상자 바로 위(공간이 없으면 아래), 왼쪽 맞춤으로 전체 글자를 말풍선으로 보여 준다.
 * AppStage에 한 번만 둔다. 화면 DOM은 읽기만 하고, 말풍선은 #overlay-root에 그려 캔버스와 함께 확대·축소된다.
 * 클릭·드래그·스크롤·창 크기 변경 때는 닫는다.
 */
export function OverflowTooltip() {
  const root = useOverlayRoot();
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ box: HTMLElement; text: string } | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

  useEffect(() => {
    let timer = 0;
    let pending: HTMLElement | null = null;
    let shown: HTMLElement | null = null;
    const cancel = () => {
      window.clearTimeout(timer);
      pending = null;
    };
    const close = () => {
      cancel();
      shown = null;
      setAnchor(null);
    };
    const onMouseOver = (event: MouseEvent) => {
      const el = findClipped(event.target);
      if (!el) {
        close();
        return;
      }
      if (el === pending || el === shown) return;
      cancel();
      pending = el;
      timer = window.setTimeout(() => {
        pending = null;
        const text = el.innerText.trim();
        if (!el.isConnected || !text) return;
        shown = el;
        setAnchor({ box: el.closest<HTMLElement>(ANCHOR_SELECTOR) ?? el, text });
      }, SHOW_DELAY);
    };
    const onMouseOut = (event: MouseEvent) => {
      if (!event.relatedTarget) close();
    };
    document.addEventListener('mouseover', onMouseOver, { passive: true });
    document.addEventListener('mouseout', onMouseOut, { passive: true });
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('dragstart', close, true);
    document.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    return () => {
      cancel();
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
      document.removeEventListener('pointerdown', close, true);
      document.removeEventListener('dragstart', close, true);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
    };
  }, []);

  // AppStage zoom을 걷어 낸 캔버스 좌표로 배치한다(Popover와 같은 방식).
  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    if (!anchor || !bubble || !root) {
      setPlacement(null);
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const scale = root.offsetWidth ? rootRect.width / root.offsetWidth : 1;
    const rect = anchor.box.getBoundingClientRect();
    const ax = (rect.left - rootRect.left) / scale;
    const ay = (rect.top - rootRect.top) / scale;
    const ah = rect.height / scale;
    const bw = bubble.offsetWidth;
    const bh = bubble.offsetHeight;
    const left = Math.min(Math.max(ax, EDGE), root.offsetWidth - bw - EDGE);
    const below = ay - GAP - bh < EDGE && ay + ah + GAP + bh <= root.offsetHeight - EDGE;
    setPlacement({ top: below ? ay + ah + GAP : ay - GAP - bh, left });
  }, [anchor, root]);

  if (!anchor || !root) return null;

  return createPortal(
    <div
      ref={bubbleRef}
      role="tooltip"
      className={clsx('t-body-xs-medium', styles.bubble)}
      style={{
        top: placement?.top ?? 0,
        left: placement?.left ?? 0,
        visibility: placement ? 'visible' : 'hidden',
        pointerEvents: 'none',
      }}
    >
      {anchor.text}
    </div>,
    root,
  );
}
