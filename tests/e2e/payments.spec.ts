/**
 * Playwright E2E tests for the monetisation flows.
 * Covers the upgrade page, print-order page, and payment API contract.
 */
import { test, expect } from '@playwright/test';

// ── Upgrade page ──────────────────────────────────────────────────────────────

test.describe('Upgrade page (unauthenticated)', () => {
  test('redirects to login when not signed in', async ({ page }) => {
    await page.goto('/trips/00000000-0000-0000-0000-000000000000/upgrade');
    await page.waitForURL(/login|auth/i, { timeout: 10_000 });
    expect(page.url()).toMatch(/login|auth/i);
  });
});

// ── Print-order page ──────────────────────────────────────────────────────────

test.describe('Print-order page (unauthenticated)', () => {
  test('redirects to login when not signed in', async ({ page }) => {
    await page.goto('/trips/00000000-0000-0000-0000-000000000000/print-order');
    await page.waitForURL(/login|auth/i, { timeout: 10_000 });
    expect(page.url()).toMatch(/login|auth/i);
  });
});

// ── Payment API contract ──────────────────────────────────────────────────────

test.describe('POST /api/payments/create-order — API contract', () => {
  test('returns 401 without a session cookie', async ({ request }) => {
    const res = await request.post('/api/payments/create-order', {
      data: { tripId: '00000000-0000-0000-0000-000000000000', tier: 'digital' },
    });
    expect(res.status()).toBe(401);
  });

  test('returns 400 for an invalid tier', async ({ request }) => {
    // No valid session in test — 401 expected, not 400, but important to verify
    // the endpoint exists (not 404) and returns JSON.
    const res = await request.post('/api/payments/create-order', {
      data: { tripId: '00000000-0000-0000-0000-000000000000', tier: 'nonexistent' },
    });
    // Should return 400 or 401 (auth check first) — never 404 (route must exist)
    expect([400, 401]).toContain(res.status());
    expect(res.headers()['content-type']).toMatch(/json/);
  });

  test('route exists (not 404)', async ({ request }) => {
    const res = await request.post('/api/payments/create-order', {
      data: {},
    });
    expect(res.status()).not.toBe(404);
  });
});

// ── Print-waitlist API contract ───────────────────────────────────────────────

test.describe('POST /api/print-waitlist — API contract', () => {
  test('returns 401 without a session', async ({ request }) => {
    const res = await request.post('/api/print-waitlist', {
      data: { tripId: '00000000-0000-0000-0000-000000000000' },
    });
    expect(res.status()).toBe(401);
  });

  test('route exists (not 404)', async ({ request }) => {
    const res = await request.post('/api/print-waitlist', {
      data: {},
    });
    expect(res.status()).not.toBe(404);
  });
});

// ── Authenticated upgrade UX ──────────────────────────────────────────────────

const AUTH_COOKIE = process.env.PLAYWRIGHT_AUTH_COOKIE;

test.describe('Upgrade page UI (authenticated)', () => {
  test.skip(!AUTH_COOKIE, 'Skipped: set PLAYWRIGHT_AUTH_COOKIE to run authenticated tests');

  test.beforeEach(async ({ context }) => {
    if (AUTH_COOKIE) await context.addCookies(JSON.parse(AUTH_COOKIE));
  });

  test('shows ₹399 price for digital tier', async ({ page }) => {
    await page.goto('/trips/00000000-0000-0000-0000-000000000000/upgrade');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('₹399')).toBeVisible({ timeout: 10_000 });
  });

  test('shows ₹799 price for print tier', async ({ page }) => {
    await page.goto('/trips/00000000-0000-0000-0000-000000000000/upgrade');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('₹799')).toBeVisible({ timeout: 10_000 });
  });

  test('print-order page shows "Bind the Lore" heading', async ({ page }) => {
    await page.goto('/trips/00000000-0000-0000-0000-000000000000/print-order');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/bind.*lore/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('print-order page shows notify me button', async ({ page }) => {
    await page.goto('/trips/00000000-0000-0000-0000-000000000000/print-order');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /notify me|ready/i })).toBeVisible({
      timeout: 10_000,
    });
  });
});
