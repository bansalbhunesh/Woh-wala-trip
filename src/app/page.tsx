import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import LandingClient from '@/components/experience/LandingClient';

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) redirect('/trips');
  return <LandingClient />;
}
