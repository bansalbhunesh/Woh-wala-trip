import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CheckResult = { status: 'ok' | 'error'; latencyMs?: number; detail?: string };

export async function GET() {
  const checks: Record<string, CheckResult> = {};

  // 1. Supabase DB — probe with a lightweight single-row read.
  // Uses service role so the health check works even when RLS is locked down.
  try {
    const start = Date.now();
    const admin = createSupabaseServiceClient();
    await admin.from('profiles').select('id').limit(1);
    checks.supabase_db = { status: 'ok', latencyMs: Date.now() - start };
  } catch (e) {
    checks.supabase_db = { status: 'error', detail: String(e) };
  }

  // 2. AI Worker (Render) — hit the /health endpoint with a 3-second timeout.
  try {
    const start = Date.now();
    const workerUrl = process.env.AI_WORKER_URL;
    if (!workerUrl) {
      checks.ai_worker = { status: 'error', detail: 'AI_WORKER_URL not configured' };
    } else {
      const resp = await fetch(`${workerUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      checks.ai_worker = {
        status: resp.ok ? 'ok' : 'error',
        latencyMs: Date.now() - start,
        detail: resp.ok ? undefined : `HTTP ${resp.status}`,
      };
    }
  } catch (e) {
    checks.ai_worker = { status: 'error', detail: 'unreachable' };
  }

  // 3. Redis (Upstash) — ping via REST API with a 2-second timeout.
  try {
    const start = Date.now();
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!redisUrl || !redisToken) {
      checks.redis = { status: 'error', detail: 'not configured' };
    } else {
      const resp = await fetch(`${redisUrl}/ping`, {
        headers: { Authorization: `Bearer ${redisToken}` },
        signal: AbortSignal.timeout(2000),
      });
      checks.redis = {
        status: resp.ok ? 'ok' : 'error',
        latencyMs: Date.now() - start,
        detail: resp.ok ? undefined : `HTTP ${resp.status}`,
      };
    }
  } catch (e) {
    checks.redis = { status: 'error', detail: String(e) };
  }

  const allOk = Object.values(checks).every(c => c.status === 'ok');

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  );
}
