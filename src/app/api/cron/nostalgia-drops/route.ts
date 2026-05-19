import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { LoreJson } from '@/lib/types';
import { logger } from '@/lib/logger';

// Runs monthly on the 1st at 10am UTC via Vercel Cron.
// For each user, finds trips generated 30–365 days ago and sends a "Remember when..." email.
export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const now = new Date();

  // Window: trips created 30–365 days ago (nostalgia sweet spot)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();

  // Find all ready trips with story_visible=true created in the nostalgia window.
  // Join trip_members to get user emails via profiles.
  const { data: candidates, error } = await (supabase as any)
    .from('trips')
    .select(
      `
      id, name, destination, lore_json, chaos_score, invite_code, trip_start_date, created_at,
      trip_members!inner(
        user_id,
        profiles:user_id(email, display_name)
      )
    `
    )
    .eq('lore_status', 'ready')
    .eq('story_visible', true)
    .gte('created_at', oneYearAgo)
    .lte('created_at', thirtyDaysAgo);

  if (error) {
    logger.error({ error: error.message }, 'nostalgia-drops query error');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!candidates || (candidates as any[]).length === 0) {
    return NextResponse.json({ sent: 0, message: 'No nostalgia candidates found' });
  }

  // Collect all (user_id, trip_id) pairs eligible for a nostalgia drop
  const eligible: Array<{ userId: string; trip: any; profile: any }> = [];
  for (const trip of candidates as any[]) {
    const members: any[] = trip.trip_members ?? [];
    for (const member of members) {
      const profile = member.profiles;
      if (!profile?.email) continue;
      eligible.push({ userId: member.user_id, trip, profile });
    }
  }

  if (eligible.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No eligible member-trip pairs' });
  }

  // Deduplicate check: find pairs that already received a nostalgia_drop this month
  // to avoid re-sending if cron runs more than once (safety net).
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data: alreadySent } = await (supabase as any)
    .from('scheduled_emails')
    .select('user_id, trip_id')
    .eq('email_type', 'nostalgia_drop')
    .not('sent_at', 'is', null)
    .gte('sent_at', monthStart);

  const sentKeys = new Set<string>(
    ((alreadySent as unknown as any[]) || []).map((r: any) => `${r.user_id}:${r.trip_id}`)
  );

  // Push fatigue: max 1 nostalgia email per user this month regardless of trip
  const { data: recentNostalgia } = await (supabase as any)
    .from('scheduled_emails')
    .select('user_id')
    .eq('email_type', 'nostalgia_drop')
    .not('sent_at', 'is', null)
    .gte('sent_at', monthStart);

  const usersEmailedThisMonth = new Set<string>(
    ((recentNostalgia as unknown as any[]) || []).map((r: any) => r.user_id)
  );

  // Filter out already-sent pairs and apply fatigue limit;
  // pick the highest chaos trip per user to maximise emotional resonance.
  const byUser = new Map<string, { userId: string; trip: any; profile: any }>();
  for (const item of eligible) {
    const key = `${item.userId}:${item.trip.id}`;
    if (sentKeys.has(key)) continue;
    if (usersEmailedThisMonth.has(item.userId)) continue;

    const existing = byUser.get(item.userId);
    const chaosScore = item.trip.chaos_score ?? 0;
    if (!existing || chaosScore > (existing.trip.chaos_score ?? 0)) {
      byUser.set(item.userId, item);
    }
  }

  const toSend = Array.from(byUser.values());
  if (toSend.length === 0) {
    return NextResponse.json({ sent: 0, message: 'All suppressed by fatigue / already sent' });
  }

  let sent = 0;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yaarlore.app';

  for (const { userId, trip, profile } of toSend) {
    if (!trip?.lore_json || !profile?.email) continue;

    const lore = trip.lore_json as LoreJson;
    const cookedLevel = lore.cooked_level ?? trip.chaos_score ?? 84;
    const storyUrl = `${origin}/t/${trip.invite_code}/story`;
    const name = profile.display_name || 'you';
    const tripDate = trip.trip_start_date ?? trip.created_at;
    const tripYear = tripDate ? new Date(tripDate).getFullYear() : new Date().getFullYear() - 1;
    const monthsAgo = Math.floor(
      (now.getTime() - new Date(trip.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000)
    );
    const timeLabel = monthsAgo <= 1 ? 'last month' : `${monthsAgo} months ago`;

    try {
      if (process.env.RESEND_API_KEY) {
        // Insert scheduled_emails row BEFORE sending so we have a record even on crash.
        // sent_at is set AFTER successful send — mirrors the anniversary cron pattern.
        const { data: emailRow, error: insertErr } = await (supabase as any)
          .from('scheduled_emails')
          .insert({
            trip_id: trip.id,
            user_id: userId,
            email_type: 'nostalgia_drop',
            send_at: now.toISOString(),
          })
          .select('id')
          .single();

        if (insertErr) {
          logger.warn(
            { email: profile.email, error: insertErr.message },
            'nostalgia-drops insert row failed'
          );
          continue;
        }

        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

        await resend.emails.send({
          from: `Yaarlore <${from}>`,
          to: profile.email,
          subject: `Remember ${trip.name}?`,
          html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a08;font-family:monospace;">
  <div style="max-width:480px;margin:0 auto;padding:48px 32px;">
    <p style="font-size:10px;letter-spacing:0.6em;text-transform:uppercase;color:rgba(255,77,77,0.5);margin:0 0 32px;">
      ● NOSTALGIA DROP · ${timeLabel.toUpperCase()}
    </p>

    <div style="background:#0e0e0c;border:1px solid rgba(255,77,77,0.15);border-radius:16px;padding:40px;text-align:center;margin-bottom:32px;">
      <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:rgba(245,240,232,0.3);margin:0 0 12px;">
        ${tripYear} — ${trip.destination ?? trip.name}
      </p>
      <h1 style="font-size:28px;font-weight:900;color:#F5F0E8;margin:0 0 8px;line-height:1.2;">
        ${lore.trip_title ?? trip.name}
      </h1>
      <p style="font-size:14px;font-style:italic;color:rgba(245,240,232,0.5);margin:0 0 24px;">
        &ldquo;${lore.tagline ?? ''}&rdquo;
      </p>
      <div style="font-size:64px;font-weight:900;color:#FF4D4D;line-height:1;margin:0 0 8px;">
        ${cookedLevel}
      </div>
      <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(255,77,77,0.7);margin:0;">
        ${lore.cooked_verdict ?? 'Historically Cooked'}
      </p>
    </div>

    <p style="font-size:14px;color:rgba(245,240,232,0.55);line-height:1.6;margin:0 0 8px;">
      ${name}, ${timeLabel} you and your crew wrote friendship mythology.
    </p>
    <p style="font-size:13px;color:rgba(245,240,232,0.35);line-height:1.6;margin:0 0 32px;font-style:italic;">
      &ldquo;${lore.closing_line ?? lore.cooked_verdict ?? ''}&rdquo;
    </p>

    <a href="${storyUrl}" style="display:block;background:rgba(255,77,77,0.12);border:1px solid rgba(255,77,77,0.4);color:rgba(255,77,77,0.9);text-align:center;padding:16px;border-radius:12px;font-size:11px;font-weight:bold;letter-spacing:0.35em;text-transform:uppercase;text-decoration:none;margin-bottom:32px;">
      RELIVE THE STORY →
    </a>

    <div style="border-top:1px solid rgba(245,240,232,0.05);padding-top:24px;">
      <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(245,240,232,0.15);margin:0;">
        YAARLORE · AI FRIENDSHIP ARCHIVE · ${tripYear}
      </p>
    </div>
  </div>
</body>
</html>`,
        });

        // Mark sent only after confirmed delivery
        const { error: claimError } = await (supabase as any)
          .from('scheduled_emails')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', (emailRow as any).id)
          .is('sent_at', null);

        if (claimError) {
          logger.warn(
            { rowId: (emailRow as any).id, error: claimError.message },
            'nostalgia-drops claim failed after send'
          );
        }
      } else {
        logger.info(
          { email: profile.email, tripName: trip.name },
          'Dry run: Would send nostalgia email'
        );
      }

      sent++;
    } catch (err) {
      logger.error(
        { email: profile.email, err: (err as Error).message },
        'nostalgia drop email sending failed'
      );
      // sent_at remains null — next month's run will retry if trip still in window
    }
  }

  logger.info({ sent, total: toSend.length }, 'nostalgia-drops cron run completed');
  return NextResponse.json({ sent, total: toSend.length });
}
