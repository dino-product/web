/**
 * ⚠️ 임시 구현(TEMP-DEV-AUTH) — 카카오 OAuth를 아직 설정하지 않아 로컬에서 실제 로그인을 할 수 없어 대신 쓴다.
 *
 * 실제 흐름(카카오 설정 후 교체):
 *   POST /api/v1/auth/kakao/nonces → 카카오 SDK 로그인(nonce 전달) → id_token
 *   → POST /api/v1/auth/kakao/login { idToken } → { accountId, accessToken, registered }
 *
 * 임시 흐름: `npm run seed:local`(scripts/dev-seed.mjs)이 로컬 DB에 계정을 만들고 `.env.development.local`에
 * 서버와 같은 JWT 서명 키·계정 ID를 적는다. 이 모듈은 그 키로 서버와 같은 형식의 HS256 Access Token을 브라우저에서 서명한다
 * (server auth JwtAccessTokenAdapter: iss·sub(accountId)·jti·iat·exp·token_use=access).
 * 서버 코드는 바꾸지 않으며, 서명 키가 번들에 들어가므로 개발 서버(import.meta.env.DEV)에서만 동작한다.
 *
 * 어떤 계정으로 로그인할지는 기존 테스트 시나리오 쿼리를 그대로 따른다(화면 변화 없음).
 *   기본: 총관리자(VITE_DEV_OWNER_ACCOUNT_ID) · ?role=staff: 직원(VITE_DEV_STAFF_ACCOUNT_ID)
 *   ?user=new: 가입 전 계정(VITE_DEV_NEW_ACCOUNT_IDS 중 아직 가입을 마치지 않은 첫 계정) · ?reset=1: 기본으로
 * 쿼리는 sessionStorage('orbit:devLogin')에 남아 같은 탭에서 유지된다.
 *
 * 카카오 로그인을 붙이면 이 파일과 store.ts의 loginWithKakao 안의 devLogin 호출, .env.development.local의 VITE_DEV_* 값을 지운다.
 */
import { http } from '@/api/http';
import type { ProfileDto } from '@/api/types';

const STORAGE_KEY = 'orbit:devLogin';
const TOKEN_TTL_SECONDS = 12 * 60 * 60;

type DevPersona = 'owner' | 'staff' | 'new';

function readPersona(): DevPersona {
  const params = new URLSearchParams(window.location.search);
  let stored: DevPersona | null = null;
  try {
    stored = window.sessionStorage.getItem(STORAGE_KEY) as DevPersona | null;
    if (params.get('reset') === '1') stored = null;
    const fromQuery: DevPersona | null =
      params.get('user') === 'new' ? 'new' : params.get('role') === 'staff' ? 'staff' : params.get('role') === 'owner' ? 'owner' : null;
    const persona = fromQuery ?? stored ?? 'owner';
    window.sessionStorage.setItem(STORAGE_KEY, persona);
    return persona;
  } catch {
    return stored ?? 'owner';
  }
}

/** 앱 시작 때 한 번 읽는다(로그인 화면으로 이동하며 쿼리가 사라져도 유지). */
const persona: DevPersona = typeof window === 'undefined' ? 'owner' : readPersona();

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const encoder = new TextEncoder();

async function signAccessToken(accountId: number): Promise<string> {
  const secret = import.meta.env.VITE_DEV_AUTH_JWT_SECRET;
  if (!secret) throw new Error('VITE_DEV_AUTH_JWT_SECRET이 없습니다. dino-web-tmp에서 npm run seed:local을 먼저 실행하세요.');
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(encoder.encode(JSON.stringify({ alg: 'HS256' })));
  const payload = base64Url(
    encoder.encode(
      JSON.stringify({
        iss: import.meta.env.VITE_DEV_AUTH_JWT_ISSUER ?? 'orbit',
        sub: String(accountId),
        jti: crypto.randomUUID(),
        iat: now,
        exp: now + TOKEN_TTL_SECONDS,
        token_use: 'access',
      }),
    ),
  );
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${payload}`)));
  return `${header}.${payload}.${base64Url(signature)}`;
}

function parseIds(value: string | undefined): number[] {
  return (value ?? '')
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isInteger(v) && v > 0);
}

/** 임시 개발 로그인. 고른 계정의 Access Token을 서명해 돌려준다. */
export async function devLogin(): Promise<{ accountId: number; accessToken: string }> {
  if (!import.meta.env.DEV) throw new Error('임시 개발 로그인은 개발 서버에서만 쓸 수 있습니다.');
  if (persona === 'new') {
    for (const accountId of parseIds(import.meta.env.VITE_DEV_NEW_ACCOUNT_IDS)) {
      const accessToken = await signAccessToken(accountId);
      const profile = await http.get<ProfileDto>(`/profiles/${accountId}`, { token: accessToken });
      if (profile.nextStep !== 'COMPLETED') return { accountId, accessToken };
    }
    throw new Error('가입 전 개발 계정이 남아 있지 않습니다. npm run seed:local로 다시 만드세요.');
  }
  const accountId = parseIds(
    persona === 'staff' ? import.meta.env.VITE_DEV_STAFF_ACCOUNT_ID : import.meta.env.VITE_DEV_OWNER_ACCOUNT_ID,
  )[0];
  if (!accountId) throw new Error('개발 계정 ID가 없습니다. npm run seed:local을 먼저 실행하세요.');
  return { accountId, accessToken: await signAccessToken(accountId) };
}
