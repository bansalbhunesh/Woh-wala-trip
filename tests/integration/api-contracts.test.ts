/**
 * API contract tests using direct handler invocation (Supertest-compatible pattern).
 * Tests the HTTP contract: correct status codes, response shapes, error formats.
 *
 * For true HTTP-level testing against a running server use:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/
 *
 * These tests run fully in Vitest (no server needed) by importing handlers directly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock dependencies ────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServiceClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/langfuse', () => ({
  traceSecurityEvent: vi.fn(),
  langfuse: {
    span: vi.fn(() => ({ end: vi.fn(), setMetadata: vi.fn() })),
    event: vi.fn(),
    flush: vi.fn(),
  },
}));

vi.mock('@/lib/anti-spam', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/anti-spam')>();
  return {
    ...original,
    // Override async Disify/Abstract/Kickbox calls for unit speed
    checkDisify: vi.fn().mockResolvedValue(null),
    checkAbstractAPI: vi.fn().mockResolvedValue(null),
    checkKickbox: vi.fn().mockResolvedValue(null),
  };
});

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockResolvedValue({ count: 0 }),
  insert: mockInsert,
  auth: {
    admin: {
      generateLink: vi.fn().mockResolvedValue({
        data: { properties: { email_otp: '87654321' } },
        error: null,
      }),
    },
  },
};

function makeReq(body: unknown, ip = '10.0.0.1') {
  return {
    json: async () => body,
    headers: {
      get: (k: string) => (k === 'x-forwarded-for' ? ip : null),
    },
  };
}

import { POST as sendOtp } from '@/app/api/auth/send-otp/route';

// ── Contract: POST /api/auth/send-otp ───────────────────────────────────

describe('Contract: POST /api/auth/send-otp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.gte.mockResolvedValue({ count: 0 });
    mockSupabase.auth.admin.generateLink.mockResolvedValue({
      data: { properties: { email_otp: '87654321' } },
      error: null,
    });
  });

  // ── 200 shape ──
  it('200: returns { success: true } for valid email', async () => {
    const res = await sendOtp(makeReq({ email: 'priya@gmail.com' }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ success: true });
  });

  // ── 400 shapes ──
  it('400: returns { error: string } for invalid format', async () => {
    const res = await sendOtp(makeReq({ email: 'badformat' }) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe('string');
    expect(body.error.length).toBeGreaterThan(0);
  });

  it('400: returns { error: string } for disposable email', async () => {
    const res = await sendOtp(makeReq({ email: 'x@mailinator.com' }) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/disposable|allowed/i);
  });

  it('400: returns { error: string } for missing email field', async () => {
    const res = await sendOtp(makeReq({}) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe('string');
  });

  it('400: returns { error: string } for null email', async () => {
    const res = await sendOtp(makeReq({ email: null }) as never);
    expect(res.status).toBe(400);
  });

  // ── 429 shape ──
  it('429: returns { error: string } when DB rate limit hit', async () => {
    mockSupabase.gte.mockResolvedValue({ count: 5 });
    const res = await sendOtp(makeReq({ email: 'real@gmail.com' }) as never);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/too many/i);
  });

  it('429: returns { error: string } when IP burst limit hit', async () => {
    // Exhaust IP bucket (10 req/min)
    const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const reqs = Array.from({ length: 11 }, () =>
      sendOtp(makeReq({ email: 'a@mailinator.com' }, ip) as never)
    );
    const results = await Promise.all(reqs);
    // Last request should be rate-limited OR blocked as disposable — either way ≥400
    const statuses = await Promise.all(results.map(r => r.status));
    expect(statuses.some(s => s === 429)).toBe(true);
  });

  // ── 500 shape ──
  it('500: returns { error: string } when Supabase admin fails', async () => {
    mockSupabase.auth.admin.generateLink.mockResolvedValue({
      data: null,
      error: { message: 'service down' },
    });
    const res = await sendOtp(makeReq({ email: 'real@gmail.com' }) as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(typeof body.error).toBe('string');
  });

  // ── Security: no OTP leakage ──
  it('200: response does NOT contain the raw OTP code', async () => {
    const res = await sendOtp(makeReq({ email: 'priya@gmail.com' }) as never);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain('87654321');
  });

  // ── Security: error messages don't leak internal info ──
  it('error messages are user-facing, not stack traces', async () => {
    const res = await sendOtp(makeReq({ email: 'bad' }) as never);
    const body = await res.json();
    expect(body.error).not.toMatch(/at Object\.|at async|TypeError|ReferenceError/);
  });
});

// ── Contract shapes: general API response format ─────────────────────────

describe('API response shape contracts', () => {
  it('success responses always have status 200-299', async () => {
    const res = await sendOtp(makeReq({ email: 'user@gmail.com' }) as never);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });

  it('error responses always have status 400+ and error field', async () => {
    const badCases = [
      makeReq({ email: '' }),
      makeReq({ email: 'notvalid' }),
      makeReq({ email: 'x@mailinator.com' }),
    ];
    for (const req of badCases) {
      const res = await sendOtp(req as never);
      expect(res.status).toBeGreaterThanOrEqual(400);
      const body = await res.json();
      expect(body).toHaveProperty('error');
    }
  });
});
