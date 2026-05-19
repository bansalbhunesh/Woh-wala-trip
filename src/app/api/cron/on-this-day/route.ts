import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// Runs daily — finds trips that started exactly 1 year ago today
// and emits group_pulse_events for the "On This Day" feed.
// Vercel cron: add to vercel.json as "0 7 * * *"

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();

  // Find trips that started between 364-366 days ago (fuzzy year)
  const yearAgoStart = new Date();
  yearAgoStart.setFullYear(yearAgoStart.getFullYear() - 1);
  yearAgoStart.setDate(yearAgoStart.getDate() - 1);

  const yearAgoEnd = new Date();
  yearAgoEnd.setFullYear(yearAgoEnd.getFullYear() - 1);
  yearAgoEnd.setDate(yearAgoEnd.getDate() + 1);

  const { data: trips } = await supabase
    .from('trips')
    .select('id, name, destination, creator_id, lore_json, invite_code')
    .eq('lore_status', 'ready')
    .gte('trip_start_date', yearAgoStart.toISOString().slice(0, 10))
    .lte('trip_start_date', yearAgoEnd.toISOString().slice(0, 10));

  if (!trips?.length) {
    return NextResponse.json({ processed: 0, reason: 'no_anniversaries_today' });
  }

  let emitted = 0;

  for (const trip of trips) {
    // Get all members for visibility
    const { data: members } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', trip.id);

    const visibleTo = (members ?? []).map((m: any) => m.user_id as string);
    if (!visibleTo.length) continue;

    const lore = trip.lore_json as any;

    // Emit On This Day pulse event
    const { error } = await supabase.from('group_pulse_events' as never).insert({
      trip_id: trip.id,
      event_type: 'anniversary',
      actor_user_id: null,
      payload: {
        years_ago: 1,
        trip_name: trip.name,
        destination: trip.destination,
        tagline: lore?.tagline?.slice(0, 100) ?? null,
        chaos_score: lore?.cooked_level ?? null,
        verdict: lore?.cooked_verdict ?? null,
        invite_code: trip.invite_code,
      },
      visible_to: visibleTo,
    } as never);

    if (!error) emitted++;
  }

  return NextResponse.json({ processed: trips.length, emitted });
}
