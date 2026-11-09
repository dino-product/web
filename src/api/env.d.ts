/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 백엔드 주소 접두어. 비우면 같은 출처의 /api(개발 서버는 vite 프록시)로 보낸다. */
  readonly VITE_API_BASE_URL?: string;
  /** 개발 서버 프록시 대상. 기본 http://localhost:8080 */
  readonly VITE_API_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
