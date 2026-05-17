import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabaseSSR = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );
    const {
      data: { user },
    } = await supabaseSSR.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tripId, name } = await req.json();
    if (!tripId) return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });

    const admin = createSupabaseServiceClient();

    // Verify membership
    const { data: membership } = await admin
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { error } = await admin.from('print_waitlist' as never).upsert(
      {
        trip_id: tripId,
        user_id: user.id,
        email: user.email!,
        name: name?.trim() || null,
      } as never,
      { onConflict: 'trip_id,user_id' }
    );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[print-waitlist] error:', err);
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
  }
}
