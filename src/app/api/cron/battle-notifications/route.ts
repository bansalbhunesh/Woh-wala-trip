import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// Processes scheduled_emails rows of type 'battle_challenge' and sends them via Resend.
// Runs every 5 minutes so challengers get near-instant notifications.
// Vercel cron schedule: "*/5 * * * *"
export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const now = new Date();

  // Fetch all unsent battle_challenge emails due now (or overdue)
  const { data: due, error } = await supabase
    .from('scheduled_emails' as never)
    .select(
      `
      id, trip_id, user_id, email_type,
      trips:trip_id(id, name, destination, invite_code),
      profiles:user_id(email, display_name)
    `
    )
    .eq('email_type' as never, 'battle_challenge')
    .is('sent_at' as never, null)
    .lte('send_at' as never, now.toISOString());

  if (error) {
    console.error('[cron/battle-notifications] query error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!due || (due as any[]).length === 0) {
    return NextResponse.json({ sent: 0, message: 'No pending battle notifications' });
  }

  let sent = 0;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yaarlore.app';

  for (const row of due as any[]) {
    const trip = row.trips;
    const profile = row.profiles;
    if (!trip || !profile?.email) continue;

    // Find the challenger trip: look for the most recent battle involving this trip as trip_b
    // (the challenged trip). The trip_a_id is the challenger.
    let challengerName = 'Another trip';
    try {
      const { data: battleRow } = await supabase
        .from('trip_vs_trip' as never)
        .select('trip_a_id, trip_a:trip_a_id(name)')
        .eq('trip_b_id' as never, trip.id)
        .order('created_at' as never, { ascending: false })
        .limit(1)
        .single();

      if (battleRow) {
        const tripA = (battleRow as any).trip_a;
        if (tripA?.name) challengerName = tripA.name;
      }
    } catch {
      // Non-fatal — use default challenger name
    }

    const name = profile.display_name || 'Yaar';
    const storyUrl = `${origin}/t/${trip.invite_code}/story`;

    try {
      if (process.env.RESEND_API_KEY) {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

        await resend.emails.send({
          from: `Yaarlore <${from}>`,
          to: profile.email,
          subject: `Your trip was just challenged`,
          html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a08;font-family:monospace;">
  <div style="max-width:480px;margin:0 auto;padding:48px 32px;">
    <p style="font-size:10px;letter-spacing:0.6em;text-transform:uppercase;color:rgba(255,77,77,0.5);margin:0 0 32px;">
      ● BATTLE CHALLENGE
    </p>

    <div style="background:#0e0e0c;border:1px solid rgba(255,77,77,0.25);border-radius:16px;padding:40px;text-align:center;margin-bottom:32px;">
      <div style="font-size:48px;margin:0 0 16px;">&#x2694;&#xFE0F;</div>
      <h1 style="font-size:24px;font-weight:900;color:#F5F0E8;margin:0 0 12px;line-height:1.2;">
        ${name}, your trip just got challenged.
      </h1>
      <p style="font-size:14px;color:rgba(245,240,232,0.5);margin:0 0 8px;">
        <strong style="color:#FF4D4D;">${challengerName}</strong> thinks they&apos;re more cooked than
        <strong style="color:#F5F0E8;">${trip.name}</strong>.
      </p>
      <p style="font-size:13px;font-style:italic;color:rgba(245,240,232,0.35);margin:0;">
        The battle is on. Go defend your legacy.
      </p>
    </div>

    <a href="${storyUrl}" style="display:block;background:rgba(255,77,77,0.12);border:1px solid rgba(255,77,77,0.4);color:rgba(255,77,77,0.9);text-align:center;padding:16px;border-radius:12px;font-size:11px;font-weight:bold;letter-spacing:0.35em;text-transform:uppercase;text-decoration:none;margin-bottom:32px;">
      VIEW YOUR TRIP →
    </a>

    <div style="border-top:1px solid rgba(245,240,232,0.05);padding-top:24px;">
      <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(245,240,232,0.15);margin:0;">
        YAARLORE · AI FRIENDSHIP ARCHIVE
      </p>
    </div>
  </div>
</body>
</html>`,
        });

        // Mark sent AFTER confirmed delivery
        const { error: claimError } = await supabase
          .from('scheduled_emails' as never)
          .update({ sent_at: new Date().toISOString() } as never)
          .eq('id' as never, (row as any).id)
          .is('sent_at' as never, null);

        if (claimError) {
          console.warn(
            `[battle-notifications] claim failed for row ${(row as any).id}:`,
            claimError.message
          );
        }
      } else {
        console.log(
          `[battle-notifications] Would send to ${profile.email} — "${challengerName}" challenged "${trip.name}"`
        );
      }

      sent++;
    } catch (err) {
      console.error(`[battle-notifications] failed for ${profile.email}:`, err);
      // sent_at remains null — next cron run will retry
    }
  }

  console.log(`[cron/battle-notifications] Sent ${sent}/${(due as any[]).length} battle emails`);
  return NextResponse.json({ sent, total: (due as any[]).length });
}
