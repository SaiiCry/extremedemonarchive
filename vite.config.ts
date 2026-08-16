import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import clientErrorLogger from 'vite-plugin-client-error-logger';
import { createHtmlPlugin } from 'vite-plugin-html';
import { reactFiberSource } from 'vite-plugin-react-fiber-source';

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const baseCdnUrl = env.BASE_CDN_URL?.trim();
  const normalizedBaseCdnUrl = baseCdnUrl && !baseCdnUrl.endsWith('/') ? `${baseCdnUrl}/` : baseCdnUrl;

  return {
    base: command === 'build' ? (normalizedBaseCdnUrl ?? './') : './',
    plugins: [
      reactFiberSource(), // Must be used before react() to inject source into _debugInfo.
      react(),
      clientErrorLogger(),
      createHtmlPlugin({
        inject: {
          tags: [
            {
              tag: 'script',
              attrs: {
                src: `https://cdn.wegic.ai/assets/onepage/overwrite/sandbox-scripts/sandbox-script-manager.js?_ts=${Date.now()}`,
              },
              injectTo: 'body',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'framer-motion',
        '@react-three/fiber',
        '@react-three/drei',
        'three',
        'react-router-dom',
        '@supabase/supabase-js',
      ],
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      allowedHosts: true, // 允许所有主机访问（E2B 动态域名）
    },
  };
});
