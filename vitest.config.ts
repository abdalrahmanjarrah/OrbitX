import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'firebase/app': path.resolve(__dirname, 'src/supabaseAdapter.ts'),
      'firebase/auth': path.resolve(__dirname, 'src/supabaseAdapter.ts'),
      'firebase/firestore': path.resolve(__dirname, 'src/supabaseAdapter.ts'),
      'react-firebase-hooks/auth': path.resolve(__dirname, 'src/firebaseHooks.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
  },
});
