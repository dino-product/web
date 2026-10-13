import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';

import styles from './ScrollThumb.module.css';

export interface ScrollThumbState {
  visible: boolean;
  /** 위치 기준 요소(목록의 offsetParent) 안에서의 top(px) */
  top: number;
  height: number;
}

const HIDDEN: ScrollThumbState = { visible: false, top: 0, height: 0 };

/**
 * 목록 스크롤 막대(Figma 승인대기 Rectangle 161124098: 8px, #000 20%, radius 25).
 * 브라우저 기본 스크롤 막대는 목록 CSS에서 숨기고, 목록의 offsetParent 안에 막대를 그린다.
 * - setViewport: 스크롤 목록 요소 ref. 첫 자식(내용) 크기가 바뀌면 다시 잰다.
 * - update: 목록 위치가 바뀌었을 때(예: 위에 줄이 생김) 부른다.
 */
export function useScrollThumb() {
  const [state, setState] = useState<ScrollThumbState>(HIDDEN);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const update = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight, offsetTop } = el;
    const max = scrollHeight - clientHeight;
    if (max <= 1) {
      setState((prev) => (prev.visible ? HIDDEN : prev));
      return;
    }
    const height = Math.max(40, Math.round((clientHeight * clientHeight) / scrollHeight));
    const top = offsetTop + Math.round((scrollTop / max) * (clientHeight - height));
    setState((prev) =>
      prev.visible && prev.top === top && prev.height === height ? prev : { visible: true, top, height },
    );
  }, []);

  const setViewport = useCallback(
    (el: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      viewportRef.current = el;
      if (!el) {
        setState(HIDDEN);
        return;
      }
      const observer = new ResizeObserver(() => update());
      observer.observe(el);
      if (el.firstElementChild) observer.observe(el.firstElementChild);
      observerRef.current = observer;
    },
    [update],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return { setViewport, state, onScroll: update, update };
}

export function ScrollThumb({ state, className }: { state: ScrollThumbState; className?: string }) {
  if (!state.visible) return null;
  return <div aria-hidden className={clsx(styles.thumb, className)} style={{ top: state.top, height: state.height }} />;
}
