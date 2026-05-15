import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

export async function POST(req: NextRequest) {
  try {
    const { email, token } = await req.json();

    if (!email || !token || token.length !== 6) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as never)
            );
          },
        },
      }
    );

    // Verify the 6-digit OTP against Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email',
    });

    if (error) {
      console.error('[OTP verify] error:', error.message);
      if (/expired/i.test(error.message))
        return NextResponse.json({ error: 'Code expired. Request a new one.' }, { status: 401 });
      if (/invalid/i.test(error.message) || /not found/i.test(error.message))
        return NextResponse.json({ error: 'Wrong code. Check your email.' }, { status: 401 });
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Session created and cookies set by the SSR client above
    return NextResponse.json({
      success: true,
      user: { id: data.user?.id, email: data.user?.email },
    });
  } catch (err) {
    console.error('[OTP verify] Unexpected error:', err);
    return NextResponse.json({ error: 'Verification failed. Try again.' }, { status: 500 });
  }
}
