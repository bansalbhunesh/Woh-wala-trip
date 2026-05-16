import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PublicStoryClient from './PublicStoryClient';
import type { LoreJson } from '@/lib/types';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from('trips').select('name,lore_json').eq('invite_code', code.toUpperCase()).single();
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
    .select('id, name, invite_code, lore_status, lore_json, chaos_score, member_count')
    .eq('invite_code', code.toUpperCase())
    .single();

  if (!tripData) redirect('/');

  const trip = tripData as any;
  if (!trip.lore_json || trip.lore_status !== 'ready') {
    redirect(`/t/${code}`);
  }

  // Fetch members for character slides (public — display names only)
  const { data: members } = await supabase
    .from('trip_members')
    .select('user_id, role_title, role_description, role_chaos_rating, profiles:user_id(display_name)')
    .eq('trip_id', trip.id);

  const membersClean = (members || []).map((m: any) => ({
    user_id: m.user_id,
    role_title: m.role_title,
    role_description: m.role_description,
    role_chaos_rating: m.role_chaos_rating,
    display_name: m.profiles?.display_name || 'Member',
  }));

  return (
    <PublicStoryClient
      tripId={trip.id}
      inviteCode={code}
      lore={trip.lore_json as LoreJson}
      members={membersClean}
    />
  );
}
