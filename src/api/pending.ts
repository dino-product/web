/**
 * 응답을 기다리는 API 요청 수. 전역 대기 스피너(PendingSpinner)가 구독한다.
 * 계속 열려 있는 실시간 연결(realtime.ts)은 세지 않는다.
 */
import { useSyncExternalStore } from 'react';

let count = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** 요청이 끝날 때까지(성공·실패 모두) 대기 수에 넣는다. */
export async function trackPending<T>(work: () => Promise<T>): Promise<T> {
  count += 1;
  emit();
  try {
    return await work();
  } finally {
    count -= 1;
    emit();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 기다리는 요청이 하나라도 있는지 */
export function useApiPending(): boolean {
  return useSyncExternalStore(subscribe, () => count > 0);
}
