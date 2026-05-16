import { NextRequest, NextResponse } from 'next/server';
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

    // Try to get user from session
    const supabaseSSR = (await import('@supabase/ssr')).createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );
    const { data: { user } } = await supabaseSSR.auth.getUser();

    await admin.from('lore_reactions' as never).upsert({
      trip_id: tripId,
      user_id: user?.id ?? null, // null = anonymous (public story viewer)
      slide_type: slideType,
      slide_idx: slideIdx,
      emoji,
    } as never);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[reactions] POST error:', err);
    return NextResponse.json({ error: 'Failed to save reaction' }, { status: 500 });
  }
}
