import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// Hash OTP with HMAC-SHA256 before storing — no plaintext in DB
function hashOtp(otp: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'wwt-otp-salt';
  return createHmac('sha256', secret).update(otp).digest('hex');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// In-memory rate limiter: 5 requests per email per 15 minutes
const rateLimit = new Map<string, { count: number; resetAt: number }>();
function checkRate(email: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const entry = rateLimit.get(email);
  if (entry && now < entry.resetAt) {
    if (entry.count >= 5) {
      return { allowed: false, waitSeconds: Math.ceil((entry.resetAt - now) / 1000) };
    }
    entry.count++;
  } else {
    rateLimit.set(email, { count: 1, resetAt: now + 15 * 60 * 1000 });
  }
  return { allowed: true };
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    const rate = checkRate(email.trim().toLowerCase());
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${Math.ceil((rate.waitSeconds ?? 60) / 60)} minutes.` },
        { status: 429 }
      );
    }

    // Use Supabase admin to generate the OTP token without sending email
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email.trim(),
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`,
      },
    });

    if (error) {
      console.error('[OTP] generateLink error:', error.message);
      return NextResponse.json({ error: 'Failed to generate code. Try again.' }, { status: 500 });
    }

    const otp = data.properties.email_otp;

    // Send via Resend
    if (process.env.RESEND_API_KEY) {
      await sendViaResend(email.trim(), otp);
    } else {
      console.log('\n╔══════════════════════════════════════════╗');
      console.log(`║  WWT OTP CODE: ${otp.padEnd(24)}║`);
      console.log(`║  Email: ${email.trim().padEnd(33)}║`);
      console.log('╚══════════════════════════════════════════╝\n');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[OTP] unexpected error:', err);
    return NextResponse.json({ error: 'Failed to send code. Try again.' }, { status: 500 });
  }
}

async function sendViaResend(email: string, otp: string) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

  await resend.emails.send({
    from: `Woh Wala Trip <${from}>`,
    to: email,
    subject: `${otp} is your Woh Wala Trip code`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a08;">
  <div style="max-width:480px;margin:0 auto;padding:48px 32px;font-family:monospace;">
    <p style="font-size:10px;letter-spacing:0.6em;text-transform:uppercase;color:rgba(255,77,77,0.5);margin:0 0 32px;">
      ● MEMORY GATEWAY · ACCESS CODE
    </p>
    <div style="background:#0e0e0c;border:1px solid rgba(255,77,77,0.15);border-radius:16px;padding:40px;text-align:center;margin-bottom:32px;">
      <p style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:rgba(245,240,232,0.3);margin:0 0 20px;">
        YOUR ACCESS CODE
      </p>
      <h1 style="font-size:64px;font-weight:900;letter-spacing:0.2em;color:#F5F0E8;margin:0;line-height:1;">
        ${otp}
      </h1>
      <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(245,240,232,0.2);margin:20px 0 0;">
        VALID FOR 10 MINUTES
      </p>
    </div>
    <p style="font-size:13px;color:rgba(245,240,232,0.45);line-height:1.6;margin:0 0 12px;">
      Enter this code on the Woh Wala Trip login screen to access your friendship universe.
    </p>
    <p style="font-size:11px;color:rgba(245,240,232,0.2);line-height:1.6;margin:0;">
      If you didn't request this, you can safely ignore this email.
    </p>
    <div style="border-top:1px solid rgba(245,240,232,0.05);padding-top:24px;margin-top:32px;">
      <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(245,240,232,0.15);margin:0;">
        WOH WALA TRIP · AI FRIENDSHIP ARCHIVE · SEASON 2026
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}
