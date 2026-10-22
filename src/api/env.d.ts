/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 백엔드 주소 접두어. 비우면 같은 출처의 /api(개발 서버는 vite 프록시)로 보낸다. */
  readonly VITE_API_BASE_URL?: string;
  /** 개발 서버 프록시 대상. 기본 http://localhost:8080 */
  readonly VITE_API_PROXY_TARGET?: string;
  // ── 임시 개발 로그인(src/api/devAuth.ts). npm run seed:local이 .env.development.local에 쓴다 ──
  readonly VITE_DEV_AUTH_JWT_SECRET?: string;
  readonly VITE_DEV_AUTH_JWT_ISSUER?: string;
  readonly VITE_DEV_OWNER_ACCOUNT_ID?: string;
  readonly VITE_DEV_STAFF_ACCOUNT_ID?: string;
  readonly VITE_DEV_NEW_ACCOUNT_IDS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
