/**
 * 백엔드 HTTP 클라이언트. 모든 API는 `/api/v1` 아래에 있고 응답은 공통 봉투
 * `{ success, code, message, result }`로 온다(server shared ApiResponse).
 * 개발 서버는 vite.config.ts의 프록시로 `/api`를 백엔드(기본 http://localhost:8080)로 넘긴다.
 */
import { getAccessToken } from '@/api/token';

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
  /** 기본은 저장된 Access Token. 다른 계정 토큰으로 부를 때만 넘긴다(임시 개발 로그인). */
  token?: string | null;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
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

/** 요청을 보내고 봉투의 result를 돌려준다. 204 등 본문이 없으면 undefined */
export async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.token === undefined ? getAccessToken() : options.token;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    throw new NetworkError(error);
  }

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
  const token = getAccessToken();
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch (error) {
    throw new NetworkError(error);
  }
  if (!response.ok) {
    const envelope = await readEnvelope<unknown>(response);
    throw new ApiError(response.status, envelope?.code ?? `HTTP-${response.status}`, envelope?.message ?? response.statusText);
  }
  return response.blob();
}
