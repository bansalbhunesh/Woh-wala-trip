import { NextRequest, NextResponse } from 'next/server';

// REL-03: Stuck-pipeline recovery consolidated into the AI worker.
// ai-worker/src/lore/orchestrator.py:reset_stuck_pipelines() runs every ~30 minutes
// and uses a 30-minute cutoff (vs this cron's old 10-minute cutoff which could reset
// actively-running pipelines on large trips).
//
// This route is kept alive to satisfy the vercel.json cron declaration — removing a
// declared cron path causes a Vercel deployment error. The cron schedule (0 7 * * * —
// once daily at 7am UTC) means it fires at most once per day and returns immediately.
//
// Fallback note: if the Render worker crashes, reset_stuck_pipelines() won't run until
// the worker restarts (triggered by the next /generate-lore or poll event). On Render
// free tier, the dyno restarts within ~15 minutes of the next request. Trips stuck for
// longer than 30 min post-restart are recovered automatically. Acceptable pre-launch.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ noop: true, reason: 'consolidated_to_worker' });
}
