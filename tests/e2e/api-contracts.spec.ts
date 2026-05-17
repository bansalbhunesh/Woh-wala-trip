/**
 * API contract tests — every backend route is verified for:
 *   • existence (no 404)
 *   • authentication requirements (401 without session)
 *   • content-type (always JSON)
 *   • input validation (400 on bad input)
 *
 * These tests never send real credentials or hit live external services.
 */
import { test, expect } from '@playwright/test';

const FAKE_UUID = '00000000-0000-0000-0000-000000000000';

// ── Auth: send-otp ────────────────────────────────────────────────────────────

test.describe('POST /api/auth/send-otp', () => {
  test('exists (not 404)', async ({ request }) => {
    const res = await request.post('/api/auth/send-otp', { data: {} });
    expect(res.status()).not.toBe(404);
  });

  test('returns JSON', async ({ request }) => {
    const res = await request.post('/api/auth/send-otp', { data: {} });
    expect(res.headers()['content-type']).toMatch(/json/);
  });

  test('rejects missing email with 400', async ({ request }) => {
    const res = await request.post('/api/auth/send-otp', { data: {} });
    expect([400, 422]).toContain(res.status());
  });

  test('rejects clearly invalid email format', async ({ request }) => {
    const res = await request.post('/api/auth/send-otp', {
      data: { email: 'notanemail' },
    });
    expect([400, 422]).toContain(res.status());
  });

  test('rejects known disposable domain', async ({ request }) => {
    const res = await request.post('/api/auth/send-otp', {
      data: { email: 'user@mailinator.com' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error || body.message).toBeTruthy();
  });
});

// ── Auth: verify-otp ─────────────────────────────────────────────────────────

test.describe('POST /api/auth/verify-otp', () => {
  test('exists (not 404)', async ({ request }) => {
    const res = await request.post('/api/auth/verify-otp', { data: {} });
    expect(res.status()).not.toBe(404);
  });

  test('returns JSON', async ({ request }) => {
    const res = await request.post('/api/auth/verify-otp', { data: {} });
    expect(res.headers()['content-type']).toMatch(/json/);
  });

  test('rejects missing fields with 400', async ({ request }) => {
    const res = await request.post('/api/auth/verify-otp', { data: {} });
    expect([400, 422]).toContain(res.status());
  });

  test('rejects invalid token format', async ({ request }) => {
    const res = await request.post('/api/auth/verify-otp', {
      data: { email: 'test@example.com', token: '99' }, // too short
    });
    expect([400, 422]).toContain(res.status());
  });

  test('returns error for wrong token without crashing', async ({ request }) => {
    const res = await request.post('/api/auth/verify-otp', {
      data: { email: 'test@example.com', token: '999999' },
    });
    // Should return 400/401, never 500
    expect(res.status()).toBeLessThan(500);
  });
});

// ── Payments: create-order ────────────────────────────────────────────────────

test.describe('POST /api/payments/create-order', () => {
  test('exists (not 404)', async ({ request }) => {
    const res = await request.post('/api/payments/create-order', { data: {} });
    expect(res.status()).not.toBe(404);
  });

  test('returns JSON', async ({ request }) => {
    const res = await request.post('/api/payments/create-order', { data: {} });
    expect(res.headers()['content-type']).toMatch(/json/);
  });

  test('requires authentication — 401 without session', async ({ request }) => {
    const res = await request.post('/api/payments/create-order', {
      data: { tripId: FAKE_UUID, tier: 'digital' },
    });
    expect(res.status()).toBe(401);
  });

  test('unauthenticated request never returns 500', async ({ request }) => {
    const res = await request.post('/api/payments/create-order', {
      data: { tripId: FAKE_UUID, tier: 'digital' },
    });
    expect(res.status()).not.toBe(500);
  });

  test('invalid tier returns 4xx — never 5xx', async ({ request }) => {
    const res = await request.post('/api/payments/create-order', {
      data: { tripId: FAKE_UUID, tier: 'platinum' },
    });
    expect(res.status()).toBeLessThan(500);
  });
});

// ── Print-waitlist ─────────────────────────────────────────────────────────────

test.describe('POST /api/print-waitlist', () => {
  test('exists (not 404)', async ({ request }) => {
    const res = await request.post('/api/print-waitlist', { data: {} });
    expect(res.status()).not.toBe(404);
  });

  test('returns JSON', async ({ request }) => {
    const res = await request.post('/api/print-waitlist', { data: {} });
    expect(res.headers()['content-type']).toMatch(/json/);
  });

  test('requires authentication — 401 without session', async ({ request }) => {
    const res = await request.post('/api/print-waitlist', {
      data: { tripId: FAKE_UUID },
    });
    expect(res.status()).toBe(401);
  });
});

// ── Reactions API ─────────────────────────────────────────────────────────────

test.describe('GET /api/reactions', () => {
  test('returns 200 with empty counts for missing params', async ({ request }) => {
    const res = await request.get('/api/reactions');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('counts');
  });

  test('returns JSON', async ({ request }) => {
    const res = await request.get('/api/reactions?tripId=abc&slideType=title');
    expect(res.headers()['content-type']).toMatch(/json/);
  });
});

test.describe('POST /api/reactions', () => {
  test('exists and returns JSON', async ({ request }) => {
    const res = await request.post('/api/reactions', {
      data: { tripId: FAKE_UUID, slideType: 'verdict', emoji: '🔥' },
    });
    // No auth required for anonymous reactions — expect 200 or 429 (rate limited), not 401
    expect([200, 429]).toContain(res.status());
    expect(res.headers()['content-type']).toMatch(/json/);
  });

  test('rejects invalid emoji', async ({ request }) => {
    const res = await request.post('/api/reactions', {
      data: { tripId: FAKE_UUID, slideType: 'verdict', emoji: '💩' },
    });
    expect(res.status()).toBe(400);
  });

  test('rejects missing tripId', async ({ request }) => {
    const res = await request.post('/api/reactions', {
      data: { slideType: 'verdict', emoji: '🔥' },
    });
    expect(res.status()).toBe(400);
  });
});

// ── Admin ─────────────────────────────────────────────────────────────────────

test.describe('GET /api/admin/security-log', () => {
  test('returns 401 without admin token', async ({ request }) => {
    const res = await request.get('/api/admin/security-log');
    expect([401, 403]).toContain(res.status());
  });

  test('returns 401 with wrong token', async ({ request }) => {
    const res = await request.get('/api/admin/security-log', {
      headers: { Authorization: 'Bearer wrongtoken' },
    });
    expect([401, 403]).toContain(res.status());
  });
});

// ── Cron routes (not publicly triggerable) ────────────────────────────────────

test.describe('Cron routes', () => {
  test('/api/cron/stuck-jobs returns 401 without cron secret', async ({ request }) => {
    const res = await request.get('/api/cron/stuck-jobs');
    expect([401, 403]).toContain(res.status());
  });

  test('/api/cron/anniversaries returns 401 without cron secret', async ({ request }) => {
    const res = await request.get('/api/cron/anniversaries');
    expect([401, 403]).toContain(res.status());
  });
});

// ── tRPC batch endpoint ───────────────────────────────────────────────────────

test.describe('tRPC endpoint', () => {
  test('/api/trpc exists (not 404)', async ({ request }) => {
    const res = await request.get('/api/trpc/trips.listMine?batch=1&input={}');
    expect(res.status()).not.toBe(404);
  });

  test('returns JSON array for batch requests', async ({ request }) => {
    const res = await request.get(
      '/api/trpc/trips.listMine?batch=1&input=' + encodeURIComponent('{"0":{}}')
    );
    expect(res.headers()['content-type']).toMatch(/json/);
  });

  test('protected procedures return UNAUTHORIZED without session', async ({ request }) => {
    const res = await request.get(
      '/api/trpc/trips.listMine?batch=1&input=' + encodeURIComponent('{"0":{}}')
    );
    const body = await res.json();
    // tRPC wraps errors in array — check for UNAUTHORIZED code
    const errors = Array.isArray(body) ? body : [body];
    const hasUnauthorized = errors.some(
      (e: { error?: { data?: { code?: string } } }) =>
        e?.error?.data?.code === 'UNAUTHORIZED' || JSON.stringify(e).includes('UNAUTHORIZED')
    );
    expect(hasUnauthorized).toBe(true);
  });
});
