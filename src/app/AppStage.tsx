import { type CSSProperties, type ReactNode, useLayoutEffect, useState } from 'react';

const DESIGN_WIDTH = 1920;

interface StageSize {
  scale: number;
  height: number;
}

function measure(): StageSize {
  const scale = window.innerWidth / DESIGN_WIDTH;
  return { scale, height: window.innerHeight / scale };
}

/**
 * Figma 프레임(1920px 너비)과 같은 배치를 유지하도록 캔버스를 창 너비에 맞춰 확대·축소한다.
 * --app-height는 캔버스 좌표 기준의 화면 높이(1920x1080 창에서는 1080px)다.
 */
export default function AppStage({ children }: { children: ReactNode }) {
  const [size, setSize] = useState<StageSize>(measure);

  useLayoutEffect(() => {
    const onResize = () => setSize(measure());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const style = {
    zoom: size.scale,
    height: size.height,
    '--app-height': `${size.height}px`,
  } as CSSProperties;

  return (
    <div className="app-stage" style={style}>
      {children}
      <div id="overlay-root" />
    </div>
  );
}
