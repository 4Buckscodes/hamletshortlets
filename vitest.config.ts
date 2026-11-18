import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'npm:@supabase/supabase-js@2': '@supabase/supabase-js',
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.{ts,tsx}',
      'supabase/functions/**/*.test.ts',
      'supabase/tests/**/*.test.ts',
    ],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
