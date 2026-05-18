import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for checkRateLimit fail-hard behavior in production (SEC-05).
 *
 * Note: anti-spam.ts initializes `redis` at module load time using the env vars
 * present at that moment. These tests verify the production guard inside
 * checkRateLimit by stubbing NODE_ENV after module load. They require that
 * UPSTASH_REDIS_REST_URL is NOT set in the test environment.
 * If it is set (e.g., in CI with real Redis), these tests are skipped.
 */
describe('checkRateLimit — production fail-hard (SEC-05)', () => {
  const hasRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL);

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.skipIf(hasRedis)('throws when Redis is not configured in production', async () => {
    const { checkRateLimit } = await import('@/lib/anti-spam');
    await expect(checkRateLimit('test:127.0.0.1', 10, 60_000)).rejects.toThrow(
      'UPSTASH_REDIS_REST_URL'
    );
  });

  it.skipIf(hasRedis)('error message mentions the missing env var by name', async () => {
    const { checkRateLimit } = await import('@/lib/anti-spam');
    await expect(checkRateLimit('test:127.0.0.1', 10, 60_000)).rejects.toThrow(
      /UPSTASH_REDIS_REST_URL.*UPSTASH_REDIS_REST_TOKEN/
    );
  });
});

describe('checkRateLimit — development in-memory fallback', () => {
  const hasRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL);

  it.skipIf(hasRedis)(
    'returns a boolean (does not throw) in development without Redis',
    async () => {
      vi.stubEnv('NODE_ENV', 'development');
      const { checkRateLimit } = await import('@/lib/anti-spam');
      const result = await checkRateLimit('test:127.0.0.1', 10, 60_000);
      expect(typeof result).toBe('boolean');
      vi.unstubAllEnvs();
    }
  );
});
