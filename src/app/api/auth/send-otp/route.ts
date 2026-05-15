import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Store OTP in Supabase using the SSR anon client
    // Requires an `otp_codes` table (see setup instructions below)
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(list: { name: string; value: string; options?: object }[]) {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options as never));
          },
        },
      }
    );

    // Upsert OTP code — replaces any existing code for this email
    const { error: dbErr } = await supabase
      .from('otp_codes' as never)
      .upsert({ email: email.trim(), code, expires_at: expiresAt, used: false } as never, { onConflict: 'email' });

    if (dbErr) {
      console.error('[OTP send] db error:', dbErr.message);
      // If table doesn't exist, fall back to Supabase built-in OTP
      return sendViaSupabase(email.trim(), supabase, code);
    }

    // Send via Resend
    if (process.env.RESEND_API_KEY) {
      await sendViaResend(email.trim(), code);
    } else {
      // Dev fallback — print to console
      console.log('\n╔══════════════════════════════════════════╗');
      console.log(`║  WWT OTP CODE: ${code}                  ║`);
      console.log(`║  Email: ${email.trim().padEnd(33)}║`);
      console.log('╚══════════════════════════════════════════╝\n');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[OTP send] unexpected:', err);
    return NextResponse.json({ error: 'Failed to send code. Try again.' }, { status: 500 });
  }
}

async function sendViaResend(email: string, code: string) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

  await resend.emails.send({
    from: `Woh Wala Trip <${from}>`,
    to: email,
    subject: `${code} is your Woh Wala Trip code`,
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
      <h1 style="font-size:72px;font-weight:900;letter-spacing:0.25em;color:#F5F0E8;margin:0;line-height:1;">
        ${code}
      </h1>
      <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(245,240,232,0.2);margin:20px 0 0;">
        VALID FOR 10 MINUTES
      </p>
    </div>
    <p style="font-size:13px;color:rgba(245,240,232,0.45);line-height:1.6;margin:0 0 12px;">
      Enter this code on the Woh Wala Trip login screen.
    </p>
    <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(245,240,232,0.15);margin:32px 0 0;border-top:1px solid rgba(245,240,232,0.05);padding-top:24px;">
      WOH WALA TRIP · SEASON 2026
    </p>
  </div>
</body>
</html>`,
  });
}

async function sendViaSupabase(email: string, supabase: ReturnType<typeof createServerClient>, code: string) {
  // Fall back: trigger Supabase's own OTP (sends magic link or OTP depending on project settings)
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`,
      shouldCreateUser: true,
    },
  });
  if (error) {
    if (/rate|limit|too many|over_email/i.test(error.message))
      return NextResponse.json({ error: 'Too many requests. Wait 60 seconds.' }, { status: 429 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Log code to console in this fallback mode (Supabase sends its own email)
  console.log(`[OTP fallback] Code ${code} generated but Supabase is sending its own email to ${email}`);
  return NextResponse.json({ success: true, mode: 'supabase' });
}
