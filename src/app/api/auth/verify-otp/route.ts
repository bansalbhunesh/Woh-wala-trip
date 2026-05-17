import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

function hashOtp(otp: string): string {
  const secret = process.env.OTP_HMAC_SECRET;
  if (!secret) throw new Error('OTP_HMAC_SECRET is required but not set');
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
          getAll() {
            return cookieStore.getAll();
          },
          setAll(list: { name: string; value: string; options?: object }[]) {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as never)
            );
          },
        },
      }
    );

    // Single verification path — Supabase is authoritative for the OTP.
    // otp_codes table is only used for rate limiting in send-otp; we don't need to
    // re-check it here because verifyOtp will reject expired/used tokens itself.
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email',
    });

    if (error) {
      if (/expired/i.test(error.message))
        return NextResponse.json({ error: 'Code expired. Request a new one.' }, { status: 401 });
      if (
        /invalid/i.test(error.message) ||
        /not found/i.test(error.message) ||
        /otp/i.test(error.message)
      )
        return NextResponse.json(
          { error: 'Wrong code. Check your email and try again.' },
          { status: 401 }
        );
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Mark the otp_codes row as used (non-critical — fire and forget)
    const admin = createSupabaseServiceClient();
    const hashedToken = hashOtp(token.trim());
    void (
      admin
        .from('otp_codes' as never)
        .update({ used: true } as never)
        .eq('email' as never, email.trim().toLowerCase())
        .eq('code' as never, hashedToken) as unknown as Promise<unknown>
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      user: { id: data.user?.id, email: data.user?.email },
    });
  } catch (err) {
    console.error('[OTP verify] unexpected:', err);
    return NextResponse.json({ error: 'Verification failed. Try again.' }, { status: 500 });
  }
}
