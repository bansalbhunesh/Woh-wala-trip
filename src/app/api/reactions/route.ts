import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

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
  for (const row of (data as any[] || [])) {
    counts[row.emoji] = (counts[row.emoji] || 0) + 1;
  }
  return NextResponse.json({ counts });
}

// POST /api/reactions — add reaction (works with or without auth)
export async function POST(req: NextRequest) {
  try {
    const { tripId, slideType, slideIdx, emoji } = await req.json();
    if (!tripId || !slideType || !VALID_EMOJIS.has(emoji)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const admin = createSupabaseServiceClient();

    // Read real cookies so session is respected for logged-in users
    const cookieStore = await cookies();
    const { createServerClient } = await import('@supabase/ssr');
    const supabaseSSR = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );
    const { data: { user } } = await supabaseSSR.auth.getUser();

    if (user) {
      // Auth'd users: upsert to deduplicate per slide
      await admin.from('lore_reactions' as never).upsert({
        trip_id: tripId,
        user_id: user.id,
        slide_type: slideType,
        slide_idx: slideIdx ?? null,
        emoji,
      } as never, { onConflict: 'trip_id,user_id,slide_type,slide_idx' } as never);
    } else {
      // Anonymous: just insert (can't deduplicate without user identity)
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
