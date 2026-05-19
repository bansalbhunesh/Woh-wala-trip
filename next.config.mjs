import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compress responses — critical for mobile users on slow Indian mobile connections
  compress: true,
  images: {
    // Serve WebP/AVIF automatically — ~30% smaller than JPEG on Android
    formats: ['image/avif', 'image/webp'],
    // Targets Redmi Note/Samsung Galaxy A-series — most India devices
    deviceSizes: [390, 414, 640, 750, 828, 1080, 1200],
    imageSizes: [32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Security headers applied globally. CSP is set per-request by middleware.ts
        // (nonce-based) so it is intentionally absent here — the static CSP would
        // conflict with the dynamic nonce injected by middleware.
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppresses source map upload logs during build
  silent: true,
  // Disable automatic tree-shaking of Sentry internals — avoids edge-case build failures
  disableLogger: true,
  // Tunnel Sentry requests through /api/monitoring to avoid ad-blockers
  tunnelRoute: '/api/monitoring',
  // Only upload source maps for production builds
  hideSourceMaps: true,
});
