/**
 * AppStage 캔버스 배율(화면 px ÷ 캔버스 px). 캔버스 안 요소를 넘기면 AppStage의 zoom 값이 나온다.
 * clientX·getBoundingClientRect 같은 화면 좌표를 캔버스 좌표로 바꿀 때 이 값으로 나눈다.
 */
export function canvasScale(element: HTMLElement): number {
  return element.offsetWidth ? element.getBoundingClientRect().width / element.offsetWidth : 1;
}
