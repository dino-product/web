/**
 * 로그인 세션 저장소. 서버가 발급한 Access Token·refresh token과 계정 ID를 localStorage에 둔다.
 * 새로고침해도 로그인 상태가 유지되고, Access Token이 만료·폐기되면 http.ts가 refresh token으로 한 번 재발급한다.
 * 재발급도 안 되면 그 API의 404·401로 걸러 로그아웃한다.
 */
const TOKEN_KEY = 'orbit:accessToken';
const REFRESH_KEY = 'orbit:refreshToken';
const ACCOUNT_KEY = 'orbit:accountId';
const COMPANY_KEY = 'orbit:companyId';
const KAKAO_LOGIN_KEY = 'orbit:kakaoLogin';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // 저장소를 쓸 수 없으면 이번 탭에서만 로그인 상태가 유지된다.
  }
}

let memoryToken: string | null = read(TOKEN_KEY);
let memoryRefreshToken: string | null = read(REFRESH_KEY);
let memoryAccountId: number | null = Number(read(ACCOUNT_KEY)) || null;

export function getAccessToken(): string | null {
  return memoryToken;
}

export function getRefreshToken(): string | null {
  return memoryRefreshToken;
}

export function getAccountId(): number | null {
  return memoryAccountId;
}

export function saveSession(accessToken: string, refreshToken: string | null, accountId: number): void {
  memoryToken = accessToken;
  memoryRefreshToken = refreshToken;
  memoryAccountId = accountId;
  write(TOKEN_KEY, accessToken);
  write(REFRESH_KEY, refreshToken);
  write(ACCOUNT_KEY, String(accountId));
}

/**
 * 재발급한 토큰으로 바꾼다. 저장소 값은 아직 이 탭의 이전 토큰일 때만 바꾼다(다른 탭이 그사이 다른 계정으로 로그인했으면
 * 그 세션을 덮지 않는다).
 */
export function replaceTokens(previousAccessToken: string, accessToken: string, refreshToken: string): void {
  if (read(TOKEN_KEY) === previousAccessToken) {
    write(TOKEN_KEY, accessToken);
    write(REFRESH_KEY, refreshToken);
  }
  memoryToken = accessToken;
  memoryRefreshToken = refreshToken;
}

/**
 * 같은 계정의 다른 탭이 이미 재발급해 저장소 토큰이 바뀌었으면 그 토큰을 이 탭도 쓰고 돌려준다. 아니면 null.
 * 이미 쓴 refresh token을 다시 보내면 서버가 탈취로 보고 기기 세션을 끝내므로 재발급 전에 먼저 확인한다.
 */
export function adoptStoredTokens(): string | null {
  const stored = read(TOKEN_KEY);
  const storedRefresh = read(REFRESH_KEY);
  if (!stored || !storedRefresh || stored === memoryToken) return null;
  if ((Number(read(ACCOUNT_KEY)) || null) !== memoryAccountId) return null;
  memoryToken = stored;
  memoryRefreshToken = storedRefresh;
  return stored;
}

/**
 * 이 탭의 세션을 지운다. 저장소 값은 아직 이 탭의 토큰일 때만 지운다. 다른 탭이 그사이 새로 로그인했으면
 * (이 탭의 만료·폐기된 토큰이 404·401을 받아도) 그 탭의 새 세션을 남겨 새로고침 뒤에도 유지되게 한다.
 */
export function clearSession(): void {
  if (read(TOKEN_KEY) === memoryToken) {
    write(TOKEN_KEY, null);
    write(REFRESH_KEY, null);
    write(ACCOUNT_KEY, null);
  }
  memoryToken = null;
  memoryRefreshToken = null;
  memoryAccountId = null;
}

/** 마지막으로 고른 발주사(사이드바 발주사 전환). 새로고침 뒤에도 같은 발주사로 연다. */
export function getSavedCompanyId(): string | null {
  return read(COMPANY_KEY);
}

export function saveCompanyId(companyId: string | null): void {
  write(COMPANY_KEY, companyId);
}

/** 카카오 웹 로그인을 시작할 때 만든 PKCE code_verifier와 로그인 뒤 갈 경로 */
export interface PendingKakaoLogin {
  codeVerifier: string;
  returnTo: string;
}

/** 카카오를 다녀오는 동안 이 탭(sessionStorage)에만 둔다. 저장하지 못하면 false */
export function savePendingKakaoLogin(pending: PendingKakaoLogin): boolean {
  try {
    window.sessionStorage.setItem(KAKAO_LOGIN_KEY, JSON.stringify(pending));
    return true;
  } catch {
    return false;
  }
}

/** 시작 정보를 꺼내며 지운다. 교환 코드와 code_verifier는 한 번만 쓴다. */
export function takePendingKakaoLogin(): PendingKakaoLogin | null {
  try {
    const raw = window.sessionStorage.getItem(KAKAO_LOGIN_KEY);
    window.sessionStorage.removeItem(KAKAO_LOGIN_KEY);
    const pending = raw ? (JSON.parse(raw) as Partial<PendingKakaoLogin>) : null;
    return typeof pending?.codeVerifier === 'string' && typeof pending.returnTo === 'string'
      ? { codeVerifier: pending.codeVerifier, returnTo: pending.returnTo }
      : null;
  } catch {
    return null;
  }
}
