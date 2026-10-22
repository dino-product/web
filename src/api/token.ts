/**
 * 로그인 세션 저장소. 서버가 발급한(또는 임시 개발 로그인이 만든) Access Token과 계정 ID를 localStorage에 둔다.
 * 새로고침해도 로그인 상태가 유지되고, 만료·폐기된 토큰은 첫 API 호출의 404·401로 걸러 로그아웃한다.
 */
const TOKEN_KEY = 'orbit:accessToken';
const ACCOUNT_KEY = 'orbit:accountId';
const COMPANY_KEY = 'orbit:companyId';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // 저장소를 쓸 수 없으면 이번 탭에서만 로그인 상태가 유지된다.
  }
}

let memoryToken: string | null = read(TOKEN_KEY);
let memoryAccountId: number | null = Number(read(ACCOUNT_KEY)) || null;

export function getAccessToken(): string | null {
  return memoryToken;
}

export function getAccountId(): number | null {
  return memoryAccountId;
}

export function saveSession(accessToken: string, accountId: number): void {
  memoryToken = accessToken;
  memoryAccountId = accountId;
  write(TOKEN_KEY, accessToken);
  write(ACCOUNT_KEY, String(accountId));
}

export function clearSession(): void {
  memoryToken = null;
  memoryAccountId = null;
  write(TOKEN_KEY, null);
  write(ACCOUNT_KEY, null);
}

/** 마지막으로 고른 발주사(사이드바 발주사 전환). 새로고침 뒤에도 같은 발주사로 연다. */
export function getSavedCompanyId(): string | null {
  return read(COMPANY_KEY);
}

export function saveCompanyId(companyId: string | null): void {
  write(COMPANY_KEY, companyId);
}
