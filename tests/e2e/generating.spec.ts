/**
 * Generating page tests — covers UI structure, stage display, progress bar,
 * and timeout state. The page is authentication-protected.
 *
 * Because the generating page requires an active lore-generation job, most
 * visual tests are structural (DOM present) rather than functional, using
 * mocked tRPC responses via page.route() to freeze state at 'processing'.
 */
import { test, expect } from '@playwright/test';

const FAKE_ID = '00000000-0000-0000-0000-000000000000';

// ── Unauthenticated ───────────────────────────────────────────────────────────

test.describe('Generating page (unauthenticated)', () => {
  test('redirects to login', async ({ page }) => {
    await page.goto(`/trips/${FAKE_ID}/generating`);
    await page.waitForURL(/login|auth/i, { timeout: 12_000 });
    expect(page.url()).toMatch(/login|auth/i);
  });
});

// ── Authenticated with mocked tRPC ────────────────────────────────────────────

const AUTH_COOKIE = process.env.PLAYWRIGHT_AUTH_COOKIE;

test.describe('Generating page UI (authenticated + mocked processing state)', () => {
  test.skip(!AUTH_COOKIE, 'Skipped: set PLAYWRIGHT_AUTH_COOKIE to run');

  test.beforeEach(async ({ context }) => {
    if (AUTH_COOKIE) await context.addCookies(JSON.parse(AUTH_COOKIE));
  });

  async function mockProcessingState(
    page: ReturnType<typeof test.info extends never ? never : typeof page>
  ) {
    // Intercept tRPC getFull to return a 'processing' lore_status so the
    // page stays on the generating screen and doesn't redirect away.
    await page.route('**/api/trpc/trips.getFull**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            result: {
              data: {
                trip: {
                  id: FAKE_ID,
                  name: 'Test Trip',
                  lore_status: 'processing',
                  chaos_score: 0,
                },
                members: [],
                stats: [],
                eras: [],
                cover_photo: null,
              },
            },
          },
        ]),
      });
    });

    // Also stub Supabase realtime websocket to prevent connection errors
    await page.route('**/realtime/**', route => route.abort());
  }

  test('renders yaarlore brand text', async ({ page }) => {
    await mockProcessingState(page);
    await page.goto(`/trips/${FAKE_ID}/generating`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('yaarlore')).toBeVisible({ timeout: 10_000 });
  });

  test('renders STAGE indicator', async ({ page }) => {
    await mockProcessingState(page);
    await page.goto(`/trips/${FAKE_ID}/generating`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/stage \d+ of \d+/i)).toBeVisible({ timeout: 10_000 });
  });

  test('renders a stage label (one of the 6 known stages)', async ({ page }) => {
    await mockProcessingState(page);
    await page.goto(`/trips/${FAKE_ID}/generating`);
    await page.waitForLoadState('networkidle');
    const stageLabels = [
      /scanning memories/i,
      /identifying archetypes/i,
      /cross-referencing/i,
      /writing the lore/i,
      /scoring the chaos/i,
      /sealing the universe/i,
    ];
    let found = false;
    for (const pattern of stageLabels) {
      if (
        await page
          .getByText(pattern)
          .isVisible()
          .catch(() => false)
      ) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('renders % RECONSTRUCTED progress text', async ({ page }) => {
    await mockProcessingState(page);
    await page.goto(`/trips/${FAKE_ID}/generating`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/% reconstructed/i)).toBeVisible({ timeout: 10_000 });
  });

  test('renders USUALLY 2–5 MINUTES hint', async ({ page }) => {
    await mockProcessingState(page);
    await page.goto(`/trips/${FAKE_ID}/generating`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/usually 2.+minutes/i)).toBeVisible({ timeout: 10_000 });
  });

  test('renders stage progress dots', async ({ page }) => {
    await mockProcessingState(page);
    await page.goto(`/trips/${FAKE_ID}/generating`);
    await page.waitForLoadState('networkidle');
    // 6 stage dots are rendered as small divs inside the indicator row
    // They're identified by their fixed width/height transition style
    const dots = page.locator('.flex.items-center.justify-center.gap-2 > div');
    await expect(dots.first()).toBeVisible({ timeout: 10_000 });
    const count = await dots.count();
    expect(count).toBe(6); // STAGES.length
  });

  test('canvas particle background is rendered', async ({ page }) => {
    await mockProcessingState(page);
    await page.goto(`/trips/${FAKE_ID}/generating`);
    await page.waitForLoadState('networkidle');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10_000 });
  });
});

// ── Timeout state ─────────────────────────────────────────────────────────────
// We can't wait 4 real minutes in tests. Instead we inject a mock that
// manipulates the DOM by overriding setTimeout to fire immediately.

test.describe('Generating page — timeout state', () => {
  test.skip(!AUTH_COOKIE, 'Skipped: set PLAYWRIGHT_AUTH_COOKIE to run');

  test.beforeEach(async ({ context }) => {
    if (AUTH_COOKIE) await context.addCookies(JSON.parse(AUTH_COOKIE));
  });

  test('shows "Taking longer than expected" after timeout fires', async ({ page }) => {
    // Mock tRPC
    await page.route('**/api/trpc/trips.getFull**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            result: {
              data: {
                trip: { id: FAKE_ID, name: 'Test Trip', lore_status: 'processing', chaos_score: 0 },
                members: [],
                stats: [],
                eras: [],
                cover_photo: null,
              },
            },
          },
        ]),
      });
    });
    await page.route('**/realtime/**', route => route.abort());

    // Speed up the 4-minute timeout to 100ms via page injection
    await page.addInitScript(() => {
      const realSetTimeout = window.setTimeout;
      // @ts-ignore
      window.setTimeout = (fn: TimerHandler, delay?: number, ...args: unknown[]) => {
        // Collapse the 4-minute timeout to 100ms; leave short timeouts intact
        const adjusted = delay && delay > 10_000 ? 100 : delay;
        return realSetTimeout(fn, adjusted, ...args);
      };
    });

    await page.goto(`/trips/${FAKE_ID}/generating`);
    await expect(page.getByText(/taking longer than expected/i)).toBeVisible({ timeout: 5_000 });
  });

  test('"Go back & retry" button navigates to trip page', async ({ page }) => {
    await page.route('**/api/trpc/trips.getFull**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            result: {
              data: {
                trip: { id: FAKE_ID, name: 'Test Trip', lore_status: 'processing', chaos_score: 0 },
                members: [],
                stats: [],
                eras: [],
                cover_photo: null,
              },
            },
          },
        ]),
      });
    });
    await page.route('**/realtime/**', route => route.abort());

    await page.addInitScript(() => {
      const realSetTimeout = window.setTimeout;
      // @ts-ignore
      window.setTimeout = (fn: TimerHandler, delay?: number, ...args: unknown[]) => {
        const adjusted = delay && delay > 10_000 ? 100 : delay;
        return realSetTimeout(fn, adjusted, ...args);
      };
    });

    await page.goto(`/trips/${FAKE_ID}/generating`);
    const retryBtn = page.getByRole('button', { name: /go back.*retry/i });
    await expect(retryBtn).toBeVisible({ timeout: 5_000 });
    await retryBtn.click();
    await page.waitForURL(new RegExp(`/trips/${FAKE_ID}$`), { timeout: 10_000 });
    expect(page.url()).toContain(`/trips/${FAKE_ID}`);
  });
});
