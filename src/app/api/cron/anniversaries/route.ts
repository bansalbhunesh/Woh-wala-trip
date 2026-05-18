import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { LoreJson } from '@/lib/types';

// Runs daily at 6am UTC via Vercel Cron
// Sends anniversary emails for trips that hit their 1-year mark today
export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();

  // Find emails due today (within a 25-hour window to catch timezone drift)
  const now = new Date();
  const windowStart = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();

  const { data: due, error } = await supabase
    .from('scheduled_emails' as never)
    .select(
      `
      id, trip_id, user_id, email_type,
      trips:trip_id(id, name, destination, lore_json, chaos_score, invite_code, trip_start_date),
      profiles:user_id(email, display_name)
    `
    )
    .is('sent_at', null)
    .gte('send_at', windowStart)
    .lte('send_at', windowEnd);

  if (error) {
    console.error('[cron/anniversaries] query error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No anniversaries today' });
  }

  // Push fatigue limit: max 1 anniversary email per user per 7-day window.
  // If a user has multiple anniversaries in the same window, send the trip with
  // the highest chaos score only (the most emotionally resonant one).
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentlySent } = await supabase
    .from('scheduled_emails' as never)
    .select('user_id')
    .not('sent_at', 'is', null)
    .gte('sent_at', sevenDaysAgo);

  const recentUserIds = new Set<string>(
    ((recentlySent as unknown as any[]) || []).map((r: any) => r.user_id)
  );

  // Group due rows by user_id, keep only the highest chaos score per user
  const byUser = new Map<string, any>();
  for (const row of due as any[]) {
    const userId = (row as any).user_id;
    if (recentUserIds.has(userId)) continue; // fatigue limit hit
    const trip = (row as any).trips;
    const chaosScore = trip?.chaos_score ?? 0;
    const existing = byUser.get(userId);
    if (!existing || chaosScore > (existing.trips?.chaos_score ?? 0)) {
      byUser.set(userId, row);
    }
  }

  const filtered = Array.from(byUser.values());
  const skippedByFatigue = (due as any[]).length - filtered.length;
  if (skippedByFatigue > 0) {
    console.log(`[cron/anniversaries] skipped ${skippedByFatigue} rows (push fatigue limit)`);
  }

  if (filtered.length === 0) {
    return NextResponse.json({
      sent: 0,
      skipped: skippedByFatigue,
      message: 'All suppressed by fatigue limit',
    });
  }

  let sent = 0;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yaarlore.app';

  for (const row of filtered) {
    const trip = (row as any).trips;
    const profile = (row as any).profiles;
    if (!trip?.lore_json || !profile?.email) continue;

    const lore = trip.lore_json as LoreJson;
    const cookedLevel = lore.cooked_level ?? trip.chaos_score ?? 84;
    const storyUrl = `${origin}/t/${trip.invite_code}/story`;
    const name = profile.display_name || 'you';
    const tripYear = trip.trip_start_date
      ? new Date(trip.trip_start_date).getFullYear()
      : new Date().getFullYear() - 1;

    try {
      if (process.env.RESEND_API_KEY) {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

        // REL-06: send FIRST, then mark sent — so a Resend failure leaves sent_at=null
        // and the next cron run will retry. Accepted tradeoff: if the process crashes
        // between successful send and the UPDATE below, the email may be sent twice on
        // the next run (within the 25-hour window). Duplicate send is preferred over
        // silent email loss.
        await resend.emails.send({
          from: `Yaarlore <${from}>`,
          to: profile.email,
          subject: `One year ago, ${name} was ${lore.cooked_verdict?.toLowerCase() ?? 'historically cooked'} 🔥`,
          html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a08;font-family:monospace;">
  <div style="max-width:480px;margin:0 auto;padding:48px 32px;">
    <p style="font-size:10px;letter-spacing:0.6em;text-transform:uppercase;color:rgba(255,77,77,0.5);margin:0 0 32px;">
      ● ONE YEAR ANNIVERSARY
    </p>

    <div style="background:#0e0e0c;border:1px solid rgba(255,77,77,0.15);border-radius:16px;padding:40px;text-align:center;margin-bottom:32px;">
      <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:rgba(245,240,232,0.3);margin:0 0 12px;">
        ${tripYear} — ${trip.name}
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
      ${name}, one year ago you and your crew created friendship mythology.
    </p>
    <p style="font-size:13px;color:rgba(245,240,232,0.35);line-height:1.6;margin:0 0 32px;font-style:italic;">
      &ldquo;${lore.closing_line ?? lore.cooked_verdict ?? ''}&rdquo;
    </p>

    <a href="${storyUrl}" style="display:block;background:rgba(255,77,77,0.12);border:1px solid rgba(255,77,77,0.4);color:rgba(255,77,77,0.9);text-align:center;padding:16px;border-radius:12px;font-size:11px;font-weight:bold;letter-spacing:0.35em;text-transform:uppercase;text-decoration:none;margin-bottom:32px;">
      RELIVE THE STORY →
    </a>

    <div style="border-top:1px solid rgba(245,240,232,0.05);padding-top:24px;">
      <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(245,240,232,0.15);margin:0;">
        YAARLORE · AI FRIENDSHIP ARCHIVE · ${tripYear + 1}
      </p>
    </div>
  </div>
</body>
</html>`,
        });

        // Only mark sent AFTER confirmed delivery from Resend
        const { error: claimError } = await supabase
          .from('scheduled_emails' as never)
          .update({ sent_at: new Date().toISOString() } as never)
          .eq('id' as never, (row as any).id)
          .is('sent_at' as never, null);

        if (claimError) {
          console.log(
            `[anniversary] row ${(row as any).id} claim failed after send (duplicate possible):`,
            claimError.message
          );
        }
      } else {
        console.log(`[anniversary] Would send to ${profile.email} for trip: ${trip.name}`);
      }

      sent++;
    } catch (err) {
      console.error(`[anniversary] failed for ${profile.email}:`, err);
      // sent_at is NOT set — next cron run will retry within the 25-hour window
    }
  }

  console.log(
    `[cron/anniversaries] Sent ${sent}/${filtered.length} anniversary emails (${skippedByFatigue} suppressed by fatigue limit)`
  );
  return NextResponse.json({ sent, total: filtered.length, skipped_fatigue: skippedByFatigue });
}
