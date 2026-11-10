import { useCallback, useRef, useState } from 'react';

/**
 * 비동기 제출을 한 번에 하나만 실행한다. 진행 중에 다시 부르면(빠른 연속 클릭·Enter 반복) 무시한다.
 * 진행 여부는 ref로 막아 다시 그리기 전에 들어온 두 번째 클릭도 거른다. pending은 버튼 비활성화용이다.
 */
export function useSingleFlight(): [pending: boolean, run: (task: () => Promise<unknown>) => Promise<void>] {
  const running = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(async (task: () => Promise<unknown>) => {
    if (running.current) return;
    running.current = true;
    setPending(true);
    try {
      await task();
    } finally {
      running.current = false;
      setPending(false);
    }
  }, []);

  return [pending, run];
}
