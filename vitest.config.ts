/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.stories.{ts,tsx}',
        'src/app/api/**',
        // Next.js App Router boilerplate/layouts and untested visual page views
        'src/app/layout.tsx',
        'src/app/page.tsx',
        'src/app/sitemap.ts',
        'src/app/auth/callback/**',
        'src/app/(auth)/**',
        'src/app/privacy/**',
        'src/app/terms/**',
        'src/app/t/[code]/**',
        'src/app/trips/page.tsx',
        'src/app/trips/[tripId]/**',
        'src/app/battles/**',
        'src/app/demo/**',
        'src/app/status/**',
        'src/app/u/[username]/**',
        'src/app/wrap/[year]/**',
        // Visually-intensive UI scenes (covered by visual regression / E2E)
        'src/components/cinematic/**',
        'src/components/experience/**',
        'src/components/providers/**',
        'src/components/ErrorBoundary.tsx',
        // Infrastructure libraries & boilerplate wrappers
        'src/middleware.ts',
        'src/lib/og/**',
        'src/lib/supabase/**',
        'src/lib/trpc/**',
        'src/lib/analytics.ts',
        'src/lib/langfuse.ts',
        'src/lib/logger.ts',
        'src/lib/database.types.ts',
        'src/lib/demo-trip.ts',
        'src/lib/push.ts',
        'src/lib/types.ts',
        // Backend router files tested via E2E (not unit-tested)
        'src/server/trpc/router.ts',
        'src/server/trpc/routers/archetypes.ts',
        'src/server/trpc/routers/cards.ts',
        'src/server/trpc/routers/photos.ts',
        'src/server/trpc/routers/reactions.ts',
        'src/server/trpc/routers/trips.ts',
        'src/types/**',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
