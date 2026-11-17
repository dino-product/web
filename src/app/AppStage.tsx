import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useMemo, useState } from 'react';

import PendingSpinner from '@/app/PendingSpinner';
import { OverflowTooltip } from '@/design-system';
import { CanvasExtraContext } from '@/lib/canvas';

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const ZOOM_KEY = 'orbit:zoom';

/** 확대·축소 단계(크롬과 같은 25%~500%) */
const ZOOM_STEPS = [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
const MIN_ZOOM = ZOOM_STEPS[0];
const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

type ZoomAction = 'in' | 'out' | 'reset';

function readZoom(): number {
  try {
    const value = Number(window.localStorage.getItem(ZOOM_KEY));
    return value >= MIN_ZOOM && value <= MAX_ZOOM ? value : 1;
  } catch {
    return 1;
  }
}

function writeZoom(zoom: number): void {
  try {
    if (zoom === 1) window.localStorage.removeItem(ZOOM_KEY);
    else window.localStorage.setItem(ZOOM_KEY, String(zoom));
  } catch {
    // 저장소를 쓸 수 없으면 이번 탭에서만 배율이 유지된다.
  }
}

function nextZoom(zoom: number, action: ZoomAction): number {
  if (action === 'reset') return 1;
  if (action === 'in') return ZOOM_STEPS.find((step) => step > zoom + 0.001) ?? MAX_ZOOM;
  return [...ZOOM_STEPS].reverse().find((step) => step < zoom - 0.001) ?? MIN_ZOOM;
}

/** cmd(맥)·ctrl(그 외) + '+', '-', '0'. 한글 입력 중처럼 key가 글자가 아니면 자판 위치(code)로 가린다. */
function zoomAction(event: KeyboardEvent): ZoomAction | null {
  const modifier = IS_MAC ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  if (!modifier || event.altKey) return null;
  if (event.key === '+' || event.key === '=') return 'in';
  if (event.key === '-' || event.key === '_') return 'out';
  if (event.key === '0') return 'reset';
  if (event.key.length === 1) return null;
  if (event.code === 'Equal' || event.code === 'NumpadAdd') return 'in';
  if (event.code === 'Minus' || event.code === 'NumpadSubtract') return 'out';
  if (event.code === 'Digit0' || event.code === 'Numpad0') return 'reset';
  return null;
}

interface StageSize {
  scale: number;
  height: number;
}

/**
 * 캔버스 배율과 캔버스 기준 화면 높이.
 * 배율은 1920px 캔버스가 창 너비에 꼭 맞는 값에 확대·축소 배율을 곱한 값이다.
 * 높이는 #root의 보이는 영역이라 확대로 가로 스크롤 막대가 생기면 그 높이를 뺀다.
 */
function measure(zoom: number): StageSize {
  const root = document.getElementById('root');
  const scale = ((root?.clientWidth || window.innerWidth) / DESIGN_WIDTH) * zoom;
  return { scale, height: (root?.clientHeight || window.innerHeight) / scale };
}

/**
 * Figma 프레임 기준 1920px 캔버스를 창 너비에 맞춰 zoom하고, cmd +/-/0 확대·축소를 그 위에 직접 적용한다.
 * 브라우저 확대 배율은 스크립트로 정확히 알 수 없어(창 옆 패널·개발자 도구가 있으면 어긋남) 단축키를 받아 처리하고,
 * 브라우저 자체 확대(메뉴 등)는 창 너비 맞춤에 상쇄되어 화면이 달라지지 않는다. 배율은 localStorage에 남긴다.
 * 축소하면 캔버스가 창 너비만큼 넓어지고(1920px ÷ 배율), 확대하면 1920px(min-width)에서 멈추고 #root가 가로로 스크롤된다.
 * --app-height는 캔버스 좌표 기준의 화면 높이(1920x1080 창에서는 1080px)다.
 * 캔버스가 Figma 프레임(1920x1080)보다 넓어진·높아진 만큼은 --canvas-extra-width·--canvas-extra-height와
 * useCanvasExtra로 내려 주고, Figma 수치로 고정한 화면이 그만큼 늘어나 빈 곳 없이 채운다. 프레임 크기에서는 0이라 시안과 같다.
 */
export default function AppStage({ children }: { children: ReactNode }) {
  const [zoom, setZoom] = useState(readZoom);
  const [size, setSize] = useState<StageSize>(() => measure(zoom));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = zoomAction(event);
      if (!action) return;
      event.preventDefault();
      setZoom((current) => nextZoom(current, action));
    };
    // 다른 탭에서 바꾼 배율을 따른다(브라우저 확대가 같은 사이트 탭에 함께 적용되는 것과 같다).
    const onStorage = (event: StorageEvent) => {
      if (event.key === ZOOM_KEY || event.key === null) setZoom(readZoom());
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useLayoutEffect(() => {
    // 창 크기뿐 아니라 가로 스크롤 막대가 생기거나 없어질 때도 #root의 보이는 영역이 바뀌므로 #root를 지켜본다.
    const update = () => {
      const next = measure(zoom);
      setSize((current) => (current.scale === next.scale && current.height === next.height ? current : next));
    };
    update();
    const root = document.getElementById('root');
    if (!root || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(root);
    return () => observer.disconnect();
  }, [zoom]);

  useEffect(() => {
    writeZoom(zoom);
    // 열려 있는 Popover·말풍선이 바뀐 배치에 맞춰 다시 계산하도록 창 크기 변경과 같은 신호를 보낸다.
    window.dispatchEvent(new Event('resize'));
  }, [zoom]);

  const extraWidth = zoom < 1 ? DESIGN_WIDTH / zoom - DESIGN_WIDTH : 0;
  const extraHeight = Math.max(0, size.height - DESIGN_HEIGHT);
  const extra = useMemo(() => ({ width: extraWidth, height: extraHeight }), [extraWidth, extraHeight]);

  const style = {
    zoom: size.scale,
    height: size.height,
    '--app-height': `${size.height}px`,
    '--canvas-extra-width': `${extraWidth}px`,
    '--canvas-extra-height': `${extraHeight}px`,
  } as CSSProperties;

  return (
    <CanvasExtraContext.Provider value={extra}>
      <div className="app-stage" style={style}>
        {children}
        <div id="overlay-root" />
        <OverflowTooltip />
        <PendingSpinner />
      </div>
    </CanvasExtraContext.Provider>
  );
}
