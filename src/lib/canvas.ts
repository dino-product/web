import { createContext, useContext } from 'react';

/**
 * AppStage 캔버스 배율(화면 px ÷ 캔버스 px). 캔버스 안 요소를 넘기면 AppStage의 zoom 값이 나온다.
 * clientX·getBoundingClientRect 같은 화면 좌표를 캔버스 좌표로 바꿀 때 이 값으로 나눈다.
 */
export function canvasScale(element: HTMLElement): number {
  return element.offsetWidth ? element.getBoundingClientRect().width / element.offsetWidth : 1;
}

/** 캔버스가 Figma 프레임(1920x1080)보다 넓어진·높아진 만큼(캔버스 px). 프레임 크기 이하면 0 */
export interface CanvasExtra {
  width: number;
  height: number;
}

export const CanvasExtraContext = createContext<CanvasExtra>({ width: 0, height: 0 });

/**
 * Figma 수치로 고정한 크기를 넓어진 캔버스에 맞춰 늘릴 때 더하는 값.
 * CSS에서는 같은 값인 var(--canvas-extra-width)·var(--canvas-extra-height)를 쓴다.
 */
export function useCanvasExtra(): CanvasExtra {
  return useContext(CanvasExtraContext);
}
