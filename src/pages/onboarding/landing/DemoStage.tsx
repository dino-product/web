import clsx from 'clsx';
import { type CSSProperties, type ReactNode, useMemo, useRef } from 'react';

import styles from './DemoStage.module.css';
import { useDemoTimeline } from './useDemoTimeline';

/** 커서 상태. 좌표는 장면(캔버스) 기준 px */
export interface DemoCursor {
  x: number;
  y: number;
  /** 이 단계가 시작될 때 누르는 표시(물결)를 그린다 */
  click?: boolean;
  /** 누른 채로 있는 동안(끌기) */
  pressed?: boolean;
  /** 이 위치까지 움직이는 시간(ms). 기본 700 */
  move?: number;
  hidden?: boolean;
}

/** 카메라. (x, y)를 창 가운데에 두고 zoom배로 확대한다. 창 밖이 비지 않게 가장자리에서 멈춘다 */
export interface DemoCamera {
  x: number;
  y: number;
  zoom: number;
}

export interface DemoStep {
  /** 이 단계에 머무는 시간(ms) */
  duration: number;
  /** 아래 진행 표시에서 켜지는 구간(0부터) */
  phase: number;
  /** 생략하면 앞 단계 값을 그대로 쓴다 */
  cursor?: DemoCursor;
  camera?: DemoCamera;
}

export interface DemoStageProps {
  /** 랜딩 안 위치(절대 배치) */
  className?: string;
  /** 창 크기(랜딩 좌표 px) */
  width: number;
  height: number;
  /** 장면을 그리는 원래 너비(앱 화면 치수 그대로). 창 너비에 맞게 줄여 보여 준다 */
  canvasWidth: number;
  /** 화면 읽기 프로그램에 읽어 줄 장면 설명 */
  label: string;
  /** 진행 표시 구간 이름 */
  phases: string[];
  steps: DemoStep[];
  /** 움직임 줄이기 설정일 때 보여 줄 단계 */
  restStep: number;
  /** 커서에 붙어 함께 움직이는 것(끌고 가는 카드) */
  cursorSlot?: (step: number) => ReactNode;
  children: (step: number) => ReactNode;
}

/** 앞 단계로 거슬러 올라가며 마지막으로 정한 값을 찾는다 */
function resolve<K extends 'cursor' | 'camera'>(steps: DemoStep[], index: number, key: K): DemoStep[K] {
  for (let i = index; i >= 0; i--) {
    const value = steps[i][key];
    if (value) return value;
  }
  return undefined;
}

/**
 * 서비스 시연 무대. 앱 화면을 원래 치수로 그린 장면을 창 크기에 맞게 줄이고, 단계마다 카메라(확대·이동)와 커서를 움직인다.
 * 장면은 보여 주기만 한다 — 누르거나 초점을 줄 수 없게 inert로 막고, 설명은 label로 읽힌다.
 * 화면에 보일 때만 재생하고 끝나면 처음부터 반복한다(useDemoTimeline).
 */
export default function DemoStage({
  className,
  width,
  height,
  canvasWidth,
  label,
  phases,
  steps,
  restStep,
  cursorSlot,
  children,
}: DemoStageProps) {
  const rootRef = useRef<HTMLElement>(null);
  const durations = useMemo(() => steps.map((step) => step.duration), [steps]);
  const { step, loop, playing, seen } = useDemoTimeline(rootRef, durations, restStep);

  const scale = width / canvasWidth;
  const canvasHeight = height / scale;
  const current = steps[step];
  const cursor = resolve(steps, step, 'cursor');
  const camera = resolve(steps, step, 'camera') ?? { x: canvasWidth / 2, y: canvasHeight / 2, zoom: 1 };

  // 가운데에 둘 점이 가장자리에 가까우면 창 밖이 보이지 않을 만큼만 옮긴다.
  const cameraX = Math.min(0, Math.max(canvasWidth * (1 - camera.zoom), canvasWidth / 2 - camera.x * camera.zoom));
  const cameraY = Math.min(0, Math.max(canvasHeight * (1 - camera.zoom), canvasHeight / 2 - camera.y * camera.zoom));

  // 구간 진행 막대: 구간에 속한 단계 시간의 합 동안 차오른다.
  const phaseDuration = steps.reduce((sum, s) => (s.phase === current.phase ? sum + s.duration : sum), 0);

  return (
    <figure
      ref={rootRef}
      className={clsx(styles.stage, seen && styles.stageSeen, className)}
      style={{ width }}
      aria-label={label}
    >
      <div className={styles.window} style={{ width, height }} inert>
        <div
          key={loop}
          className={styles.scaler}
          style={{ width: canvasWidth, height: canvasHeight, transform: `scale(${scale})` }}
        >
          <div
            className={styles.camera}
            style={{ transform: `translate(${cameraX}px, ${cameraY}px) scale(${camera.zoom})` }}
          >
            {children(step)}
            {playing && cursor && (
              <div
                className={clsx(styles.cursor, cursor.hidden && styles.cursorHidden)}
                style={
                  {
                    transform: `translate(${cursor.x}px, ${cursor.y}px)`,
                    transitionDuration: `${cursor.move ?? 700}ms`,
                    '--cursor-scale': 1 / (scale * camera.zoom),
                  } as CSSProperties
                }
              >
                {cursorSlot?.(step)}
                <span className={styles.pointerBox}>
                  {cursor.click && <span key={step} className={styles.ripple} />}
                  <svg
                    className={clsx(styles.pointer, (cursor.pressed || cursor.click) && styles.pointerPressed)}
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    aria-hidden
                  >
                    <path
                      d="M6 3.5v19.2l5.2-4.6 3.3 7.4 3.4-1.5-3.3-7.3 6.9-.5L6 3.5Z"
                      fill="#1c1b2a"
                      stroke="#fff"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <figcaption className={styles.caption} aria-hidden>
        {phases.map((phase, index) => (
          <span
            key={phase}
            className={clsx(
              styles.phase,
              index === current.phase && styles.phaseActive,
              index < current.phase && styles.phaseDone,
            )}
          >
            <span className={styles.track}>
              {index === current.phase && playing && (
                <span
                  key={`${loop}-${index}`}
                  className={styles.fill}
                  style={{ animationDuration: `${phaseDuration}ms` }}
                />
              )}
            </span>
            <span className={styles.phaseLabel}>
              <span className={styles.phaseNumber}>{String(index + 1).padStart(2, '0')}</span>
              {phase}
            </span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

export interface DemoCalloutProps {
  /** 장면 좌표(px). 말풍선 왼쪽 위 */
  x: number;
  y: number;
  /** 점 색(상태 색 토큰) */
  color: string;
  children: ReactNode;
}

/** 장면 위 설명 꼬리표(앱 화면에는 없는 것). 기사 앱에서 일어난 일을 알려 준다 */
export function DemoCallout({ x, y, color, children }: DemoCalloutProps) {
  return (
    <span className={styles.callout} style={{ left: x, top: y }}>
      <span className={styles.calloutDot} style={{ background: color }} />
      {children}
    </span>
  );
}
