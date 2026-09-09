import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        base: env.VITE_BASE_PATH || '/',
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'pwa-sw.ts',
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png'],
        manifest: {
          name: 'OrbitX',
          short_name: 'OrbitX',
          start_url: env.VITE_BASE_PATH || '/',
          scope: env.VITE_BASE_PATH || '/',
          theme_color: '#0a0b16',
          background_color: '#0a0b16',
          display: 'standalone',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
          ]
        },
        injectManifest: {
          swSrc: 'src/pwa-sw.ts',
          maximumFileSizeToCacheInBytes: 10485760,
          globPatterns: ['**/*.{js,css,html,png,ico,svg,woff2}'],
        },
      })
    ],
    build: {
      // NOTE: manualChunks removed on purpose. The previous grouping forced
      // recharts (+ a duplicated copy of React) into the initial page load,
      // wrecking the Total Blocking Time. Vite/Rollup now auto-splits lazy
      // routes so heavy libs only load when their view actually opens.
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'firebase/app': path.resolve(__dirname, 'src/supabaseAdapter.ts'),
        'firebase/auth': path.resolve(__dirname, 'src/supabaseAdapter.ts'),
        'firebase/firestore': path.resolve(__dirname, 'src/supabaseAdapter.ts'),
        'react-firebase-hooks/auth': path.resolve(__dirname, 'src/firebaseHooks.ts'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
