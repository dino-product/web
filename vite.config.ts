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
      proxy: {
        '/api': { target: env.VITE_API_PROXY_TARGET ?? 'http://localhost:8080', changeOrigin: true },
      },
    },
  };
});
