import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { LoreJson } from '@/lib/types';
import { logger } from '@/lib/logger';

// Runs daily at 6am UTC via Vercel Cron
// Sends:
//   • anniversary_1yr        — one year after trip_start_date
//   • first_week_followup    — 7 days after lore became ready (REL-07)
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

  const { data: due, error } = await (supabase as any)
    .from('scheduled_emails')
    .select(
      `
      id, trip_id, user_id, email_type,
      trips:trip_id(id, name, destination, lore_json, chaos_score, invite_code, trip_start_date, story_visible),
      profiles:user_id(email, display_name, username)
    `
    )
    .is('sent_at', null)
    .gte('send_at', windowStart)
    .lte('send_at', windowEnd);

  if (error) {
    logger.error({ error: error.message }, 'anniversaries query error');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No emails due today' });
  }

  // Push fatigue limit: max 1 anniversary email per user per 7-day window.
  // If a user has multiple emails in the same window, send the trip with
  // the highest chaos score only (the most emotionally resonant one).
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentlySent } = await (supabase as any)
    .from('scheduled_emails')
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
    logger.info({ skippedByFatigue }, 'anniversaries skipped due to push fatigue limit');
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
    const emailType: string = (row as any).email_type ?? 'anniversary_1yr';

    if (!trip?.lore_json || !profile?.email) continue;

    // first_week_followup: only send if the story is publicly visible
    if (emailType === 'first_week_followup' && !trip.story_visible) {
      // Mark as sent to prevent future retries — story not visible, nothing to share
      await (supabase as any)
        .from('scheduled_emails')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', (row as any).id)
        .is('sent_at', null);
      continue;
    }

    const lore = trip.lore_json as LoreJson;
    const cookedLevel = lore.cooked_level ?? trip.chaos_score ?? 84;
    const storyUrl = `${origin}/t/${trip.invite_code}/story`;
    const name = profile.display_name || 'you';
    const tripYear = trip.trip_start_date
      ? new Date(trip.trip_start_date).getFullYear()
      : new Date().getFullYear() - 1;

    // Build the invite / WhatsApp share URL for first_week_followup
    const inviteUrl = `${origin}/trips/join?code=${trip.invite_code}`;
    const whatsappText = encodeURIComponent(
      `Bhai dekh — our trip got turned into a full AI documentary 🎬\n${storyUrl}`
    );
    const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

    // Per-email-type HTML body
    const subjectAndHtml =
      emailType === 'first_week_followup'
        ? buildFirstWeekEmail({
            name,
            trip,
            lore,
            cookedLevel,
            storyUrl,
            inviteUrl,
            whatsappUrl,
            tripYear,
            origin,
          })
        : buildAnniversaryEmail({ name, trip, lore, cookedLevel, storyUrl, tripYear });

    try {
      if (process.env.RESEND_API_KEY) {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

        // REL-06: send FIRST, then mark sent — so a Resend failure leaves sent_at=null
        // and the next cron run will retry.
        await resend.emails.send({
          from: `Yaarlore <${from}>`,
          to: profile.email,
          subject: subjectAndHtml.subject,
          html: subjectAndHtml.html,
        });

        // Only mark sent AFTER confirmed delivery from Resend
        const { error: claimError } = await (supabase as any)
          .from('scheduled_emails')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', (row as any).id)
          .is('sent_at', null);

        if (claimError) {
          logger.warn(
            { rowId: (row as any).id, error: claimError.message },
            'anniversary row claim failed after send'
          );
        }
      } else {
        logger.info(
          { emailType, email: profile.email, tripName: trip.name },
          'Dry run: Would send anniversary email'
        );
      }

      sent++;
    } catch (err) {
      logger.error(
        { emailType, email: profile.email, err: (err as Error).message },
        'anniversary email sending failed'
      );
      // sent_at is NOT set — next cron run will retry within the 25-hour window
    }
  }

  logger.info(
    { sent, total: filtered.length, skippedByFatigue },
    'anniversaries cron run completed'
  );
  return NextResponse.json({ sent, total: filtered.length, skipped_fatigue: skippedByFatigue });
}

// ─── Email builders ────────────────────────────────────────────────────────────

interface EmailContext {
  name: string;
  trip: any;
  lore: LoreJson;
  cookedLevel: number;
  storyUrl: string;
  tripYear: number;
}

interface FirstWeekEmailContext extends EmailContext {
  inviteUrl: string;
  whatsappUrl: string;
  origin: string;
}

function buildAnniversaryEmail(ctx: EmailContext): { subject: string; html: string } {
  const { name, trip, lore, cookedLevel, storyUrl, tripYear } = ctx;
  return {
    subject: `One year ago, ${name} was ${lore.cooked_verdict?.toLowerCase() ?? 'historically cooked'} 🔥`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a08;font-family:monospace;">
  <div style="max-width:480px;margin:0 auto;padding:48px 32px;">
    <p style="font-size:10px;letter-spacing:0.6em;text-transform:uppercase;color:rgba(255,77,77,0.5);margin:0 0 32px;">
      &#11044; ONE YEAR ANNIVERSARY
    </p>

    <div style="background:#0e0e0c;border:1px solid rgba(255,77,77,0.15);border-radius:16px;padding:40px;text-align:center;margin-bottom:32px;">
      <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:rgba(245,240,232,0.3);margin:0 0 12px;">
        ${tripYear} &mdash; ${trip.name}
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
      RELIVE THE STORY &rarr;
    </a>

    <div style="border-top:1px solid rgba(245,240,232,0.05);padding-top:24px;">
      <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(245,240,232,0.15);margin:0;">
        YAARLORE &middot; AI FRIENDSHIP ARCHIVE &middot; ${tripYear + 1}
      </p>
    </div>
  </div>
</body>
</html>`,
  };
}

function buildFirstWeekEmail(ctx: FirstWeekEmailContext): { subject: string; html: string } {
  const { name, trip, lore, cookedLevel, storyUrl, whatsappUrl, tripYear } = ctx;
  return {
    subject: `🎬 Your trip is still live — have you shared it yet?`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a08;font-family:monospace;">
  <div style="max-width:480px;margin:0 auto;padding:48px 32px;">
    <p style="font-size:10px;letter-spacing:0.6em;text-transform:uppercase;color:rgba(255,77,77,0.5);margin:0 0 32px;">
      &#11044; YOUR LORE IS LIVE
    </p>

    <div style="background:#0e0e0c;border:1px solid rgba(255,77,77,0.15);border-radius:16px;padding:40px;text-align:center;margin-bottom:32px;">
      <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:rgba(245,240,232,0.3);margin:0 0 12px;">
        ${tripYear} &mdash; ${trip.name}
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
      ${name}, your crew&apos;s documentary dropped 7 days ago. Has everyone seen it?
    </p>
    <p style="font-size:13px;color:rgba(245,240,232,0.35);line-height:1.6;margin:0 0 32px;">
      Share the story &mdash; the chaos score, the verdicts, the memories. Your friends will lose it.
    </p>

    <!-- Primary CTA: view story -->
    <a href="${storyUrl}" style="display:block;background:#FF4D4D;color:#060604;text-align:center;padding:18px;border-radius:12px;font-size:11px;font-weight:bold;letter-spacing:0.35em;text-transform:uppercase;text-decoration:none;margin-bottom:12px;">
      VIEW THE STORY &rarr;
    </a>

    <!-- Secondary CTA: WhatsApp share -->
    <a href="${whatsappUrl}" style="display:block;background:rgba(37,211,102,0.1);border:1px solid rgba(37,211,102,0.3);color:rgba(37,211,102,0.85);text-align:center;padding:14px;border-radius:12px;font-size:11px;font-weight:bold;letter-spacing:0.3em;text-transform:uppercase;text-decoration:none;margin-bottom:32px;">
      &#128172; SHARE ON WHATSAPP
    </a>

    <div style="border-top:1px solid rgba(245,240,232,0.05);padding-top:24px;">
      <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(245,240,232,0.15);margin:0;">
        YAARLORE &middot; AI FRIENDSHIP ARCHIVE &middot; ${tripYear}
      </p>
    </div>
  </div>
</body>
</html>`,
  };
}
