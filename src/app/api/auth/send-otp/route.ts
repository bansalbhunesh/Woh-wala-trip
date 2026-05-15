import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    // Use admin generateLink to get the 6-digit OTP from Supabase
    // This creates the OTP token internally but does NOT send the email
    // We send the email ourselves via Resend (or console in dev)
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email.trim(),
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? `http://localhost:3000`}/auth/callback`,
      },
    });

    if (error) {
      console.error('[OTP] generateLink error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const otp = data.properties.email_otp;

    // Send via Resend if API key configured, else log to console in dev
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const fromDomain = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

      await resend.emails.send({
        from: `Woh Wala Trip <${fromDomain}>`,
        to: email.trim(),
        subject: `${otp} — Your access code`,
        html: `
          <div style="font-family:monospace;background:#060604;color:#F5F0E8;padding:48px;max-width:480px;margin:0 auto;border-radius:16px;">
            <p style="font-size:11px;letter-spacing:0.5em;text-transform:uppercase;color:rgba(255,77,77,0.7);margin-bottom:24px;">
              ● MEMORY GATEWAY ACCESS CODE
            </p>
            <h1 style="font-size:64px;font-weight:900;letter-spacing:0.2em;color:#F5F0E8;margin:0 0 24px;">
              ${otp}
            </h1>
            <p style="font-size:13px;color:rgba(245,240,232,0.4);margin:0 0 8px;">
              Enter this code to access your friendship universe.
            </p>
            <p style="font-size:11px;color:rgba(245,240,232,0.2);letter-spacing:0.1em;text-transform:uppercase;">
              Valid for 10 minutes · Woh Wala Trip · Season 2026
            </p>
          </div>
        `,
      });
    } else {
      // Development fallback — log to console
      console.log('\n╔══════════════════════════════════════╗');
      console.log(`║  WWT OTP CODE: ${otp}              ║`);
      console.log(`║  Email: ${email.padEnd(28)}║`);
      console.log('╚══════════════════════════════════════╝\n');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[OTP] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to send code. Try again.' }, { status: 500 });
  }
}
