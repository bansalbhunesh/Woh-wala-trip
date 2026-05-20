// Public status page — no auth required.
export const dynamic = 'force-dynamic';

import Link from 'next/link';

export const metadata = {
  title: 'System Status — Yaarlore',
  description: 'Real-time status of Yaarlore services.',
};

type CheckResult = { status: 'ok' | 'error' | string; latencyMs?: number; detail?: string };
type HealthResponse = { status: string; checks: Record<string, CheckResult>; timestamp?: string };

// Keys match the actual /api/health response — verified in src/app/api/health/route.ts
const SERVICE_LABELS: Record<string, string> = {
  supabase_db: 'Database',
  ai_worker: 'AI Lore Engine',
  redis: 'Cache Layer',
  // Fallback for any additional checks added to /api/health in future
  storage: 'Photo Storage',
  auth: 'Authentication',
};

export default async function StatusPage() {
  let health: HealthResponse = { status: 'unknown', checks: {} };

  try {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      'http://localhost:3000';
    const res = await fetch(`${appUrl}/api/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    health = (await res.json()) as HealthResponse;
  } catch {
    health = {
      status: 'degraded',
      checks: { api: { status: 'error', detail: 'Health endpoint unreachable' } },
    };
  }

  const isOperational = health.status === 'ok';
  const checkedAt = health.timestamp ? new Date(health.timestamp) : new Date();

  return (
    <div
      className="min-h-screen"
      style={{ background: '#060604', color: '#F5F0E8', fontFamily: 'var(--font-mono, monospace)' }}
    >
      <div className="film-grain" />

      <header
        className="sticky top-0 z-20 flex items-center px-6 py-4"
        style={{
          borderBottom: '1px solid rgba(245,240,232,0.05)',
          background: 'rgba(6,6,4,0.85)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-[0.4em] transition-opacity hover:opacity-70"
          style={{ color: 'rgba(245,240,232,0.45)' }}
        >
          ← Back
        </Link>
        <span
          className="ml-auto font-mono text-[8px] uppercase tracking-[0.5em]"
          style={{ color: 'rgba(245,240,232,0.15)' }}
        >
          YAARLORE
        </span>
      </header>

      <main className="mx-auto max-w-xl px-6 py-16 pb-32">
        <div className="mb-12 space-y-3">
          <p
            className="font-mono text-[8px] uppercase tracking-[0.55em]"
            style={{ color: 'rgba(255,77,77,0.5)' }}
          >
            ● SYSTEM STATUS
          </p>
          <h1
            className="font-display font-black uppercase leading-[0.9] tracking-tighter"
            style={{ fontSize: 'clamp(36px, 7vw, 64px)', color: 'rgba(245,240,232,0.95)' }}
          >
            All Systems
          </h1>

          <div
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mt-2"
            style={{
              background: isOperational ? 'rgba(45,158,139,0.12)' : 'rgba(255,77,77,0.12)',
              border: `1px solid ${isOperational ? 'rgba(45,158,139,0.3)' : 'rgba(255,77,77,0.3)'}`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: isOperational ? '#2D9E8B' : '#FF4D4D',
                boxShadow: `0 0 8px ${isOperational ? 'rgba(45,158,139,0.8)' : 'rgba(255,77,77,0.8)'}`,
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            <span
              className="font-mono text-[9px] uppercase tracking-[0.35em]"
              style={{ color: isOperational ? '#2D9E8B' : '#FF4D4D' }}
            >
              {isOperational ? 'All Systems Operational' : 'Partial Outage Detected'}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {Object.entries(health.checks ?? {}).length > 0 ? (
            Object.entries(health.checks).map(([key, check]) => (
              <div
                key={key}
                className="flex items-center justify-between px-5 py-4 rounded-xl"
                style={{
                  background: 'rgba(245,240,232,0.03)',
                  border: '1px solid rgba(245,240,232,0.06)',
                }}
              >
                <span
                  className="font-mono text-[10px] uppercase tracking-wider"
                  style={{ color: 'rgba(245,240,232,0.7)' }}
                >
                  {SERVICE_LABELS[key] ?? key.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-3">
                  {check.latencyMs != null && (
                    <span
                      className="font-mono text-[9px]"
                      style={{ color: 'rgba(245,240,232,0.3)' }}
                    >
                      {check.latencyMs}ms
                    </span>
                  )}
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.3em]"
                    style={{ color: check.status === 'ok' ? '#2D9E8B' : '#FF4D4D' }}
                  >
                    {check.status === 'ok' ? '● Operational' : '● Degraded'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div
              className="px-5 py-8 rounded-xl text-center"
              style={{
                background: 'rgba(245,240,232,0.03)',
                border: '1px solid rgba(245,240,232,0.06)',
              }}
            >
              <p
                className="font-mono text-[9px] uppercase tracking-wider"
                style={{ color: 'rgba(245,240,232,0.3)' }}
              >
                No service data available
              </p>
            </div>
          )}
        </div>

        <p
          className="font-mono text-[8px] uppercase tracking-[0.4em] mt-10"
          style={{ color: 'rgba(245,240,232,0.2)' }}
        >
          Last checked: {checkedAt.toUTCString()}
        </p>

        <div
          className="mt-12 pt-8 space-y-2"
          style={{ borderTop: '1px solid rgba(245,240,232,0.06)' }}
        >
          <p
            className="font-mono text-[8px] uppercase tracking-[0.4em]"
            style={{ color: 'rgba(245,240,232,0.2)' }}
          >
            INCIDENT HISTORY
          </p>
          <p className="font-display italic text-sm" style={{ color: 'rgba(245,240,232,0.35)' }}>
            No incidents in the past 30 days.
          </p>
          <p className="font-mono text-[9px] mt-4" style={{ color: 'rgba(245,240,232,0.3)' }}>
            Report an issue:{' '}
            <a
              href="mailto:hello@yaarlore.app"
              className="underline underline-offset-2 hover:opacity-80"
              style={{ color: 'rgba(245,240,232,0.55)' }}
            >
              hello@yaarlore.app
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
