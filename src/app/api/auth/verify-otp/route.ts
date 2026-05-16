import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

function hashOtp(otp: string): string {
  const secret = process.env.OTP_HMAC_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'wwt-otp-salt';
  return createHmac('sha256', secret).update(otp).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { email, token } = await req.json();
    if (!email || !token || token.length < 6 || token.length > 8) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

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

    // First try: verify against our otp_codes table (custom OTP)
    // Compare hashed token — codes are stored hashed (HMAC-SHA256)
    const hashedToken = hashOtp(token.trim());
    const { data: otpRow, error: selectErr } = await supabase
      .from('otp_codes' as never)
      .select('*')
      .eq('email', email.trim())
      .eq('code', hashedToken)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .single() as { data: { email: string; code: string; expires_at: string } | null; error: unknown };

    if (!selectErr && otpRow) {
      // Verify FIRST, then mark as used — prevents consuming OTP on failed verify
      const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'email',
      });

      if (!verifyErr && verifyData.session) {
        // Only mark this specific OTP used — not all OTPs for the email
        await supabase
          .from('otp_codes' as never)
          .update({ used: true } as never)
          .eq('email', email.trim())
          .eq('code' as never, hashedToken);
        return NextResponse.json({ success: true });
      }
      // Verification failed — don't mark as used, fall through to direct verify
    }

    // Fallback: verify directly via Supabase's own OTP (for magic link / supabase-sent OTP)
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email',
    });

    if (error) {
      if (/expired/i.test(error.message))
        return NextResponse.json({ error: 'Code expired. Request a new one.' }, { status: 401 });
      if (/invalid/i.test(error.message) || /not found/i.test(error.message) || /otp/i.test(error.message))
        return NextResponse.json({ error: 'Wrong code. Check your email and try again.' }, { status: 401 });
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: { id: data.user?.id, email: data.user?.email },
    });
  } catch (err) {
    console.error('[OTP verify] unexpected:', err);
    return NextResponse.json({ error: 'Verification failed. Try again.' }, { status: 500 });
  }
}
