# Lessons Learned / Engineering Guidelines

## 1. Type Safe Client-Level Casting over `as never`

- **Pattern**: When Supabase's automatically generated schemas mismatch runtime views, joins, or RPC formats, avoid casting single fields/parameters using `as never`.
- **Elegant Solution**: Cast the client instance once at retrieval: `(supabase as any).from('table_name')`. This avoids cluttering queries and respects standard API parameter types.

## 2. Structured Observability via Pino Logger

- **Pattern**: All background crons and API routes must write structured JSON log entries instead of using raw `console` methods.
- **Elegant Solution**: Import `logger` from `@/lib/logger` and pass a context object along with a clear log message:
  ```typescript
  logger.info({ userId, tripId }, 'Job processed successfully');
  logger.error({ userId, err: error.message }, 'Failed to compute updates');
  ```

## 3. High-Traffic Cache Warmups

- **Pattern**: To optimize LCP/TTI, public endpoints that run heavy queries (e.g., showcases, similarity searches) must query Upstash Redis first.
- **Elegant Solution**: Always reuse existing Redis client instances globally across request executions, falling back gracefully to in-memory maps only in local development environments.
