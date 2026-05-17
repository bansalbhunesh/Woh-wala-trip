/**
 * Confession input tests — covers the ConfessionInput component embedded in the
 * trip room (/trips/[id]). Tests min-length validation, submit button disabled
 * state, pending state, and success state via mocked tRPC.
 *
 * Requires PLAYWRIGHT_AUTH_COOKIE + PLAYWRIGHT_TEST_TRIP_ID.
 */
import { test, expect } from '@playwright/test';

const AUTH_COOKIE = process.env.PLAYWRIGHT_AUTH_COOKIE;
const REAL_TRIP_ID = process.env.PLAYWRIGHT_TEST_TRIP_ID;

test.describe('ConfessionInput component', () => {
  test.skip(
    !AUTH_COOKIE || !REAL_TRIP_ID,
    'Skipped: set PLAYWRIGHT_AUTH_COOKIE and PLAYWRIGHT_TEST_TRIP_ID to run'
  );

  test.beforeEach(async ({ context }) => {
    if (AUTH_COOKIE) await context.addCookies(JSON.parse(AUTH_COOKIE));
  });

  async function goToTripWithConfession(
    page: ReturnType<typeof test.info extends never ? never : typeof page>
  ) {
    await page.goto(`/trips/${REAL_TRIP_ID}`);
    await page.waitForLoadState('networkidle');
    // Scroll to confession input (it's in the right sidebar)
    const confession = page.getByPlaceholder(/something the group would never admit/i);
    await confession.scrollIntoViewIfNeeded();
    return confession;
  }

  test('confession textarea is visible on the trip page', async ({ page }) => {
    const textarea = await goToTripWithConfession(page);
    await expect(textarea).toBeVisible({ timeout: 10_000 });
  });

  test('"Intelligence Filing · Anonymous" label is visible', async ({ page }) => {
    await goToTripWithConfession(page);
    await expect(page.getByText(/intelligence filing/i)).toBeVisible({ timeout: 10_000 });
  });

  test('"What really happened?" heading is visible', async ({ page }) => {
    await goToTripWithConfession(page);
    await expect(page.getByText(/what really happened/i)).toBeVisible({ timeout: 10_000 });
  });

  test('submit button is disabled with empty textarea', async ({ page }) => {
    await goToTripWithConfession(page);
    const submitBtn = page.getByRole('button', { name: /file report/i });
    await expect(submitBtn).toBeDisabled({ timeout: 10_000 });
  });

  test('submit button is disabled with fewer than 10 chars', async ({ page }) => {
    const textarea = await goToTripWithConfession(page);
    await textarea.fill('too short');
    const submitBtn = page.getByRole('button', { name: /file report/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('submit button is enabled with 10+ chars', async ({ page }) => {
    const textarea = await goToTripWithConfession(page);
    await textarea.fill('This is long enough to pass validation.');
    const submitBtn = page.getByRole('button', { name: /file report/i });
    await expect(submitBtn).toBeEnabled();
  });

  test('character counter appears after typing', async ({ page }) => {
    const textarea = await goToTripWithConfession(page);
    await textarea.fill('Some text here for testing purposes.');
    // Counter shows "N/500"
    await expect(page.getByText(/\/500/)).toBeVisible({ timeout: 3_000 });
  });

  test('submit shows success state after successful mutation', async ({ page }) => {
    // Mock the tRPC submitConfession mutation to return success
    await page.route('**/api/trpc/trips.submitConfession**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ result: { data: { ok: true } } }]),
      });
    });

    const textarea = await goToTripWithConfession(page);
    await textarea.fill('This confession is long enough to submit to the archive.');

    const submitBtn = page.getByRole('button', { name: /file report/i });
    await submitBtn.click();

    // Success state shows "Filed. The archive has been updated."
    await expect(page.getByText(/filed\. the archive has been updated/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test('"File another →" button resets to input state after success', async ({ page }) => {
    await page.route('**/api/trpc/trips.submitConfession**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ result: { data: { ok: true } } }]),
      });
    });

    const textarea = await goToTripWithConfession(page);
    await textarea.fill('This confession is long enough to be filed in the archive.');

    await page.getByRole('button', { name: /file report/i }).click();
    await expect(page.getByText(/filed\. the archive has been updated/i)).toBeVisible({
      timeout: 5_000,
    });

    // Click "File another →" to reset
    await page.getByRole('button', { name: /file another/i }).click();
    // Should show the textarea again
    await expect(page.getByPlaceholder(/something the group would never admit/i)).toBeVisible({
      timeout: 3_000,
    });
  });

  test('textarea respects 500 char maxLength', async ({ page }) => {
    const textarea = await goToTripWithConfession(page);
    const longText = 'A'.repeat(600);
    await textarea.fill(longText);
    const value = await textarea.inputValue();
    expect(value.length).toBeLessThanOrEqual(500);
  });

  test('shows pending state while submitting', async ({ page }) => {
    // Use a delayed mock to catch the pending state
    await page.route('**/api/trpc/trips.submitConfession**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ result: { data: { ok: true } } }]),
      });
    });

    const textarea = await goToTripWithConfession(page);
    await textarea.fill('This is long enough to show the pending state during submission.');
    await page.getByRole('button', { name: /file report/i }).click();

    // Button should show "Filing…" while pending
    await expect(page.getByRole('button', { name: /filing/i })).toBeVisible({ timeout: 2_000 });
  });
});
