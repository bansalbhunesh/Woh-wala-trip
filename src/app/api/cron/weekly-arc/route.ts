import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

// Runs every Monday — generates character arc updates for active users
// (users who have 2+ trips documented in user_identity_snapshots).
// These updates drive weekly return visits.

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Monday of current week
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekOf = monday.toISOString().slice(0, 10);

  // Find users with 2+ identity snapshots who don't have an arc update this week
  const { data: eligibleUsers } = await supabase
    .from('user_identity_snapshots' as never)
    .select('user_id')
    .order('user_id');

  if (!eligibleUsers?.length) {
    return NextResponse.json({ processed: 0 });
  }

  // Count per user
  const userCounts: Record<string, number> = {};
  for (const row of eligibleUsers as any[]) {
    userCounts[row.user_id] = (userCounts[row.user_id] ?? 0) + 1;
  }
  const activeUsers = Object.entries(userCounts)
    .filter(([, count]) => count >= 2)
    .map(([uid]) => uid);

  // Skip users who already have an arc for this week
  const { data: existingArcs } = await supabase
    .from('character_arc_updates' as never)
    .select('user_id')
    .eq('week_of', weekOf)
    .in('user_id' as never, activeUsers);

  const existingSet = new Set(((existingArcs as any[]) ?? []).map((a: any) => a.user_id));
  const toProcess = activeUsers.filter(uid => !existingSet.has(uid)).slice(0, 100); // cap at 100/run

  let processed = 0;

  for (const userId of toProcess) {
    try {
      // Fetch snapshots
      const { data: snaps } = await supabase
        .from('user_identity_snapshots' as never)
        .select('archetype, chaos_rating, role_title, snapshot_at')
        .eq('user_id', userId)
        .order('snapshot_at', { ascending: true });

      const snapList = (snaps as any[]) ?? [];
      if (snapList.length < 2) continue;

      // Fetch display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single();
      const name = (profile as any)?.display_name ?? 'you';

      // Compute metrics
      const recent = snapList.slice(-3);
      const avgChaos = recent.reduce((s: number, n: any) => s + n.chaos_rating, 0) / recent.length;
      const firstChaos = snapList[0].chaos_rating as number;
      const lastChaos = snapList[snapList.length - 1].chaos_rating as number;
      const trajectory =
        avgChaos > firstChaos + 1 ? 'rising' : avgChaos < firstChaos - 1 ? 'falling' : 'stable';
      const chaosDelta = Math.round((lastChaos - firstChaos) * 10) / 10;

      const archetypeCounts: Record<string, number> = {};
      for (const s of snapList) {
        archetypeCounts[s.archetype] = (archetypeCounts[s.archetype] ?? 0) + 1;
      }
      const dominant = Object.entries(archetypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const arcPct = Math.min(
        100,
        Math.round(
          (snapList.length / 5) * 40 +
            ((archetypeCounts[dominant] ?? 0) / snapList.length) * 40 +
            (trajectory !== 'stable' ? 20 : 0)
        )
      );

      const historyStr = snapList
        .map((s: any, i: number) => `Trip ${i + 1}: ${s.archetype}, chaos ${s.chaos_rating}/10`)
        .join('\n');

      // Generate narrative with Haiku (cheap, fast)
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-20241022',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Write a 2-3 sentence character arc update for "${name}" based on their documented trip mythology.

Trip history:
${historyStr}

Dominant archetype: ${dominant}
Chaos trajectory: ${trajectory} (${chaosDelta > 0 ? '+' : ''}${chaosDelta} across ${snapList.length} trips)
Arc definition: ${arcPct}%

Write in second person, conversational, slightly roasty but affectionate. Internet-native. Reference the specific archetype changes if any. Don't use em-dashes. Keep it under 80 words.`,
          },
        ],
      });

      const narrative = (msg.content[0] as any).text as string;

      // Store arc update
      await supabase.from('character_arc_updates' as never).upsert(
        {
          user_id: userId,
          week_of: weekOf,
          narrative,
          archetype_current: dominant,
          chaos_trajectory: trajectory,
          chaos_delta: chaosDelta,
          trip_count: snapList.length,
          arc_pct: arcPct,
        } as never,
        { onConflict: 'user_id,week_of' }
      );

      // Emit pulse event for this user (self-visible only — personal update)
      await supabase.from('group_pulse_events' as never).insert({
        trip_id: null as never, // system event, no specific trip
        event_type: 'lore_generated',
        actor_user_id: null,
        payload: {
          type: 'arc_update',
          archetype: dominant,
          trajectory,
          arc_pct: arcPct,
          preview: narrative.slice(0, 80),
        },
        visible_to: [userId],
      } as never);

      processed++;
    } catch (e) {
      // Non-fatal — continue to next user
      console.error(`[weekly-arc] failed for ${userId}:`, e);
    }
  }

  return NextResponse.json({ processed, weekOf, total_eligible: toProcess.length });
}
