import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for signWorkerRequest HMAC-SHA256 signing helper (SEC-08).
 *
 * Signing payload format: "METHOD\nPATH\nTIMESTAMP\nBODY_SHA256"
 * where BODY_SHA256 is the lowercase hex SHA-256 of the raw request body string.
 */
describe('signWorkerRequest (SEC-08)', () => {
  beforeEach(() => {
    vi.stubEnv('AI_WORKER_HMAC_SECRET', 'test-secret-for-unit-tests-only');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('produces a 64-character lowercase hex signature', async () => {
    const { signWorkerRequest } = await import('@/lib/worker-auth');
    const { signature } = await signWorkerRequest('POST', '/generate-lore', '{"trip_id":"abc"}');
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces a positive integer timestamp string', async () => {
    const { signWorkerRequest } = await import('@/lib/worker-auth');
    const { timestamp } = await signWorkerRequest('POST', '/generate-lore', '{"trip_id":"abc"}');
    expect(parseInt(timestamp, 10)).toBeGreaterThan(0);
    expect(timestamp).toMatch(/^\d+$/);
  });

  it('timestamp is within 5 seconds of current Unix time', async () => {
    const { signWorkerRequest } = await import('@/lib/worker-auth');
    const before = Math.floor(Date.now() / 1000);
    const { timestamp } = await signWorkerRequest('POST', '/generate-lore', '{"trip_id":"abc"}');
    const after = Math.floor(Date.now() / 1000);
    const ts = parseInt(timestamp, 10);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after + 5);
  });

  it('produces different signatures for different bodies', async () => {
    const { signWorkerRequest } = await import('@/lib/worker-auth');
    const { signature: sig1 } = await signWorkerRequest(
      'POST',
      '/generate-lore',
      '{"trip_id":"abc"}'
    );
    const { signature: sig2 } = await signWorkerRequest(
      'POST',
      '/generate-lore',
      '{"trip_id":"xyz"}'
    );
    expect(sig1).not.toBe(sig2);
  });

  it('produces different signatures for different paths', async () => {
    const { signWorkerRequest } = await import('@/lib/worker-auth');
    const { signature: sig1 } = await signWorkerRequest(
      'POST',
      '/generate-lore',
      '{"trip_id":"abc"}'
    );
    const { signature: sig2 } = await signWorkerRequest(
      'POST',
      '/judge-battle',
      '{"trip_id":"abc"}'
    );
    expect(sig1).not.toBe(sig2);
  });

  it('throws when AI_WORKER_HMAC_SECRET is not set', async () => {
    vi.stubEnv('AI_WORKER_HMAC_SECRET', '');
    const { signWorkerRequest } = await import('@/lib/worker-auth');
    await expect(signWorkerRequest('POST', '/generate-lore', '{}')).rejects.toThrow(
      'AI_WORKER_HMAC_SECRET'
    );
  });

  it('signing payload format is METHOD\\nPATH\\nTIMESTAMP\\nBODY_SHA256', async () => {
    const { signWorkerRequest } = await import('@/lib/worker-auth');
    const body = '{"trip_id":"abc"}';
    const { signature, timestamp } = await signWorkerRequest('POST', '/generate-lore', body);

    // Independently compute the expected HMAC using Web Crypto API
    const secret = 'test-secret-for-unit-tests-only';

    const bodyBytes = new TextEncoder().encode(body);
    const bodyHashBuffer = await crypto.subtle.digest('SHA-256', bodyBytes);
    const bodyHash = Array.from(new Uint8Array(bodyHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const payload = `POST\n/generate-lore\n${timestamp}\n${bodyHash}`;
    const payloadBytes = new TextEncoder().encode(payload);

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const sigBuffer = await crypto.subtle.sign('HMAC', key, payloadBytes);
    const expectedSignature = Array.from(new Uint8Array(sigBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    expect(signature).toBe(expectedSignature);
  });
});
