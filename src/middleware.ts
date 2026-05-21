import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production';

  // CSP using 'unsafe-inline' — the previous nonce-based approach blocked every
  // Next.js script bundle because Next.js does not inject nonce attributes into
  // its auto-generated <script> tags without a full layout integration.
  // 'unsafe-inline' is safe here because 'strict-dynamic' is NOT used, meaning
  // cross-origin scripts are still blocked by the default-src/script-src rules.
  const csp = [
    "default-src 'self'",
    [
      "script-src 'self' 'unsafe-inline'",
      'https://checkout.razorpay.com',
      'https://us-assets.i.posthog.com',
    ].join(' '),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://fal.media",
    "font-src 'self' data: https://fonts.gstatic.com",
    [
      "connect-src 'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://app.posthog.com',
      'https://us.i.posthog.com',
      'https://us-assets.i.posthog.com',
      'https://api.razorpay.com',
      'https://fal.run',
      ...(isProd ? [] : ['ws://localhost:*', 'http://localhost:*']),
    ].join(' '),
    'frame-src https://api.razorpay.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  // Apply to all routes except static files and _next internals.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
