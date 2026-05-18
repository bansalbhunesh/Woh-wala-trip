import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isDisposableEmail,
  isValidEmailFormat,
  isRoleAccount,
  checkEmail,
  checkRateLimit,
  detectDomainTypo,
  computeFraudScore,
  logBlockedAttempt,
  getBlockLog,
  checkDisify,
  checkAbstractAPI,
  checkKickbox,
} from '@/lib/anti-spam';

// ── Format validation ────────────────────────────────────────────────────

describe('isValidEmailFormat', () => {
  const valid = [
    'user@example.com',
    'priya.sharma@gmail.com',
    'rohan+trips@outlook.com',
    'test@subdomain.co.in',
    'a@b.io',
  ];
  const invalid = ['', 'notanemail', '@missinglocal.com', 'missing@tld', 'spaces in@email.com'];
  valid.forEach(e => it(`accepts ${e}`, () => expect(isValidEmailFormat(e)).toBe(true)));
  invalid.forEach(e => it(`rejects "${e}"`, () => expect(isValidEmailFormat(e)).toBe(false)));
});

// ── Disposable domain blocklist ──────────────────────────────────────────

describe('isDisposableEmail', () => {
  const disposable = [
    'test@mailinator.com',
    'throw@guerrillamail.com',
    'anon@yopmail.com',
    'temp@10minutemail.com',
    'trash@trashmail.com',
    'fake@maildrop.cc',
    'anon@getnada.com',
    'user@spam4.me',
    'x@mailsac.com',
  ];
  const real = [
    'priya@gmail.com',
    'rohan@outlook.com',
    'user@yahoo.com',
    'dev@icloud.com',
    'test@proton.me',
    'me@fastmail.com',
  ];
  disposable.forEach(e =>
    it(`blocks disposable: ${e}`, () => expect(isDisposableEmail(e)).toBe(true))
  );
  real.forEach(e => it(`allows real: ${e}`, () => expect(isDisposableEmail(e)).toBe(false)));
  it('is case-insensitive', () => expect(isDisposableEmail('USER@MAILINATOR.COM')).toBe(true));
  it('returns false for no @', () => expect(isDisposableEmail('notanemail')).toBe(false));
});

// ── Typo detection ───────────────────────────────────────────────────────

describe('detectDomainTypo', () => {
  it('detects gmail.com typo (gmal.com)', () => {
    expect(detectDomainTypo('user@gmal.com')).toBe('gmail.com');
  });
  it('detects hotmail.com typo (hotmai.com)', () => {
    expect(detectDomainTypo('user@hotmai.com')).toBe('hotmail.com');
  });
  it('returns null for correct domain', () => {
    expect(detectDomainTypo('user@gmail.com')).toBeNull();
  });
  it('returns null for non-mainstream domain (no close match)', () => {
    expect(detectDomainTypo('user@company-internal.io')).toBeNull();
  });
});

// ── Role / system account detection ─────────────────────────────────────

describe('isRoleAccount', () => {
  const roleAccounts = [
    'admin@company.com',
    'abuse@isp.net',
    'noreply@service.io',
    'no-reply@app.com',
    'postmaster@domain.org',
    'webmaster@site.in',
    'support@example.com',
    'security@bank.com',
    'billing@saas.io',
    'donotreply@corp.com',
  ];
  const realAccounts = [
    'priya@gmail.com',
    'rohan.sharma@outlook.com',
    'user+tag@example.com',
    'contact-person@domain.com', // "contact" is a role but "contact-person" is not
  ];
  roleAccounts.forEach(e => it(`blocks role: ${e}`, () => expect(isRoleAccount(e)).toBe(true)));
  it('allows non-role real accounts', () => {
    realAccounts.slice(0, 3).forEach(e => expect(isRoleAccount(e)).toBe(false));
  });
  it('is case-insensitive', () => expect(isRoleAccount('ADMIN@company.com')).toBe(true));
  it('returns false for empty local part', () => expect(isRoleAccount('@domain.com')).toBe(false));
});

// ── Third-party API validators ───────────────────────────────────────────

describe('checkDisify', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns disposable=true when API reports disposable', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ format: true, disposable: true }),
    });
    const result = await checkDisify('test@mailinator.com');
    expect(result?.isDisposable).toBe(true);
    expect(result?.provider).toBe('disify');
  });

  it('returns null on network error', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
    const result = await checkDisify('user@gmail.com');
    expect(result).toBeNull();
  });

  it('returns null on non-ok response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false });
    expect(await checkDisify('user@gmail.com')).toBeNull();
  });
});

describe('checkAbstractAPI', () => {
  beforeEach(() => {
    vi.stubEnv('ABSTRACT_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns null when no API key', async () => {
    vi.unstubAllEnvs(); // remove key
    const result = await checkAbstractAPI('user@gmail.com');
    expect(result).toBeNull();
  });

  it('parses quality_score into riskScore', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        is_disposable_email: { value: false },
        is_valid_format: { value: true },
        quality_score: '0.85',
      }),
    });
    const result = await checkAbstractAPI('user@gmail.com');
    expect(result?.riskScore).toBeCloseTo(0.15, 2);
    expect(result?.isValid).toBe(true);
  });
});

describe('checkKickbox', () => {
  it('returns null when no API key', async () => {
    const result = await checkKickbox('user@gmail.com');
    expect(result).toBeNull();
  });
});

// ── Fraud score composition ──────────────────────────────────────────────

describe('computeFraudScore', () => {
  beforeEach(() => {
    // Stub fetch to avoid real network calls in unit tests
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('blocks invalid format immediately (score 100)', async () => {
    const result = await computeFraudScore('notanemail');
    expect(result.action).toBe('block');
    expect(result.fraudScore).toBe(100);
    expect(result.allowed).toBe(false);
  });

  it('blocks disposable domain locally (score 80)', async () => {
    const result = await computeFraudScore('user@mailinator.com');
    expect(result.action).toBe('block');
    expect(result.fraudScore).toBeGreaterThanOrEqual(80);
    expect(result.signals.disposableLocal).toBe(true);
  });

  it('allows clean real email', async () => {
    const result = await computeFraudScore('priya@gmail.com');
    expect(result.action).toBe('allow');
    expect(result.allowed).toBe(true);
    expect(result.signals.isRoleAccount).toBe(false);
  });

  it('blocks role account email (score 80)', async () => {
    const result = await computeFraudScore('admin@company.com');
    expect(result.action).toBe('block');
    expect(result.fraudScore).toBeGreaterThanOrEqual(80);
    expect(result.signals.isRoleAccount).toBe(true);
    expect(result.reason).toMatch(/role|system/i);
  });

  it('detects domain typo', async () => {
    const result = await computeFraudScore('user@gmal.com');
    expect(result.signals.typoSuggestion).toBe('gmail.com');
  });

  it('reports API results in signals', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ format: true, disposable: false }),
    });
    const result = await computeFraudScore('legit@example.com');
    // Disify returned disposable=false → still allowed
    expect(result.signals.disposableApi).toBe(false);
  });

  it('blocks when Disify reports disposable', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ format: true, disposable: true }),
    });
    const result = await computeFraudScore('anon@somesite.com');
    expect(result.action).toBe('block');
    expect(result.signals.disposableApi).toBe(true);
  });
});

// ── Blocked attempt logging ──────────────────────────────────────────────

describe('logBlockedAttempt', () => {
  it('adds entry to block log', () => {
    const before = getBlockLog().length;
    logBlockedAttempt('test@mailinator.com', 'disposable_local', 80);
    expect(getBlockLog().length).toBe(before + 1);
  });

  it('masks email address in log entry', () => {
    logBlockedAttempt('priya@mailinator.com', 'disposable_local', 80);
    const last = getBlockLog()[getBlockLog().length - 1];
    expect(last.email).toContain('***@');
    expect(last.email).not.toContain('priya');
  });

  it('records reason and score', () => {
    logBlockedAttempt('x@spam.com', 'test_reason', 42);
    const last = getBlockLog()[getBlockLog().length - 1];
    expect(last.reason).toBe('test_reason');
    expect(last.fraudScore).toBe(42);
  });
});

// ── Rate limiter ─────────────────────────────────────────────────────────
// Note: checkRateLimit is async (returns Promise<boolean>). Redis env vars are
// absent in the default test environment, so these tests exercise the in-memory
// fallback path. Fake timers are used to advance the window without real delays.

describe('checkRateLimit', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('allows first N requests', async () => {
    const key = `test-rl-${Math.random()}`;
    expect(await checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(await checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(await checkRateLimit(key, 3, 60_000)).toBe(true);
  });

  it('blocks on N+1 request within window', async () => {
    const key = `test-rl-${Math.random()}`;
    await checkRateLimit(key, 2, 60_000);
    await checkRateLimit(key, 2, 60_000);
    expect(await checkRateLimit(key, 2, 60_000)).toBe(false);
  });

  it('resets after window expires', async () => {
    const key = `test-rl-${Math.random()}`;
    await checkRateLimit(key, 1, 1_000);
    await checkRateLimit(key, 1, 1_000);
    vi.advanceTimersByTime(1_001);
    expect(await checkRateLimit(key, 1, 1_000)).toBe(true);
  });

  it('different keys are independent', async () => {
    await checkRateLimit('key-indep-a', 1, 60_000);
    await checkRateLimit('key-indep-a', 1, 60_000);
    expect(await checkRateLimit('key-indep-b', 1, 60_000)).toBe(true);
  });
});

// ── checkEmail (async facade) ────────────────────────────────────────────

describe('checkEmail', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns null for valid real email', async () => {
    expect(await checkEmail('rohan@gmail.com')).toBeNull();
  });

  it('returns error string for invalid format', async () => {
    expect(await checkEmail('notanemail')).toMatch(/invalid/i);
  });

  it('returns error string for disposable email', async () => {
    expect(await checkEmail('test@mailinator.com')).toMatch(/disposable/i);
  });

  it('handles empty string', async () => {
    expect(await checkEmail('')).toMatch(/invalid/i);
  });

  it('returns error string for role account email', async () => {
    expect(await checkEmail('admin@company.com')).toMatch(/role|system|personal/i);
  });
});
