/**
 * Route protection tests — every authenticated route must redirect unauthenticated
 * users to /login. These run without any session cookie.
 */
import { test, expect, type Page } from '@playwright/test';

const FAKE_ID = '00000000-0000-0000-0000-000000000000';

async function expectsLoginRedirect(page: Page, path: string) {
  await page.goto(path);
  await page.waitForURL(/login|auth/i, { timeout: 12_000 });
  expect(page.url()).toMatch(/login|auth/i);
}

test.describe('Protected routes — no session', () => {
  test('/trips redirects to login', async ({ page }) => {
    await expectsLoginRedirect(page, '/trips');
  });

  test('/trips/new redirects to login', async ({ page }) => {
    await expectsLoginRedirect(page, '/trips/new');
  });

  test('/trips/[id] redirects to login', async ({ page }) => {
    await expectsLoginRedirect(page, `/trips/${FAKE_ID}`);
  });

  test('/trips/[id]/invite redirects to login', async ({ page }) => {
    await expectsLoginRedirect(page, `/trips/${FAKE_ID}/invite`);
  });

  test('/trips/[id]/share redirects to login', async ({ page }) => {
    await expectsLoginRedirect(page, `/trips/${FAKE_ID}/share`);
  });

  test('/trips/[id]/upgrade redirects to login', async ({ page }) => {
    await expectsLoginRedirect(page, `/trips/${FAKE_ID}/upgrade`);
  });

  test('/trips/[id]/print-order redirects to login', async ({ page }) => {
    await expectsLoginRedirect(page, `/trips/${FAKE_ID}/print-order`);
  });

  test('/trips/[id]/generating redirects to login', async ({ page }) => {
    await expectsLoginRedirect(page, `/trips/${FAKE_ID}/generating`);
  });

  test('/trips/[id]/story redirects to login', async ({ page }) => {
    await expectsLoginRedirect(page, `/trips/${FAKE_ID}/story`);
  });

  test('/trips/[id]/card redirects to login', async ({ page }) => {
    await expectsLoginRedirect(page, `/trips/${FAKE_ID}/card`);
  });
});

test.describe('Public routes — accessible without session', () => {
  test('/trips/join is publicly accessible', async ({ page }) => {
    await page.goto('/trips/join');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toMatch(/login|auth/i);
    // Should show a code input, not redirect
    await expect(page.locator('input[placeholder="TRIPCODE"]')).toBeVisible({ timeout: 10_000 });
  });

  test('/login is publicly accessible', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toMatch(/login/i);
  });

  test('/ (landing) is publicly accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toMatch(/login|auth/i);
  });

  test('/privacy is publicly accessible', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toMatch(/login|auth/i);
  });

  test('/terms is publicly accessible', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toMatch(/login|auth/i);
  });
});
