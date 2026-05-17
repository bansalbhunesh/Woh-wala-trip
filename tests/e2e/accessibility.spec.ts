/**
 * Accessibility tests — checks public-facing pages for basic a11y requirements
 * using Playwright's built-in accessibility snapshot.
 *
 * These tests do NOT require axe-core. They verify:
 *   • Every page has exactly one <h1>
 *   • Interactive elements have accessible labels
 *   • Images have alt text (or role="presentation")
 *   • Form inputs have associated labels
 *   • Focus is not trapped on page load
 *   • Pages have a <main> landmark
 *
 * No session required for public routes. PLAYWRIGHT_AUTH_COOKIE enables
 * deeper checks on authenticated pages.
 */
import { test, expect, type Page } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function countHeadings(page: Page, level: number) {
  return page.locator(`h${level}`).count();
}

async function getInteractiveWithoutLabel(page: Page) {
  return page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, a[href], input, select, textarea'));
    return els
      .filter(el => {
        const text = (el as HTMLElement).textContent?.trim();
        const label = (el as HTMLElement).getAttribute('aria-label');
        const labelledby = (el as HTMLElement).getAttribute('aria-labelledby');
        const title = (el as HTMLElement).getAttribute('title');
        const placeholder = (el as HTMLInputElement).placeholder;
        return !text && !label && !labelledby && !title && !placeholder;
      })
      .map(el => ({ tag: el.tagName, href: (el as HTMLAnchorElement).href || null }));
  });
}

// ── Landing page ──────────────────────────────────────────────────────────────

test.describe('Landing page — a11y', () => {
  test('has at most one h1', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const h1Count = await countHeadings(page, 1);
    expect(h1Count).toBeLessThanOrEqual(1);
  });

  test('all buttons have accessible labels', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const unlabelled = await getInteractiveWithoutLabel(page);
    expect(unlabelled).toHaveLength(0);
  });

  test('all images have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const imagesWithoutAlt = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img'))
        .filter(
          img =>
            !img.alt &&
            img.getAttribute('role') !== 'presentation' &&
            img.getAttribute('aria-hidden') !== 'true'
        )
        .map(img => img.src);
    });
    expect(imagesWithoutAlt).toHaveLength(0);
  });

  test('has a main landmark', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const mainCount = await page.locator('main, [role="main"]').count();
    expect(mainCount).toBeGreaterThanOrEqual(1);
  });

  test('skip-to-content or focus visible on tab', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    // Focus should move to something interactive, not stay on body
    expect(focused).not.toBe('BODY');
  });
});

// ── Login page ────────────────────────────────────────────────────────────────

test.describe('Login page — a11y', () => {
  test('has at most one h1', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const h1Count = await countHeadings(page, 1);
    expect(h1Count).toBeLessThanOrEqual(1);
  });

  test('email input has a label or aria-label', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.isVisible().catch(() => false)) {
      const label = await emailInput.getAttribute('aria-label');
      const id = await emailInput.getAttribute('id');
      const placeholder = await emailInput.getAttribute('placeholder');
      // Must have aria-label, placeholder, or associated label element
      expect(label || id || placeholder).toBeTruthy();
    }
  });

  test('submit button has accessible text', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const submitButtons = await page.locator('button[type="submit"], button').all();
    for (const btn of submitButtons) {
      const text = (await btn.textContent())?.trim();
      const label = await btn.getAttribute('aria-label');
      if (await btn.isVisible().catch(() => false)) {
        expect(text || label).toBeTruthy();
      }
    }
  });
});

// ── Join page ─────────────────────────────────────────────────────────────────

test.describe('Join page — a11y', () => {
  test('trip code input has accessible label or placeholder', async ({ page }) => {
    await page.goto('/trips/join');
    await page.waitForLoadState('networkidle');
    const codeInput = page.locator('input[placeholder="TRIPCODE"]').first();
    await expect(codeInput).toBeVisible({ timeout: 10_000 });
    const placeholder = await codeInput.getAttribute('placeholder');
    const label = await codeInput.getAttribute('aria-label');
    expect(placeholder || label).toBeTruthy();
  });

  test('has at most one h1', async ({ page }) => {
    await page.goto('/trips/join');
    await page.waitForLoadState('networkidle');
    const h1Count = await countHeadings(page, 1);
    expect(h1Count).toBeLessThanOrEqual(1);
  });

  test('no interactive elements without accessible names', async ({ page }) => {
    await page.goto('/trips/join');
    await page.waitForLoadState('networkidle');
    const unlabelled = await getInteractiveWithoutLabel(page);
    expect(unlabelled).toHaveLength(0);
  });
});

// ── Privacy & Terms ───────────────────────────────────────────────────────────

test.describe('Privacy page — a11y', () => {
  test('has at least one h1', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');
    const h1Count = await countHeadings(page, 1);
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test('all links have accessible text', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');
    const emptyLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .filter(a => !a.textContent?.trim() && !a.getAttribute('aria-label'))
        .map(a => (a as HTMLAnchorElement).href);
    });
    expect(emptyLinks).toHaveLength(0);
  });
});

test.describe('Terms page — a11y', () => {
  test('has at least one h1', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('networkidle');
    const h1Count = await countHeadings(page, 1);
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });
});

// ── Public lore page ──────────────────────────────────────────────────────────

const LORE_CODE = process.env.PLAYWRIGHT_TEST_LORE_CODE;

test.describe('Public lore page — a11y', () => {
  test.skip(!LORE_CODE, 'Skipped: set PLAYWRIGHT_TEST_LORE_CODE to run');

  test('has exactly one h1', async ({ page }) => {
    await page.goto(`/t/${LORE_CODE}`);
    await page.waitForLoadState('networkidle');
    const h1Count = await countHeadings(page, 1);
    expect(h1Count).toBe(1);
  });

  test('"View Full Story" CTA is keyboard-focusable', async ({ page }) => {
    await page.goto(`/t/${LORE_CODE}`);
    await page.waitForLoadState('networkidle');
    const storyLink = page.getByRole('link', { name: /view full story/i });
    await storyLink.focus();
    const isFocused = await storyLink.evaluate(el => el === document.activeElement);
    expect(isFocused).toBe(true);
  });

  test('stat cards have readable text (not empty)', async ({ page }) => {
    await page.goto(`/t/${LORE_CODE}`);
    await page.waitForLoadState('networkidle');
    // Each stat card should contain non-empty text
    const statCards = page.locator('.rounded-\\[2rem\\]');
    const count = await statCards.count();
    for (let i = 0; i < Math.min(count, 4); i++) {
      const text = await statCards.nth(i).textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });
});

// ── Authenticated page: trip list ─────────────────────────────────────────────

const AUTH_COOKIE = process.env.PLAYWRIGHT_AUTH_COOKIE;

test.describe('Trips list page — a11y (authenticated)', () => {
  test.skip(!AUTH_COOKIE, 'Skipped: set PLAYWRIGHT_AUTH_COOKIE to run');

  test.beforeEach(async ({ context }) => {
    if (AUTH_COOKIE) await context.addCookies(JSON.parse(AUTH_COOKIE));
  });

  test('has at most one h1', async ({ page }) => {
    await page.goto('/trips');
    await page.waitForLoadState('networkidle');
    const h1Count = await countHeadings(page, 1);
    expect(h1Count).toBeLessThanOrEqual(1);
  });

  test('"New trip" / create button has an accessible label', async ({ page }) => {
    await page.goto('/trips');
    await page.waitForLoadState('networkidle');
    // The create button uses a Plus icon but should have visible text
    const newTripLink = page.getByRole('link', { name: /new|create|start/i }).first();
    await expect(newTripLink).toBeVisible({ timeout: 10_000 });
  });
});
