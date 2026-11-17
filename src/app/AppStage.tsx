import { type CSSProperties, type ReactNode, useLayoutEffect, useState } from 'react';

import { OverflowTooltip } from '@/design-system';

const DESIGN_WIDTH = 1920;

/** 운영체제 화면 배율 후보. devicePixelRatio = 화면 배율 × 브라우저 확대 배율 */
const SCREEN_SCALES = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3, 3.5, 4];

/**
 * 브라우저 확대 배율(cmd +/-, 100%면 1).
 * outerWidth는 확대와 무관한 창 너비, innerWidth는 확대가 반영된 CSS px라 둘의 비가 대략의 확대 배율이다.
 * 창 테두리만큼 생기는 오차는 devicePixelRatio를 화면 배율 후보로 나눠 정확한 값으로 바꾼다.
 * 후보와 3% 넘게 어긋나면(devicePixelRatio가 확대를 따르지 않는 브라우저) 대략값을 쓴다.
 */
function browserZoom(): number {
  const { outerWidth, innerWidth, devicePixelRatio } = window;
  if (!outerWidth || !innerWidth) return 1;
  const rough = outerWidth / innerWidth;
  const dpr = devicePixelRatio || 1;
  const screenScale = dpr / rough;
  const nearest = SCREEN_SCALES.reduce((best, scale) =>
    Math.abs(screenScale - scale) < Math.abs(screenScale - best) ? scale : best,
  );
  return Math.abs(screenScale / nearest - 1) < 0.03 ? dpr / nearest : rough;
}

interface StageSize {
  scale: number;
  width: number;
  height: number;
}

/**
 * 캔버스 배율과 캔버스 기준 화면 크기.
 * 배율은 브라우저 100%에서 1920px 캔버스가 창 너비에 꼭 맞는 값이고, 확대·축소하면 그 비율만큼 커지거나 작아진다.
 * 너비·높이는 #root의 보이는 영역이라 확대로 가로 스크롤 막대가 생기면 그 높이를 뺀다.
 */
function measure(): StageSize {
  const scale = (window.innerWidth * browserZoom()) / DESIGN_WIDTH;
  const root = document.getElementById('root');
  const width = root?.clientWidth ?? window.innerWidth;
  const height = root?.clientHeight ?? window.innerHeight;
  return { scale, width: width / scale, height: height / scale };
}

/**
 * Figma 프레임 기준 1920px 캔버스를 브라우저 100%에서 창 너비에 맞춰 zoom하고, 브라우저 확대·축소는 그 위에 적용한다.
 * 축소하면 캔버스가 창 너비만큼 넓어져 여백 없이 채우고, 확대하면 1920px(min-width)에서 멈추고 #root가 가로로 스크롤된다.
 * --app-height는 캔버스 좌표 기준의 화면 높이(1920x1080 창에서는 1080px)다.
 */
export default function AppStage({ children }: { children: ReactNode }) {
  const [size, setSize] = useState<StageSize>(measure);

  useLayoutEffect(() => {
    // 캔버스가 붙은 뒤 가로 스크롤 막대 여부가 정해지므로 한 번 다시 잰다.
    const onResize = () => setSize(measure());
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const style = {
    zoom: size.scale,
    width: size.width,
    height: size.height,
    '--app-height': `${size.height}px`,
  } as CSSProperties;

  return (
    <div className="app-stage" style={style}>
      {children}
      <div id="overlay-root" />
      <OverflowTooltip />
    </div>
  );
}
