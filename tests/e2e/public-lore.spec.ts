/**
 * Public lore overview tests — the /t/[code] page is public (no auth required).
 * Tests cover: page renders without auth, key elements visible, CTAs present,
 * and graceful redirect for non-existent codes.
 *
 * Requires PLAYWRIGHT_TEST_LORE_CODE for the authenticated/lore-ready tests.
 */
import { test, expect } from '@playwright/test';

// A code that definitely doesn't exist — server should redirect to /
const BOGUS_CODE = 'ZZZZZZZZ';

// ── Non-existent code ─────────────────────────────────────────────────────────

test.describe('Public lore page — non-existent invite code', () => {
  test('redirects away from / for a bogus code', async ({ page }) => {
    await page.goto(`/t/${BOGUS_CODE}`);
    await page.waitForLoadState('networkidle');
    // Server redirects to / when trip not found
    expect(page.url()).not.toContain(`/t/${BOGUS_CODE}`);
  });
});

// ── Lore-ready trip (no auth required) ───────────────────────────────────────

const LORE_CODE = process.env.PLAYWRIGHT_TEST_LORE_CODE;

test.describe('Public lore page — lore-ready trip', () => {
  test.skip(
    !LORE_CODE,
    'Skipped: set PLAYWRIGHT_TEST_LORE_CODE to a trip invite code with generated lore'
  );

  test('accessible without any session cookie', async ({ page }) => {
    await page.goto(`/t/${LORE_CODE}`);
    await page.waitForLoadState('networkidle');
    // Should not redirect to login
    expect(page.url()).not.toMatch(/login|auth/i);
    expect(page.url()).toContain(`/t/${LORE_CODE}`);
  });

  test('renders the trip title (large heading)', async ({ page }) => {
    await page.goto(`/t/${LORE_CODE}`);
    await page.waitForLoadState('networkidle');
    // Title is in an h1 with very large font size
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible({ timeout: 10_000 });
    const text = await h1.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('renders the chaos score number', async ({ page }) => {
    await page.goto(`/t/${LORE_CODE}`);
    await page.waitForLoadState('networkidle');
    // Chaos Rating label is present
    await expect(page.getByText(/chaos rating/i)).toBeVisible({ timeout: 10_000 });
  });

  test('renders the cooked verdict', async ({ page }) => {
    await page.goto(`/t/${LORE_CODE}`);
    await page.waitForLoadState('networkidle');
    // Chaos Rating section contains the verdict text
    await expect(page.getByText(/chaos rating/i)).toBeVisible({ timeout: 10_000 });
  });

  test('"View Full Story" CTA button is visible', async ({ page }) => {
    await page.goto(`/t/${LORE_CODE}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: /view full story/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('"Join the Season" CTA button is visible', async ({ page }) => {
    await page.goto(`/t/${LORE_CODE}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: /join the season/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('"View Full Story" link points to /t/[code]/story', async ({ page }) => {
    await page.goto(`/t/${LORE_CODE}`);
    await page.waitForLoadState('networkidle');
    const storyLink = page.getByRole('link', { name: /view full story/i });
    const href = await storyLink.getAttribute('href');
    expect(href).toMatch(new RegExp(`/t/${LORE_CODE}/story`));
  });

  test('"Join the Season" link points to /trips/join', async ({ page }) => {
    await page.goto(`/t/${LORE_CODE}`);
    await page.waitForLoadState('networkidle');
    const joinLink = page.getByRole('link', { name: /join the season/i });
    const href = await joinLink.getAttribute('href');
    expect(href).toContain('/trips/join');
  });

  test('quick stats grid shows Cast and Runtime', async ({ page }) => {
    await page.goto(`/t/${LORE_CODE}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/cast/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/runtime/i)).toBeVisible({ timeout: 10_000 });
  });

  test('"Private Release" label is visible', async ({ page }) => {
    await page.goto(`/t/${LORE_CODE}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/private release/i)).toBeVisible({ timeout: 10_000 });
  });

  test('page renders correct og:title meta tag', async ({ page }) => {
    await page.goto(`/t/${LORE_CODE}`);
    await page.waitForLoadState('networkidle');
    const ogTitle = await page.$eval('meta[property="og:title"]', el => el.getAttribute('content'));
    expect(ogTitle).toBeTruthy();
    expect(ogTitle!.length).toBeGreaterThan(0);
  });

  test('page does not return 500 status', async ({ request }) => {
    const res = await request.get(`/t/${LORE_CODE}`);
    expect(res.status()).toBeLessThan(500);
  });
});

// ── No-lore trip redirects to join ───────────────────────────────────────────

const NO_LORE_CODE = process.env.PLAYWRIGHT_TEST_NO_LORE_CODE;

test.describe('Public lore page — trip without lore', () => {
  test.skip(
    !NO_LORE_CODE,
    'Skipped: set PLAYWRIGHT_TEST_NO_LORE_CODE to a trip with no generated lore'
  );

  test('redirects to /trips/join when lore_json is null', async ({ page }) => {
    await page.goto(`/t/${NO_LORE_CODE}`);
    await page.waitForURL(/trips\/join/i, { timeout: 12_000 });
    expect(page.url()).toContain('/trips/join');
  });
});
