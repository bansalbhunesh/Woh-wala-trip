import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const cleanErrors = errors.filter(e => {
      const msg = e.toLowerCase();
      return (
        !msg.includes('resizeobserver') &&
        !msg.includes('webgl') &&
        !msg.includes('three') &&
        !msg.includes('audio') &&
        !msg.includes('autoplay') &&
        !msg.includes('posthog') &&
        !msg.includes('langfuse')
      );
    });
    expect(cleanErrors).toHaveLength(0);
  });

  test('has yaarlore branding visible', async ({ page }) => {
    await expect(page.getByText(/yaarlore/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('has a CTA that links to login', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /start|create|enter|login|sign/i }).first();
    await expect(loginLink).toBeVisible({ timeout: 10_000 });
  });

  test('fits on one screen without vertical scroll on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    // Allow small overflow (sticky headers, etc.) but page should not scroll >50px
    expect(scrollHeight - viewportHeight).toBeLessThan(50);
  });

  test('is responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // No horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
