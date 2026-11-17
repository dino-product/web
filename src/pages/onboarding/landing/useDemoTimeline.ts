import { type RefObject, useEffect, useState } from 'react';

/** 움직임 줄이기 설정. 켜져 있으면 시연을 재생하지 않고 대표 장면 하나만 보여 준다 */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface DemoTimeline {
  /** 지금 단계(0부터) */
  step: number;
  /** 몇 번째 반복인지. 처음으로 돌아갈 때마다 1씩 늘어 장면을 새로 그리는 key로 쓴다 */
  loop: number;
  /** 재생 중인지. 화면 밖이거나 움직임 줄이기면 false */
  playing: boolean;
  /** 한 번이라도 화면에 들어왔는지(등장 효과) */
  seen: boolean;
}

/**
 * 시연 장면의 단계 진행. 무대가 화면에 보이는 동안만 단계별 시간(ms)대로 넘기고 끝나면 처음부터 반복한다.
 * 화면 밖으로 나가면 멈추고, 다시 들어오면 첫 단계부터 시작한다.
 * 움직임 줄이기 설정이면 restStep 장면에 멈춰 있다.
 */
export function useDemoTimeline(
  targetRef: RefObject<HTMLElement | null>,
  durations: number[],
  restStep: number,
): DemoTimeline {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  const [visible, setVisible] = useState(false);
  const [seen, setSeen] = useState(false);
  const [position, setPosition] = useState({ step: 0, loop: 0 });

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setSeen(true);
      },
      { threshold: 0.35 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetRef]);

  const playing = visible && !reduced;

  // 화면에 다시 들어오면 첫 단계부터
  useEffect(() => {
    if (playing) setPosition((prev) => ({ step: 0, loop: prev.loop + 1 }));
  }, [playing]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setPosition((prev) =>
        prev.step + 1 < durations.length ? { step: prev.step + 1, loop: prev.loop } : { step: 0, loop: prev.loop + 1 },
      );
    }, durations[position.step]);
    return () => window.clearTimeout(timer);
  }, [playing, position, durations]);

  return reduced ? { step: restStep, loop: 0, playing: false, seen } : { ...position, playing, seen };
}
