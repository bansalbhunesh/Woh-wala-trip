/**
 * Invite page tests — covers the invite code display, copy button, WhatsApp share,
 * and "Enter Archive" navigation. Authenticated flows require PLAYWRIGHT_AUTH_COOKIE.
 */
import { test, expect } from '@playwright/test';

const FAKE_ID = '00000000-0000-0000-0000-000000000000';

// ── Unauthenticated ───────────────────────────────────────────────────────────

test.describe('Invite page (unauthenticated)', () => {
  test('redirects to login', async ({ page }) => {
    await page.goto(`/trips/${FAKE_ID}/invite`);
    await page.waitForURL(/login|auth/i, { timeout: 12_000 });
    expect(page.url()).toMatch(/login|auth/i);
  });
});

// ── Authenticated ─────────────────────────────────────────────────────────────

const AUTH_COOKIE = process.env.PLAYWRIGHT_AUTH_COOKIE;
const REAL_TRIP_ID = process.env.PLAYWRIGHT_TEST_TRIP_ID;

test.describe('Invite page UI (authenticated)', () => {
  test.skip(
    !AUTH_COOKIE || !REAL_TRIP_ID,
    'Skipped: set PLAYWRIGHT_AUTH_COOKIE and PLAYWRIGHT_TEST_TRIP_ID to run'
  );

  test.beforeEach(async ({ context }) => {
    if (AUTH_COOKIE) await context.addCookies(JSON.parse(AUTH_COOKIE));
  });

  test('renders "GATHER THE CAST" heading', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/invite`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/gather.*the.*cast/i)).toBeVisible({ timeout: 10_000 });
  });

  test('renders ACCESS CODE label', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/invite`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/access code/i)).toBeVisible({ timeout: 10_000 });
  });

  test('shows invite code (non-placeholder)', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/invite`);
    await page.waitForLoadState('networkidle');
    // The code should be visible and not just dashes
    const codeEl = page.locator('p.font-display.font-black').first();
    await expect(codeEl).toBeVisible({ timeout: 10_000 });
    const text = await codeEl.textContent();
    expect(text?.trim()).toBeTruthy();
    expect(text?.trim()).not.toBe('––––');
  });

  test('copy code button exists', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/invite`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /copy code/i })).toBeVisible({ timeout: 10_000 });
  });

  test('copy code button shows COPIED after click', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/invite`);
    await page.waitForLoadState('networkidle');
    const copyBtn = page.getByRole('button', { name: /copy code/i });
    await copyBtn.click();
    await expect(page.getByRole('button', { name: /copied/i })).toBeVisible({ timeout: 3_000 });
  });

  test('WhatsApp share button exists', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/invite`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /share on whatsapp/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('"ENTER ARCHIVE" button exists', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/invite`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /enter archive/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('"ENTER ARCHIVE" button navigates to trip page', async ({ page }) => {
    await page.goto(`/trips/${REAL_TRIP_ID}/invite`);
    await page.waitForLoadState('networkidle');
    const enterBtn = page.getByRole('button', { name: /enter archive/i });
    await enterBtn.click();
    await page.waitForURL(new RegExp(`/trips/${REAL_TRIP_ID}$`), { timeout: 10_000 });
    expect(page.url()).toContain(`/trips/${REAL_TRIP_ID}`);
  });
});
