import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      // 백엔드 API(/api/**)는 로컬 서버로 넘긴다. 같은 출처로 부르므로 CORS 설정과 무관하다.
      // 약관 본문(/terms/**)은 배포 웹(CloudFront)에만 있어 dev 웹에서 읽는다(TermsViewerDialog).
      proxy: {
        '/api': { target: env.VITE_API_PROXY_TARGET ?? 'http://localhost:8080', changeOrigin: true },
        '/terms': { target: env.VITE_TERMS_PROXY_TARGET ?? 'https://dev.orbi-t.com', changeOrigin: true },
      },
    },
  };
});
