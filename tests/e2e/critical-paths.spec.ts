import { test, expect } from '@playwright/test';

// ── Demo mode ────────────────────────────────────────────────────────────────

test('demo page loads without auth and shows Manali lore', async ({ page }) => {
  await page.goto('/demo');
  // Must NOT redirect to login
  await expect(page).not.toHaveURL(/login/);
  await expect(page).not.toHaveURL(/auth/);
  // Should render cinematic content from the demo lore
  await expect(page.getByText(/manali/i).first()).toBeVisible({ timeout: 10000 });
});

test('demo page has DEMO badge visible', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByText(/demo/i).first()).toBeVisible({ timeout: 10000 });
});

// ── Landing page ─────────────────────────────────────────────────────────────

test('landing page shows both Enter and See Demo CTAs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/enter the lore/i).first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/see a demo/i).first()).toBeVisible({ timeout: 8000 });
});

test('See a Demo CTA links to /demo', async ({ page }) => {
  await page.goto('/');
  const demoLink = page
    .getByRole('link', { name: /see.*demo/i })
    .or(page.locator('a[href="/demo"]'))
    .first();
  await expect(demoLink).toBeVisible({ timeout: 8000 });
  const href = await demoLink.getAttribute('href');
  expect(href).toContain('/demo');
});

// ── Auth protection ───────────────────────────────────────────────────────────

test('trips dashboard redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/trips');
  await expect(page).toHaveURL(/login/, { timeout: 8000 });
});

test('new trip page redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/trips/new');
  await expect(page).toHaveURL(/login/, { timeout: 8000 });
});

// ── Public story share ────────────────────────────────────────────────────────

test('public story page at /t/[code]/story is accessible without auth', async ({ page }) => {
  // Navigate to a non-existent code — should show a not-found or empty state, NOT redirect to login
  await page.goto('/t/TESTCODE/story');
  await expect(page).not.toHaveURL(/login/, { timeout: 8000 });
});

// ── Battles public view ───────────────────────────────────────────────────────

test('battles page does not redirect unauthenticated users', async ({ page }) => {
  // Navigate to a plausible-but-nonexistent battle ID (UUID format)
  await page.goto('/battles/00000000-0000-0000-0000-000000000000');
  // Should not redirect to login — battles are publicly viewable
  await expect(page).not.toHaveURL(/login/, { timeout: 8000 });
});

// ── OG card endpoints ─────────────────────────────────────────────────────────

test('trip OG card endpoint returns an image content type', async ({ request }) => {
  // Use the demo trip code — the card endpoint should handle unknown trips gracefully
  const resp = await request.get('/api/card/TESTID');
  // Should return 200 with image or 404/svg error — never 500
  expect([200, 404]).toContain(resp.status());
  const ct = resp.headers()['content-type'] ?? '';
  expect(ct).toMatch(/image\/(png|svg\+xml)/);
});

test('wrap OG card endpoint returns an image for unknown user', async ({ request }) => {
  const resp = await request.get('/api/card/wrap/00000000-0000-0000-0000-000000000000/2024');
  expect([200, 404]).toContain(resp.status());
  const ct = resp.headers()['content-type'] ?? '';
  expect(ct).toMatch(/image\/(png|svg\+xml)/);
});

// ── Accessibility smoke tests ─────────────────────────────────────────────────

test('login page has accessible email input', async ({ page }) => {
  await page.goto('/login');
  // Email input must have a label or aria-label
  const emailInput = page.locator('input[type="email"], input[autocomplete="email"]').first();
  await expect(emailInput).toBeVisible({ timeout: 8000 });
  const ariaLabel = await emailInput.getAttribute('aria-label');
  const id = await emailInput.getAttribute('id');
  const hasLabel = ariaLabel || (id && (await page.locator(`label[for="${id}"]`).count()) > 0);
  expect(hasLabel).toBeTruthy();
});

test('landing page primary CTA has aria-label', async ({ page }) => {
  await page.goto('/');
  const cta = page.locator('button[aria-label], a[aria-label]').first();
  await expect(cta).toBeVisible({ timeout: 8000 });
});
