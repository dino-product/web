import { useEffect, useState } from 'react';

import { nowMinutes } from '@/lib/date';

/** 현재 시각(자정부터 분, Asia/Seoul). 현재 시각선 위치용으로 30초마다 갱신한다. */
export function useNowMinutes(): number {
  const [minutes, setMinutes] = useState(() => nowMinutes());
  useEffect(() => {
    const timer = window.setInterval(() => setMinutes(nowMinutes()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return minutes;
}
