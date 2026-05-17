/**
 * Share / card selector page tests — covers the horizontal card scroll area,
 * action buttons (Instagram, WhatsApp, copy link, download), and loading states.
 */
import { test, expect } from '@playwright/test';

const FAKE_ID = '00000000-0000-0000-0000-000000000000';

// ── Unauthenticated ───────────────────────────────────────────────────────────

test.describe('Share page (unauthenticated)', () => {
  test('redirects to login', async ({ page }) => {
    await page.goto(`/trips/${FAKE_ID}/share`);
    await page.waitForURL(/login|auth/i, { timeout: 12_000 });
    expect(page.url()).toMatch(/login|auth/i);
  });
});

// ── Authenticated ─────────────────────────────────────────────────────────────

const AUTH_COOKIE = process.env.PLAYWRIGHT_AUTH_COOKIE;
const REAL_TRIP_ID = process.env.PLAYWRIGHT_TEST_TRIP_ID;

test.describe('Share page UI (authenticated, trip with lore)', () => {
  test.skip(
    !AUTH_COOKIE || !REAL_TRIP_ID,
    'Skipped: set PLAYWRIGHT_AUTH_COOKIE and PLAYWRIGHT_TEST_TRIP_ID to run'
  );

  test.beforeEach(async ({ context }) => {
    if (AUTH_COOKIE) await context.addCookies(JSON.parse(AUTH_COOKIE));
  });

  test('renders "Pick a card" heading', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/share`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/pick a card/i)).toBeVisible({ timeout: 10_000 });
  });

  test('renders "Export Identity" label', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/share`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/export identity/i)).toBeVisible({ timeout: 10_000 });
  });

  test('horizontal card scroll area is present', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/share`);
    await page.waitForLoadState('networkidle');
    // The scroll row uses overflow-x-auto and snap-x
    const scrollRow = page.locator('.overflow-x-auto.snap-x').first();
    await expect(scrollRow).toBeVisible({ timeout: 10_000 });
  });

  test('at least one card is visible in the scroll area', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/share`);
    await page.waitForLoadState('networkidle');
    // Cards are rounded-[32px] divs inside the scroll row
    const cards = page.locator('.overflow-x-auto .rounded-\\[32px\\]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Season Archive card is present', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/share`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/season archive/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('"Share to Instagram" action button exists', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/share`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/share to instagram/i)).toBeVisible({ timeout: 10_000 });
  });

  test('"WhatsApp your group" action button exists', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/share`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/whatsapp your group/i)).toBeVisible({ timeout: 10_000 });
  });

  test('"Copy invite link" action button exists', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/share`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/copy invite link/i)).toBeVisible({ timeout: 10_000 });
  });

  test('"Back to Archive" navigation link exists', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/share`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/back to archive/i)).toBeVisible({ timeout: 10_000 });
  });

  test('"Back to Archive" link navigates to trip page', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/share`);
    await page.waitForLoadState('networkidle');
    await page.getByText(/back to archive/i).click();
    await page.waitForURL(new RegExp(`/trips/${REAL_TRIP_ID}$`), { timeout: 10_000 });
    expect(page.url()).toContain(`/trips/${REAL_TRIP_ID}`);
  });

  test('pre-filled caption block is present', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/share`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/pre-filled caption/i)).toBeVisible({ timeout: 10_000 });
  });
});

// ── Loading / error states ─────────────────────────────────────────────────────

test.describe('Share page loading state (authenticated, fake trip)', () => {
  test.skip(!AUTH_COOKIE, 'Skipped: set PLAYWRIGHT_AUTH_COOKIE to run');

  test.beforeEach(async ({ context }) => {
    if (AUTH_COOKIE) await context.addCookies(JSON.parse(AUTH_COOKIE));
  });

  test('shows loading or not-found state for fake trip ID', async ({ page }) => {
    await page.goto(`/trips/${FAKE_ID}/share`);
    await page.waitForLoadState('networkidle');
    // Should show either "Preparing Cards..." or "Archive Lost" — never crash with 500
    const hasLoading = await page
      .getByText(/preparing cards/i)
      .isVisible()
      .catch(() => false);
    const hasNotFound = await page
      .getByText(/archive lost/i)
      .isVisible()
      .catch(() => false);
    expect(hasLoading || hasNotFound).toBe(true);
  });
});
