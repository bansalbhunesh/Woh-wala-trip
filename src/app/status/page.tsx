// Public status page — no auth required.
// Fetches /api/health server-side on every request (cache: 'no-store').
export const dynamic = 'force-dynamic';

type CheckResult = {
  status: 'ok' | 'error' | string;
  latencyMs?: number;
  detail?: string;
};

type HealthResponse = {
  status: string;
  checks: Record<string, CheckResult>;
  timestamp?: string;
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
    // Health fetch failed — show degraded state
    health = {
      status: 'degraded',
      checks: { api: { status: 'error', detail: 'Health endpoint unreachable' } },
    };
  }

  const isOperational = health.status === 'ok';

  return (
    <main className="min-h-screen bg-black text-white p-8 font-mono">
      <h1 className="text-2xl font-bold mb-2">Yaarlore System Status</h1>
      <p className="text-zinc-400 text-sm mb-8">{new Date().toUTCString()}</p>

      <div
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 ${
          isOperational ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
        {isOperational ? 'All Systems Operational' : 'Degraded Performance'}
      </div>

      <div className="max-w-xl">
        {Object.entries(health.checks ?? {}).map(([service, check]) => (
          <div
            key={service}
            className="flex items-center justify-between border-b border-zinc-800 py-3"
          >
            <span className="capitalize">{service.replace(/_/g, ' ')}</span>
            <div className="flex items-center gap-3">
              {check.latencyMs != null && (
                <span className="text-zinc-500 text-xs">{check.latencyMs}ms</span>
              )}
              <span className={check.status === 'ok' ? 'text-green-400' : 'text-red-400'}>
                {check.status === 'ok' ? '● Operational' : '● Degraded'}
              </span>
            </div>
          </div>
        ))}

        {Object.keys(health.checks ?? {}).length === 0 && (
          <p className="text-zinc-500 text-sm py-4">No service checks available.</p>
        )}
      </div>

      <p className="text-zinc-600 text-xs mt-12">
        Last checked: {health.timestamp ?? new Date().toISOString()}
      </p>
    </main>
  );
}
