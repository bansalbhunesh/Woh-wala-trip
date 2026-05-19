// Private story page — redirects to the public story URL.
// There is no reason to maintain two separate slide-experience implementations.
// The public story at /t/[code]/story is the canonical share/view surface
// and is accessible to both authenticated and unauthenticated users.

import { redirect } from 'next/navigation';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export default async function PrivateStoryRedirect({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = createSupabaseServiceClient();

  const { data } = await supabase.from('trips').select('invite_code').eq('id', tripId).single();

  if (data?.invite_code) {
    redirect(`/t/${data.invite_code}/story`);
  }

  // Fallback: send to trip room if invite code unavailable
  redirect(`/trips/${tripId}`);
}
