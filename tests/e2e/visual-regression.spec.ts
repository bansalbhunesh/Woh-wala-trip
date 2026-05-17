/**
 * Visual regression snapshots for public-facing pages.
 * Run with: npx playwright test tests/e2e/visual-regression.spec.ts --update-snapshots
 * to regenerate baseline images.
 */
import { test, expect } from '@playwright/test';

const PUBLIC_ROUTES = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'join', path: '/trips/join' },
  { name: 'privacy', path: '/privacy' },
  { name: 'terms', path: '/terms' },
] as const;

for (const { name, path } of PUBLIC_ROUTES) {
  test(`${name} page — desktop snapshot`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    // Mask any animated elements to prevent flaky diffs
    await expect(page).toHaveScreenshot(`${name}-desktop.png`, {
      maxDiffPixels: 200,
      mask: [page.locator('.film-grain'), page.locator('.light-grain'), page.locator('canvas')],
    });
  });

  test(`${name} page — mobile snapshot`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(`${name}-mobile.png`, {
      maxDiffPixels: 200,
      mask: [page.locator('.film-grain'), page.locator('.light-grain'), page.locator('canvas')],
    });
  });
}
