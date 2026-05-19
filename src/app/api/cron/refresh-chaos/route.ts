import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// Hourly cron — refreshes the chaos_distribution_cache materialized view.
// This prevents getChaosDistribution from doing a full `trips` table scan
// on every /trips page load (PERF-03 improvement).
// Vercel cron schedule: "0 * * * *"
export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createSupabaseServiceClient();

  // TYPE-02: refresh_chaos_distribution RPC not in generated types
  type RpcClient = {
    rpc: (fn: string) => Promise<{ error: { message: string } | null }>;
  };

  const { error } = await (admin as unknown as RpcClient).rpc('refresh_chaos_distribution');

  if (error) {
    logger.error({ error: error.message }, 'refresh-chaos RPC error');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logger.info('chaos_distribution_cache refreshed');
  return NextResponse.json({ refreshed: true, timestamp: new Date().toISOString() });
}
