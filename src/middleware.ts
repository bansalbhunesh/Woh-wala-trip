import { NextResponse, type NextRequest } from 'next/server';

// Generate a cryptographically random nonce for CSP.
// Each request gets a fresh nonce — this prevents XSS via injected scripts
// because the attacker cannot predict the nonce value.
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}

export function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const isProd = process.env.NODE_ENV === 'production';

  // Strict CSP: nonce replaces 'unsafe-inline' for scripts.
  // 'unsafe-eval' is excluded — GSAP and Framer Motion do not require it.
  // Sentry tunnel route and PostHog are allowed in connect-src.
  const csp = [
    "default-src 'self'",
    // Nonce-based script policy. 'strict-dynamic' trusts scripts loaded by nonce-tagged scripts.
    `script-src 'nonce-${nonce}' 'strict-dynamic' https://checkout.razorpay.com https://us-assets.i.posthog.com`,
    "style-src 'self' 'unsafe-inline'",
    // unsafe-inline in style-src is acceptable — CSS injection is far less dangerous than JS injection.
    // For future: migrate to CSS Modules / Tailwind to eliminate inline styles.
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    [
      "connect-src 'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://app.posthog.com',
      'https://us.i.posthog.com',
      'https://api.razorpay.com',
      ...(isProd ? [] : ['ws://localhost:*', 'http://localhost:*']),
    ].join(' '),
    'frame-src https://api.razorpay.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  // Apply to all routes except static files, _next internals, and API monitoring tunnel
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/monitoring).*)'],
};
