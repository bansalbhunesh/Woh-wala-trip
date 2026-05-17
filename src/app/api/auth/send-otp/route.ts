import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { checkEmail, checkRateLimit, computeFraudScore } from '@/lib/anti-spam';
import { traceSecurityEvent } from '@/lib/langfuse';

// Fail-fast startup check: surface missing OTP_HMAC_SECRET immediately
// rather than crashing on the first OTP request.
if (!process.env.OTP_HMAC_SECRET && process.env.NODE_ENV === 'production') {
  console.error(
    '[FATAL] OTP_HMAC_SECRET is not set. Auth OTP flow will crash at runtime. ' +
      'Set this environment variable before deploying.'
  );
}

function hashOtp(otp: string): string {
  const secret = process.env.OTP_HMAC_SECRET;
  if (!secret) {
    throw new Error(
      'OTP_HMAC_SECRET environment variable is required but not set. ' +
        'Configure it in your .env.local or deployment environment.'
    );
  }
  return createHmac('sha256', secret).update(otp).digest('hex');
}

async function storeOtp(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  email: string,
  otp: string
) {
  const hashed = hashOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
  await supabase.from('otp_codes' as never).insert({
    email: email.toLowerCase(),
    code: hashed,
    expires_at: expiresAt,
    used: false,
  } as never);
}

export async function POST(req: NextRequest) {
  // Single request trace ID groups all security events for this request in Langfuse
  const requestId = crypto.randomUUID();

  try {
    // IP-level burst protection (in-memory, defense-in-depth)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!(await checkRateLimit(`otp:${ip}`, 10, 60_000))) {
      traceSecurityEvent('rate_limited', { ip, reason: 'ip_burst', requestId }, requestId);
      return NextResponse.json({ error: 'Too many requests. Slow down.' }, { status: 429 });
    }

    const { email } = await req.json();

    // Anti-spam: composite fraud score (format + disposable + role account + API checks)
    const fraudResult = await computeFraudScore(email ?? '');
    if (!fraudResult.allowed) {
      const isDisposable = fraudResult.signals.disposableLocal || fraudResult.signals.disposableApi;
      traceSecurityEvent(
        isDisposable ? 'disposable_email' : 'api_fraud_score',
        {
          ip,
          fraudScore: fraudResult.fraudScore,
          action: fraudResult.action,
          signals: fraudResult.signals,
          requestId,
        },
        requestId
      );
      return NextResponse.json({ error: fraudResult.reason }, { status: 400 });
    }

    // Use Supabase admin (service role) for all operations — queries across all sessions
    const supabase = createSupabaseServiceClient();

    // DB-backed rate limit: max 5 OTP sends per email per 15 minutes
    const { count } = await supabase
      .from('otp_codes' as never)
      .select('email', { count: 'exact', head: true })
      .eq('email' as never, email.trim().toLowerCase())
      .gte('created_at' as never, new Date(Date.now() - 15 * 60 * 1000).toISOString());

    if ((count || 0) >= 5) {
      traceSecurityEvent(
        'rate_limited',
        {
          ip,
          reason: 'db_otp_limit',
          email: email.trim().replace(/^(.{2}).*@/, '$1***@'),
          requestId,
        },
        requestId
      );
      return NextResponse.json(
        { error: 'Too many requests. Try again in 15 minutes.' },
        { status: 429 }
      );
    }

    // Use Supabase admin to generate the OTP token without sending email
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

    // Store hashed OTP for rate limiting and custom verification path
    await storeOtp(supabase, email.trim(), otp);

    // Send via Resend
    if (process.env.RESEND_API_KEY) {
      await sendViaResend(email.trim(), otp);
    } else {
      console.log('\n╔══════════════════════════════════════════╗');
      console.log(`║  YAARLORE OTP: ${otp.padEnd(24)}║`);
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
    from: `Yaarlore <${from}>`,
    to: email,
    subject: `${otp} is your Yaarlore code`,
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
      Enter this code on the Yaarlore login screen to access your friendship universe.
    </p>
    <p style="font-size:11px;color:rgba(245,240,232,0.2);line-height:1.6;margin:0;">
      If you didn't request this, you can safely ignore this email.
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
