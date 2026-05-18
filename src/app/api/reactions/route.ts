import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/anti-spam';

const VALID_EMOJIS = new Set(['🔥', '😂', '💔', '👑', '😭']);

// GET /api/reactions?tripId=...&slideType=...&slideIdx=...
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tripId = searchParams.get('tripId');
  const slideType = searchParams.get('slideType');
  if (!tripId || !slideType) return NextResponse.json({ counts: {} });

  const admin = createSupabaseServiceClient();
  const { data } = await admin
    .from('lore_reactions' as never)
    .select('emoji')
    .eq('trip_id' as never, tripId)
    .eq('slide_type' as never, slideType);

  const counts: Record<string, number> = {};
  for (const row of (data as any[]) || []) {
    counts[row.emoji] = (counts[row.emoji] || 0) + 1;
  }
  return NextResponse.json({ counts });
}

// POST /api/reactions — add reaction (works with or without auth)
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous';
    if (!(await checkRateLimit(`reactions:${ip}`, 30, 60_000))) {
      return NextResponse.json({ error: 'Too many reactions' }, { status: 429 });
    }

    const { tripId, slideType, slideIdx, emoji } = await req.json();
    if (!tripId || !slideType || !VALID_EMOJIS.has(emoji)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const admin = createSupabaseServiceClient();

    // Validate trip exists and check is_public before accepting any reaction.
    // Uses admin (service role) because after RLS is enabled, a user-scoped client
    // cannot read trips the current (possibly anonymous) user is not a member of.
    const { data: tripData } = await admin
      .from('trips' as never)
      .select('is_public')
      .eq('id' as never, tripId)
      .single();

    if (!tripData) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Resolve user session before the public-trip guard so that authenticated
    // trip members can still react on private trips.
    const cookieStore = await cookies();
    const { createServerClient } = await import('@supabase/ssr');
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

    // Anonymous users can only react on public trips
    if (!user && !(tripData as { is_public: boolean }).is_public) {
      return NextResponse.json({ error: 'This trip is not public' }, { status: 403 });
    }

    if (user) {
      // Auth'd users: upsert to deduplicate per slide (existing logic unchanged)
      await admin.from('lore_reactions' as never).upsert(
        {
          trip_id: tripId,
          user_id: user.id,
          slide_type: slideType,
          slide_idx: slideIdx ?? null,
          emoji,
        } as never,
        { onConflict: 'trip_id,user_id,slide_type,slide_idx' } as never
      );
    } else {
      // Anonymous: insert (existing logic unchanged)
      await admin.from('lore_reactions' as never).insert({
        trip_id: tripId,
        user_id: null,
        slide_type: slideType,
        slide_idx: slideIdx ?? null,
        emoji,
      } as never);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[reactions] POST error:', err);
    return NextResponse.json({ error: 'Failed to save reaction' }, { status: 500 });
  }
}
