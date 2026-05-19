import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PublicStoryClient from './PublicStoryClient';
import type { LoreJson } from '@/lib/types';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from('trips')
    .select('name,lore_json')
    .eq('invite_code', code.toUpperCase())
    .single();
  const lore = (data as any)?.lore_json as LoreJson | null;
  return {
    title: lore?.trip_title || (data as any)?.name || 'Friendship Lore',
    description: lore?.tagline || 'Your friendship, narrated.',
  };
}

export default async function PublicStoryPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: tripData } = await supabase
    .from('trips')
    .select(
      'id, name, invite_code, lore_status, lore_json, chaos_score, member_count, tier, story_visible'
    )
    .eq('invite_code', code.toUpperCase())
    .single();

  if (!tripData) redirect('/');

  const trip = tripData as any;
  if (!trip.lore_json || trip.lore_status !== 'ready') {
    redirect(`/t/${code}`);
  }

  // PROD-02: Honour story_visible flag. Return a "Story Hidden" placeholder rather than
  // a 404 — a 404 would confuse the creator who just toggled the setting.
  if (trip.story_visible === false) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#060604',
          color: '#F5F0E8',
          fontFamily: 'monospace',
          gap: '1rem',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
        <h1
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Story Hidden
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'rgba(245,240,232,0.45)', maxWidth: 320 }}>
          The creator of this trip has hidden the story from public view.
        </p>
      </div>
    );
  }

  // Fetch members for character slides (public — display displays only)
  const { data: members } = await supabase
    .from('trip_members')
    .select(
      'user_id, role_title, role_description, role_chaos_rating, profiles:user_id(display_name)'
    )
    .eq('trip_id', trip.id);

  const membersClean = (members || []).map((m: any) => ({
    user_id: m.user_id,
    role_title: m.role_title,
    role_description: m.role_description,
    role_chaos_rating: m.role_chaos_rating,
    display_name: m.profiles?.display_name || 'Member',
  }));

  // Fetch, sign, and cache public photos for blurred background slides
  const { data: photosData } = await supabase
    .from('photos')
    .select('id, storage_path, thumbnail_path, signed_url, thumb_signed_url, url_expires_at')
    .eq('trip_id', trip.id)
    .neq('is_private', true);

  const photos = (photosData || []) as any[];
  const tenMinFromNow = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const needsRefresh = photos.filter(p => !p.url_expires_at || p.url_expires_at < tenMinFromNow);
  const hasValidCache = photos.filter(p => p.url_expires_at && p.url_expires_at >= tenMinFromNow);

  const urlByPath = new Map<string, string>();
  const thumbUrlByPath = new Map<string, string>();

  for (const p of hasValidCache) {
    if (p.signed_url) urlByPath.set(p.storage_path, p.signed_url);
    if (p.thumb_signed_url && p.thumbnail_path)
      thumbUrlByPath.set(p.thumbnail_path, p.thumb_signed_url);
  }

  if (needsRefresh.length > 0) {
    const photoPaths = needsRefresh.map(p => p.storage_path);
    const thumbPaths = needsRefresh
      .filter(p => p.thumbnail_path)
      .map(p => p.thumbnail_path as string);

    try {
      const [photoUrls, thumbUrls] = await Promise.all([
        supabase.storage.from('trip-photos').createSignedUrls(photoPaths, 3600),
        thumbPaths.length > 0
          ? supabase.storage.from('trip-photos').createSignedUrls(thumbPaths, 3600)
          : Promise.resolve({ data: [] as any }),
      ]);

      (photoUrls.data || []).forEach((u: any) => {
        if (u.signedUrl && u.path) urlByPath.set(u.path, u.signedUrl);
      });
      (thumbUrls.data || []).forEach((u: any) => {
        if (u.signedUrl && u.path) thumbUrlByPath.set(u.path, u.signedUrl);
      });

      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
      const urlsToUpsert = needsRefresh
        .filter(p => urlByPath.has(p.storage_path))
        .map(p => ({
          id: p.id,
          signed_url: urlByPath.get(p.storage_path)!,
          thumb_signed_url: p.thumbnail_path
            ? (thumbUrlByPath.get(p.thumbnail_path) ?? null)
            : null,
          url_expires_at: expiresAt,
        }));

      if (urlsToUpsert.length > 0) {
        await supabase.from('photos').upsert(urlsToUpsert as never, { onConflict: 'id' });
      }
    } catch (e) {
      console.error('Failed to sign public URLs:', e);
    }
  }

  const finalPhotos = photos.map(p => ({
    url: urlByPath.get(p.storage_path) ?? p.signed_url ?? null,
    thumbnailUrl: p.thumbnail_path
      ? (thumbUrlByPath.get(p.thumbnail_path) ?? p.thumb_signed_url ?? null)
      : null,
  }));

  return (
    <PublicStoryClient
      tripId={trip.id}
      inviteCode={code}
      lore={trip.lore_json as LoreJson}
      members={membersClean}
      tier={trip.tier ?? 'free'}
      photos={finalPhotos}
    />
  );
}
