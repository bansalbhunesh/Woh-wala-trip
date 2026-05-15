import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

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
    const { data: otpRow, error: selectErr } = await supabase
      .from('otp_codes' as never)
      .select('*')
      .eq('email', email.trim())
      .eq('code', token.trim())
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .single() as { data: { email: string; code: string; expires_at: string } | null; error: unknown };

    if (!selectErr && otpRow) {
      // Mark as used
      await supabase
        .from('otp_codes' as never)
        .update({ used: true } as never)
        .eq('email', email.trim());

      // Create session via Supabase OTP verification
      // Use the same token to verify via Supabase's auth endpoint
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'email',
      });

      if (!verifyErr && data.session) {
        return NextResponse.json({ success: true });
      }
      // If Supabase verifyOtp fails (different token state), still succeed
      // The session will be created via the fallback below
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
