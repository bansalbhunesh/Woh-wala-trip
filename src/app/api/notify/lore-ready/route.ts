import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// Called by the AI worker when lore generation completes.
// Sends a push notification email via Resend to the trip creator.
// Auth: AI_WORKER_SECRET bearer token (same pattern as /generate-lore)

export async function POST(req: NextRequest) {
  // Verify AI worker bearer token
  const auth = req.headers.get('authorization');
  const secret = process.env.AI_WORKER_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let trip_id: string | undefined;
  try {
    const body = await req.json();
    trip_id = body?.trip_id;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!trip_id || typeof trip_id !== 'string') {
    return NextResponse.json({ error: 'trip_id is required' }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceClient();

    // Fetch trip + creator email in one join
    const { data: trip, error: tripError } = await supabase
      .from('trips' as never)
      .select('id, name, destination, tagline, created_by')
      .eq('id' as never, trip_id)
      .single();

    if (tripError || !trip) {
      console.error('[lore-ready] trip lookup failed:', tripError?.message);
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Resolve creator email via Supabase admin
    const { data: userResp, error: userError } = await supabase.auth.admin.getUserById(
      (trip as any).created_by
    );
    if (userError || !userResp?.user?.email) {
      console.error('[lore-ready] user lookup failed:', userError?.message);
      // Non-fatal — we simply have no address to mail
      return NextResponse.json({ sent: false, reason: 'no_email' });
    }

    const toEmail = userResp.user.email;
    const tripName = (trip as any).name ?? 'Your trip';
    const tagline = (trip as any).tagline ?? null;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://yaarlore.com';
    const tripUrl = `${siteUrl}/trips/${trip_id}`;

    // Send via Resend — fail gracefully so the pipeline never crashes
    if (process.env.RESEND_API_KEY) {
      try {
        await sendLoreReadyEmail(toEmail, tripName, tagline, tripUrl);
      } catch (emailErr) {
        console.error('[lore-ready] Resend send failed (non-fatal):', emailErr);
        return NextResponse.json({ sent: false, reason: 'resend_error' });
      }
    } else {
      // Dev fallback
      console.log(
        `\n[lore-ready] DEV — would email ${toEmail}: "${tripName}" lore ready → ${tripUrl}\n`
      );
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    // Never propagate errors back — this must never crash the worker pipeline
    console.error('[lore-ready] unexpected error (non-fatal):', err);
    return NextResponse.json({ sent: false, reason: 'internal_error' });
  }
}

async function sendLoreReadyEmail(
  to: string,
  tripName: string,
  tagline: string | null,
  tripUrl: string
) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

  const taglineBlock = tagline
    ? `
    <div style="background:#0e0e0c;border:1px solid rgba(255,77,77,0.15);border-radius:12px;padding:24px 28px;margin:24px 0;">
      <p style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:rgba(245,240,232,0.3);margin:0 0 12px;">
        YOUR TAGLINE
      </p>
      <p style="font-size:15px;font-style:italic;color:rgba(245,240,232,0.85);margin:0;line-height:1.6;">
        &ldquo;${tagline}&rdquo;
      </p>
    </div>`
    : '';

  await resend.emails.send({
    from: `Yaarlore <${from}>`,
    to,
    subject: `Your trip lore is ready! 🎬`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a08;">
  <div style="max-width:480px;margin:0 auto;padding:48px 32px;font-family:monospace;">
    <p style="font-size:10px;letter-spacing:0.6em;text-transform:uppercase;color:rgba(255,77,77,0.5);margin:0 0 32px;">
      ● LORE ENGINE · TRANSMISSION COMPLETE
    </p>
    <h1 style="font-size:32px;font-weight:900;letter-spacing:-0.02em;color:#F5F0E8;margin:0 0 8px;line-height:1.1;text-transform:uppercase;">
      ${tripName}
    </h1>
    <p style="font-size:13px;color:rgba(245,240,232,0.55);margin:0 0 24px;">
      Your cinematic trip documentary is ready.
    </p>
    ${taglineBlock}
    <a href="${tripUrl}"
       style="display:block;width:100%;box-sizing:border-box;padding:18px 0;border-radius:999px;background:#F5F0E8;color:#060604;text-align:center;font-size:11px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;text-decoration:none;margin:24px 0;">
      OPEN YOUR ARCHIVE →
    </a>
    <p style="font-size:11px;color:rgba(245,240,232,0.25);line-height:1.6;margin:0;">
      Your crew is waiting. Share the lore.
    </p>
    <div style="border-top:1px solid rgba(245,240,232,0.05);padding-top:24px;margin-top:32px;">
      <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(245,240,232,0.15);margin:0;">
        YAARLORE · AI FRIENDSHIP ARCHIVE · SEASON 2026
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}
