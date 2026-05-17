import { test, expect } from '@playwright/test';

// Authenticated session fixture — set PLAYWRIGHT_AUTH_COOKIE env var
// in CI to inject a valid session cookie for protected-route tests.
const AUTH_COOKIE = process.env.PLAYWRIGHT_AUTH_COOKIE;

test.describe('New trip form', () => {
  test.skip(!AUTH_COOKIE, 'Skipped: set PLAYWRIGHT_AUTH_COOKIE to run authenticated tests');

  test.beforeEach(async ({ page, context }) => {
    if (AUTH_COOKIE) {
      await context.addCookies(JSON.parse(AUTH_COOKIE));
    }
    await page.goto('/trips/new');
    await page.waitForLoadState('networkidle');
  });

  test('all four labels are visible', async ({ page }) => {
    await expect(page.getByText('SEASON TITLE')).toBeVisible();
    await expect(page.getByText('FILMING LOCATION')).toBeVisible();
    await expect(page.getByText('PREMIERE DATE')).toBeVisible();
    await expect(page.getByText('FINALE DATE')).toBeVisible();
  });

  test('submit button is disabled with empty name', async ({ page }) => {
    const btn = page.getByRole('button', { name: /LAUNCH THE SEASON/i });
    await expect(btn).toBeDisabled();
  });

  test('submit button enables after filling required fields', async ({ page }) => {
    await page.locator('input[placeholder*="Bus"]').fill('Kasol Trip 2024');
    await page.locator('input[type="date"]').nth(0).fill('2024-03-15');
    await page.locator('input[type="date"]').nth(1).fill('2024-03-17');
    const btn = page.getByRole('button', { name: /LAUNCH THE SEASON/i });
    await expect(btn).toBeEnabled({ timeout: 3_000 });
  });
});

test.describe('New trip form (unauthenticated — redirect check)', () => {
  test('redirects to login', async ({ page }) => {
    await page.goto('/trips/new');
    await page.waitForURL(/login|auth/i, { timeout: 10_000 });
    expect(page.url()).toMatch(/login|auth/i);
  });
});

test.describe('Join trip form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trips/join');
    await page.waitForLoadState('networkidle');
  });

  test('code input is visible', async ({ page }) => {
    await expect(page.getByPlaceholder('TRIPCODE')).toBeVisible({ timeout: 10_000 });
  });

  test('access button is disabled with fewer than 4 chars', async ({ page }) => {
    const btn = page.getByRole('button', { name: /ACCESS ARCHIVE/i });
    await expect(btn).toBeDisabled();
    await page.getByPlaceholder('TRIPCODE').fill('ABC');
    await expect(btn).toBeDisabled();
  });

  test('access button enables with 4+ chars', async ({ page }) => {
    await page.getByPlaceholder('TRIPCODE').fill('ABCD');
    const btn = page.getByRole('button', { name: /ACCESS ARCHIVE/i });
    await expect(btn).toBeEnabled({ timeout: 3_000 });
  });

  test('input is uppercase only', async ({ page }) => {
    const input = page.getByPlaceholder('TRIPCODE');
    await input.fill('kasol1');
    const value = await input.inputValue();
    expect(value).toBe('KASOL1');
  });

  test('shows error for invalid code (mocked)', async ({ page }) => {
    await page.route('**/api/trpc/**', route => {
      if (route.request().url().includes('joinByCode')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: { data: { json: { error: 'invalid_or_expired_code' } } },
          }),
        });
      } else {
        route.continue();
      }
    });
    await page.getByPlaceholder('TRIPCODE').fill('BADCODE');
    await page.getByRole('button', { name: /ACCESS ARCHIVE/i }).click();
    await expect(page.getByText(/invalid or expired|not working/i)).toBeVisible({ timeout: 5_000 });
  });
});
