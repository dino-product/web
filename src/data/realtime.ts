/**
 * 실시간 갱신(서버 전송 이벤트). 로그인한 동안 현재 발주사의 이벤트 연결을 열어 두고, 신호를 받으면 화면을 다시 읽게 한다.
 * 이벤트에는 바뀐 내용이 없으므로 작업이 저장되면 보고 있는 화면(타임테이블·작업 목록·진행 보드·상세)을, 알림이 생기거나
 * 다른 화면에서 읽히면 알림 목록을 다시 읽는다. 끊긴 뒤 다시 연결하면 놓친 변경이 있을 수 있어 화면을 다시 읽는다.
 */
import { useEffect } from 'react';

import { ApiError } from '@/api/http';
import { RealtimeUnavailableError, streamRealtimeEvents } from '@/api/realtime';
import { fromId, ID_PREFIX } from '@/data/mappers';
import { useAppStore } from '@/data/store';

/** 작업 여러 건이 잇달아 저장돼도 한 번만 다시 읽도록 모으는 시간 */
const WORK_CHANGED_DEBOUNCE_MS = 300;
/** 서버가 연결을 닫은 뒤(연결 수명 만료·서버 종료) 다시 연결까지 기다리는 시간. 여러 탭이 한꺼번에 붙지 않게 흩뜨린다 */
const RECONNECT_DELAY_MS = 1000;
const RECONNECT_JITTER_MS = 2000;
/** 연결하지 못했을 때 기다리는 시간의 상한 */
const MAX_BACKOFF_MS = 30_000;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer);
      resolve();
    });
  });
}

async function runRealtime(organizationId: number, signal: AbortSignal): Promise<void> {
  const store = useAppStore.getState;
  let connectedOnce = false;
  let failures = 0;
  let workChangedTimer: number | undefined;
  signal.addEventListener('abort', () => window.clearTimeout(workChangedTimer));

  while (!signal.aborted) {
    let opened = false;
    let closedByServer = false;
    try {
      await streamRealtimeEvents(
        organizationId,
        (event) => {
          switch (event.name) {
            case 'connected':
              opened = true;
              failures = 0;
              if (connectedOnce) {
                store().refreshScreens();
                void store().loadNotifications();
              }
              connectedOnce = true;
              break;
            case 'work-changed':
              window.clearTimeout(workChangedTimer);
              workChangedTimer = window.setTimeout(() => store().refreshScreens(), WORK_CHANGED_DEBOUNCE_MS);
              break;
            case 'notification-created':
            case 'notification-read':
              void store().loadNotifications();
              break;
            case 'closed':
              // 같은 계정이 연결을 너무 많이 열어 서버가 이 연결을 닫았다. 다시 연결하지 않는다.
              closedByServer = true;
              break;
            // reconnect: 서버가 곧 닫는다. 스트림이 끝나면 아래에서 다시 연결한다.
          }
        },
        signal,
      );
      if (closedByServer || signal.aborted) return;
      await sleep(RECONNECT_DELAY_MS + Math.random() * RECONNECT_JITTER_MS, signal);
    } catch (error) {
      if (signal.aborted) return;
      if (error instanceof RealtimeUnavailableError) {
        await sleep((error.retryAfter ?? 5) * 1000, signal);
        continue;
      }
      // 실시간 대상이 아님(REALTIME-001)·토큰 무효 등 서버가 거절했으면 다시 연결하지 않는다.
      // 토큰 무효는 다른 API 호출이 로그아웃으로 처리한다.
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        console.warn(`[realtime] 연결 거절: ${error.code} ${error.message}`);
        return;
      }
      // 열지 못했으면 서버에 닿지 않는 것이므로 연결 실패 화면으로 알린다. 열려 있던 연결이 끊긴 경우는 바로 다시 연결한다.
      if (!opened) {
        failures += 1;
        store().setNetwork('offline');
      }
      await sleep(Math.min(MAX_BACKOFF_MS, RECONNECT_DELAY_MS * 2 ** failures), signal);
    }
  }
}

/** 앱 레이아웃에서 한 번 쓴다. 로그아웃하거나 발주사를 바꾸면 연결을 닫고 새로 연다. */
export function useRealtimeSync(): void {
  const loggedIn = useAppStore((s) => s.session.loggedIn);
  const companyId = useAppStore((s) => s.session.currentCompanyId);
  useEffect(() => {
    const organizationId = fromId(companyId, ID_PREFIX.plain);
    if (!loggedIn || organizationId == null) return;
    const controller = new AbortController();
    void runRealtime(organizationId, controller.signal);
    return () => controller.abort();
  }, [loggedIn, companyId]);
}
