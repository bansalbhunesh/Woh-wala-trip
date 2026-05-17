/**
 * Integration tests for /api/auth/send-otp route.
 * These run via Vitest with mocked Supabase and Resend.
 * They test the full handler logic without a real HTTP server.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase service client before importing the route
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
    checkDisify: vi.fn().mockResolvedValue(null),
    checkAbstractAPI: vi.fn().mockResolvedValue(null),
    checkKickbox: vi.fn().mockResolvedValue(null),
  };
});

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockResolvedValue({ count: 0 }),
  auth: {
    admin: {
      generateLink: vi.fn().mockResolvedValue({
        data: { properties: { email_otp: '12345678' } },
        error: null,
      }),
    },
  },
};

// Mock NextRequest
function makeRequest(body: unknown, ip = '127.0.0.1') {
  return {
    json: async () => body,
    headers: {
      get: (key: string) => (key === 'x-forwarded-for' ? ip : null),
    },
  };
}

import { POST } from '@/app/api/auth/send-otp/route';

describe('POST /api/auth/send-otp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.gte.mockResolvedValue({ count: 0 });
    mockSupabase.auth.admin.generateLink.mockResolvedValue({
      data: { properties: { email_otp: '12345678' } },
      error: null,
    });
  });

  it('returns 200 for valid real email', async () => {
    const req = makeRequest({ email: 'priya@gmail.com' });
    const res = await POST(req as never);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('returns 400 for invalid email format', async () => {
    const req = makeRequest({ email: 'notanemail' });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy(); // format or fraud message
  });

  it('returns 400 for disposable email', async () => {
    const req = makeRequest({ email: 'test@mailinator.com' });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/disposable|allowed/i);
  });

  it('returns 400 for missing email', async () => {
    const req = makeRequest({});
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 429 when DB rate limit exceeded (≥5 in 15 min)', async () => {
    mockSupabase.gte.mockResolvedValue({ count: 5 });
    const req = makeRequest({ email: 'priya@gmail.com' });
    const res = await POST(req as never);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/too many/i);
  });

  it('returns 500 when Supabase generateLink fails', async () => {
    mockSupabase.auth.admin.generateLink.mockResolvedValue({
      data: null,
      error: { message: 'rate limit exceeded' },
    });
    const req = makeRequest({ email: 'priya@gmail.com' });
    const res = await POST(req as never);
    expect(res.status).toBe(500);
  });

  it('does not call generateLink for disposable emails', async () => {
    const req = makeRequest({ email: 'spam@yopmail.com' });
    await POST(req as never);
    expect(mockSupabase.auth.admin.generateLink).not.toHaveBeenCalled();
  });

  it('stores hashed OTP in DB on success', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.insert = insertMock;
    const req = makeRequest({ email: 'rohan@gmail.com' });
    await POST(req as never);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ email: 'rohan@gmail.com' }));
  });
});
