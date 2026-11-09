/**
 * 백엔드 HTTP 클라이언트. 모든 API는 `/api/v1` 아래에 있고 응답은 공통 봉투
 * `{ success, code, message, result }`로 온다(server shared ApiResponse).
 * 개발 서버는 vite.config.ts의 프록시로 `/api`를 백엔드(기본 http://localhost:8080)로 넘긴다.
 */
import type { RefreshedTokensDto } from '@/api/types';
import { adoptStoredTokens, getAccessToken, getRefreshToken, replaceTokens } from '@/api/token';

const API_PREFIX = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1`;

interface Envelope<T> {
  success: boolean;
  code: string;
  message: string;
  result?: T;
}

/** 서버가 실패 봉투로 답한 오류. code는 서버 오류 코드(예: 'SCHEDULE-016', 'PROFILE-005') */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** 서버에 닿지 못한 요청(연결 거부·네트워크 끊김) */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('서버에 연결할 수 없습니다.', { cause });
    this.name = 'NetworkError';
  }
}

export type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[];

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** 기본은 저장된 Access Token. 로그인 교환처럼 토큰 없이 부를 때만 null을 넘긴다. */
  token?: string | null;
}

/** API 주소. fetch 대신 브라우저를 이동시키는 경로(카카오 웹 로그인 시작)도 이 주소로 연다. */
export function apiUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value == null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  }
  const search = params.toString();
  return `${API_PREFIX}${path}${search ? `?${search}` : ''}`;
}

async function readEnvelope<T>(response: Response): Promise<Envelope<T> | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as Envelope<T>;
  } catch {
    return null;
  }
}

/** 진행 중인 재발급. 같은 탭에서 동시에 만료를 만난 요청들은 재발급을 한 번만 보내고 결과를 함께 쓴다. */
let refreshing: Promise<string | null> | null = null;

/** 재발급 본체. 성공하면 새 Access Token, refresh token이 무효(AUTH-009 등)면 null, 서버에 닿지 못하면 NetworkError */
async function sendRefresh(failedToken: string): Promise<string | null> {
  // 같은 계정의 다른 탭이 먼저 재발급했으면 그 토큰을 쓴다(쓴 refresh token을 다시 보내면 서버가 기기 세션을 끝낸다).
  const adopted = adoptStoredTokens();
  if (adopted) return adopted;
  if (getAccessToken() !== failedToken) return getAccessToken();
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  let response: Response;
  try {
    response = await fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (error) {
    throw new NetworkError(error);
  }
  const envelope = await readEnvelope<RefreshedTokensDto>(response);
  if (!response.ok || !envelope?.success || !envelope.result) {
    if (!envelope && (response.status === 502 || response.status === 504)) throw new NetworkError(response.status);
    return null;
  }
  replaceTokens(failedToken, envelope.result.accessToken, envelope.result.refreshToken);
  return envelope.result.accessToken;
}

/**
 * 만료·폐기된 Access Token(failedToken)을 refresh token으로 재발급한다. 여러 탭이 함께 만료를 만나도 한 번만 보내도록
 * 브라우저 잠금(Web Locks)으로 탭 사이를 줄 세우고, 잠금을 얻은 뒤 다른 탭이 이미 바꾼 토큰이 있으면 그것을 쓴다.
 */
function refreshAccessToken(failedToken: string): Promise<string | null> {
  refreshing ??= sendRefreshLocked(failedToken).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function sendRefreshLocked(failedToken: string): Promise<string | null> {
  if (!navigator.locks) return sendRefresh(failedToken);
  let renewed: string | null = null;
  await navigator.locks.request('orbit:token-refresh', async () => {
    renewed = await sendRefresh(failedToken);
  });
  return renewed;
}

/** 서버가 Access Token을 받아 주지 않은 응답인지. 만료·폐기·위조 토큰은 자원이 없는 것과 같은 COMMON-404, 토큰이 없으면 401 */
async function isRejectedToken(response: Response): Promise<boolean> {
  if (response.status === 401) return true;
  if (response.status !== 404) return false;
  const envelope = await readEnvelope<unknown>(response.clone());
  return envelope?.code === 'COMMON-404';
}

/**
 * 인증을 붙여 보낸다. token을 주지 않으면 저장된 Access Token을 쓰고, 서버가 그 토큰을 받아 주지 않으면 refresh token으로
 * 한 번 재발급해 다시 보낸다. 재발급도 안 되면 처음 응답을 그대로 돌려준다(스토어가 로그아웃한다).
 */
export async function authorizedFetch(
  url: string,
  init: RequestInit & { headers?: Record<string, string> },
  token?: string | null,
): Promise<Response> {
  const send = async (bearer: string | null) => {
    try {
      return await fetch(url, {
        ...init,
        headers: bearer ? { ...init.headers, Authorization: `Bearer ${bearer}` } : init.headers,
      });
    } catch (error) {
      if (init.signal?.aborted) throw error;
      throw new NetworkError(error);
    }
  };
  const bearer = token === undefined ? getAccessToken() : token;
  const response = await send(bearer);
  if (token !== undefined || !bearer || !(await isRejectedToken(response))) return response;
  const renewed = await refreshAccessToken(bearer);
  return renewed ? send(renewed) : response;
}

/** 요청을 보내고 봉투의 result를 돌려준다. 204 등 본문이 없으면 undefined */
export async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await authorizedFetch(
    apiUrl(path, options.query),
    { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) },
    options.token,
  );

  const envelope = await readEnvelope<T>(response);
  if (!response.ok || (envelope && !envelope.success)) {
    // 프록시가 백엔드에 닿지 못하면 본문 없는 502·504가 온다.
    if (!envelope && (response.status === 502 || response.status === 504)) throw new NetworkError(response.status);
    throw new ApiError(response.status, envelope?.code ?? `HTTP-${response.status}`, envelope?.message ?? response.statusText);
  }
  return envelope?.result as T;
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
};

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

/** 파일 응답(엑셀 등)을 받는다. 실패하면 서버 봉투의 오류 코드로 ApiError */
export async function requestBlob(path: string, query?: Record<string, QueryValue>): Promise<Blob> {
  const response = await authorizedFetch(apiUrl(path, query), { headers: {} });
  if (!response.ok) {
    const envelope = await readEnvelope<unknown>(response);
    throw new ApiError(response.status, envelope?.code ?? `HTTP-${response.status}`, envelope?.message ?? response.statusText);
  }
  return response.blob();
}

/**
 * 발급받은 업로드 주소로 파일 바이트를 PUT한다(서버를 거치지 않고 저장소로 바로). 서명에 들어간 헤더는 그대로 붙이되
 * content-length는 브라우저가 본문 길이로 붙인다. 저장소가 거부하거나 닿지 못하면 ApiError(code 'UPLOAD-<status>').
 * 백엔드 연결 실패(NetworkError)와 구분해 저장소 문제로 앱 전체를 연결 실패 화면으로 바꾸지 않는다.
 */
export async function uploadFile(uploadUrl: string, file: Blob, requiredHeaders: Record<string, string>): Promise<void> {
  const headers = Object.fromEntries(
    Object.entries(requiredHeaders).filter(([name]) => !['content-length', 'host'].includes(name.toLowerCase())),
  );
  let response: Response;
  try {
    response = await fetch(uploadUrl, { method: 'PUT', headers, body: file });
  } catch (error) {
    throw new ApiError(0, 'UPLOAD-0', error instanceof Error ? error.message : String(error));
  }
  if (!response.ok) throw new ApiError(response.status, `UPLOAD-${response.status}`, response.statusText);
}
