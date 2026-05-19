import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import JSZip from 'jszip';

export async function GET(req: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params;

    // 1. Authenticate user
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify trip membership
    const { data: member } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Fetch trip details & photos
    const { data: trip } = await supabase
      .from('trips')
      .select('name, destination, lore_json, invite_code, tier, chaos_score')
      .eq('id', tripId)
      .single();

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const { data: photos } = await supabase
      .from('photos')
      .select('storage_path')
      .eq('trip_id', tripId);

    const adminSupabase = createSupabaseServiceClient();
    const photoPaths = ((photos || []) as any[]).map(p => p.storage_path);
    let signedPhotos: { path: string; signedUrl: string }[] = [];

    if (photoPaths.length > 0) {
      const { data: signed } = await adminSupabase.storage
        .from('trip-photos')
        .createSignedUrls(photoPaths, 86400); // 24 hours
      signedPhotos = (signed || []).map(s => ({
        path: s.path ?? '',
        signedUrl: s.signedUrl ?? '',
      }));
    }

    const t = trip as any;

    // 4. Fetch story-card.png
    const origin = req.nextUrl.origin;
    const cardUrl = `${origin}/api/card/story/${tripId}`;
    let storyCardBuffer: Buffer | null = null;
    try {
      const cardRes = await fetch(cardUrl);
      if (cardRes.ok) {
        const arrayBuf = await cardRes.arrayBuffer();
        storyCardBuffer = Buffer.from(arrayBuf);
      }
    } catch (e) {
      console.error('Failed to fetch story-card.png', e);
    }

    // 5. Build ZIP
    const zip = new JSZip();
    zip.file('lore.json', JSON.stringify(t.lore_json || {}, null, 2));
    zip.file(
      'photos.json',
      JSON.stringify(
        {
          trip_name: t.name,
          destination: t.destination,
          invite_code: t.invite_code,
          chaos_score: t.chaos_score,
          photos: signedPhotos,
        },
        null,
        2
      )
    );

    if (storyCardBuffer) {
      zip.file('story-card.png', storyCardBuffer);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // 6. Return response
    const filename = `${(t.name || 'trip').replace(/\s+/g, '-')}-archive.zip`;
    return new Response(zipBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[export]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
