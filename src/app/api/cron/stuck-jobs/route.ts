import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// Runs every 15 minutes via Vercel Cron.
// Resets trips stuck in 'processing' for > 10 minutes back to 'failed'
// so users can retry. Requires the `processing_started_at` column on the trips table
// (see supabase/migrations/001_add_processing_started_at.sql).
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: stuck, error } = await supabase
    .from('trips')
    .update({ lore_status: 'failed', processing_started_at: null } as never)
    .eq('lore_status', 'processing')
    .lt('processing_started_at' as never, cutoff)
    .select('id, name');

  if (error) {
    console.error('[stuck-jobs] query error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const reset = (stuck as Array<{ id: string; name: string }> | null) ?? [];
  if (reset.length > 0) {
    console.log(
      `[stuck-jobs] reset ${reset.length} stuck trips:`,
      reset.map(t => t.name).join(', ')
    );
  }

  return NextResponse.json({
    reset: reset.length,
    trips: reset.map(t => ({ id: t.id, name: t.name })),
  });
}
