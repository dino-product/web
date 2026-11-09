/**
 * 실시간 갱신 연결(GET /organizations/{id}/events, 서버 전송 이벤트). 브라우저 EventSource는 Authorization 헤더를 붙일 수
 * 없어 fetch 스트림으로 읽는다. 이벤트 값에는 바뀐 내용이 없고 화면이 다시 조회한다.
 */
import { apiUrl, ApiError, authorizedFetch } from '@/api/http';

/**
 * 서버 이벤트.
 * - connected: 연결을 등록했다. 이 뒤의 변경부터 받는다.
 * - reconnect: 연결 수명이 끝나 서버가 닫는다. 잠시 뒤 다시 연결한다.
 * - work-changed: 이 발주사의 작업이 저장됐다.
 * - notification-created·notification-read: 이 계정의 알림이 생겼거나 다른 화면에서 읽혔다.
 * - closed: 같은 계정의 연결이 너무 많아 이 연결을 닫는다. 다시 연결하지 않는다.
 */
export type RealtimeEventName =
  | 'connected'
  | 'reconnect'
  | 'work-changed'
  | 'notification-created'
  | 'notification-read'
  | 'closed';

export interface RealtimeEvent {
  name: RealtimeEventName | (string & {});
  data: unknown;
}

/** 서버가 지금 연결을 더 받을 수 없음(REALTIME-002, 503). retryAfter: 다시 연결까지 기다릴 시간(Retry-After, 초) */
export class RealtimeUnavailableError extends ApiError {
  readonly retryAfter: number | null;

  constructor(message: string, retryAfter: number | null) {
    super(503, 'REALTIME-002', message);
    this.retryAfter = retryAfter;
  }
}

function parseEvent(block: string): RealtimeEvent | null {
  let name = 'message';
  const data: string[] = [];
  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) continue; // 주석 줄(:ping)
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
    if (field === 'event') name = value;
    else if (field === 'data') data.push(value);
  }
  if (!data.length && name === 'message') return null;
  const raw = data.join('\n');
  try {
    return { name, data: raw ? JSON.parse(raw) : null };
  } catch {
    return { name, data: raw };
  }
}

/**
 * 연결을 열고 이벤트마다 onEvent를 부른다. 스트림이 끝나면(서버가 닫음) 끝나고, 열지 못하면 ApiError·NetworkError로 실패한다.
 * signal로 끊는다.
 */
export async function streamRealtimeEvents(
  organizationId: number,
  onEvent: (event: RealtimeEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const response = await authorizedFetch(apiUrl(`/organizations/${organizationId}/events`), {
    headers: { Accept: 'text/event-stream', 'X-Orbit-Client': 'desktop-web' },
    signal,
  });
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    let envelope: { code?: string; message?: string } | null = null;
    try {
      envelope = text ? (JSON.parse(text) as { code?: string; message?: string }) : null;
    } catch {
      envelope = null;
    }
    if (response.status === 503) {
      const retryAfter = Number(response.headers.get('Retry-After'));
      throw new RealtimeUnavailableError(envelope?.message ?? response.statusText, retryAfter > 0 ? retryAfter : null);
    }
    throw new ApiError(response.status, envelope?.code ?? `HTTP-${response.status}`, envelope?.message ?? response.statusText);
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += value.replace(/\r\n?/g, '\n');
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const event = parseEvent(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (event) onEvent(event);
        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    reader.releaseLock();
  }
}
