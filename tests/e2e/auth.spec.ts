import { test, expect } from '@playwright/test';

test.describe('Authentication flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('login page renders email input', async ({ page }) => {
    // CinematicAuth is dynamically loaded; wait for it
    await expect(
      page
        .locator('input[type="email"], input[placeholder*="email"], input[placeholder*="Email"]')
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('rejects empty email submission', async ({ page }) => {
    // Find and click the Send OTP button without entering email
    const sendBtn = page.getByRole('button', { name: /send|otp|continue|enter/i }).first();
    await expect(sendBtn).toBeVisible({ timeout: 15_000 });
    await sendBtn.click();
    // Should show validation error or button remains disabled
    const emailInput = page.locator('input[type="email"]').first();
    const isRequired = await emailInput.getAttribute('required');
    const isDisabled = await sendBtn.isDisabled();
    expect(isRequired !== null || isDisabled).toBe(true);
  });

  test('rejects clearly invalid email format', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('notanemail');
    const sendBtn = page.getByRole('button', { name: /send|otp|continue|enter/i }).first();
    await sendBtn.click();
    // Either HTML5 validation fires, or inline error appears, or button is disabled
    const validityState = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(validityState).toBe(false);
  });

  test('shows OTP input after valid email is submitted (mock)', async ({ page }) => {
    // We can't send a real OTP in tests, but we can verify the form transitions
    // by intercepting the API call and mocking a success response
    await page.route('**/api/auth/send-otp', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('test@example.com');
    const sendBtn = page.getByRole('button', { name: /send|otp|continue|enter/i }).first();
    await sendBtn.click();
    // OTP input or confirmation screen should appear
    await expect(page.locator('input[type="text"][maxlength]').first()).toBeVisible({
      timeout: 8_000,
    });
  });
});

test.describe('Protected route redirect', () => {
  test('trips page redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/trips');
    await page.waitForURL(/login|auth/i, { timeout: 10_000 });
    expect(page.url()).toMatch(/login|auth/i);
  });

  test('new trip page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/trips/new');
    await page.waitForURL(/login|auth/i, { timeout: 10_000 });
    expect(page.url()).toMatch(/login|auth/i);
  });
});
