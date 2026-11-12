import { type CSSProperties, type ReactNode, useLayoutEffect, useState } from 'react';

import { OverflowTooltip } from '@/design-system';

/** 보이는 화면 높이(CSS px). 창이 캔버스보다 좁아 가로 스크롤 막대가 생기면 그 높이를 뺀다. */
function measureHeight(): number {
  return document.getElementById('root')?.clientHeight ?? window.innerHeight;
}

/**
 * Figma 프레임과 같은 1920px 너비 캔버스를 배율 없이 그린다. 브라우저 확대·축소가 그대로 적용되고,
 * 창이 캔버스보다 좁으면 #root가 가로로 스크롤된다.
 * --app-height는 보이는 화면 높이(1920x1080 창에서는 1080px)다.
 */
export default function AppStage({ children }: { children: ReactNode }) {
  const [height, setHeight] = useState(measureHeight);

  useLayoutEffect(() => {
    // 캔버스가 붙은 뒤 가로 스크롤 막대 여부가 정해지므로 한 번 다시 잰다.
    const onResize = () => setHeight(measureHeight());
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const style = { height, '--app-height': `${height}px` } as CSSProperties;

  return (
    <div className="app-stage" style={style}>
      {children}
      <div id="overlay-root" />
      <OverflowTooltip />
    </div>
  );
}
