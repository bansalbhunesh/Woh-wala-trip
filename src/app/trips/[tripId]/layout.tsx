// Server-rendered layout for trip room — renders the critical chrome instantly
// so users never see a blank screen while the client JS hydrates.
//
// RSC First-Paint Strategy:
// The trip room page is 'use client' (2,136 lines) which causes a blank screen
// while JavaScript downloads on Jio 4G. This layout provides an instant
// server-rendered dark frame that appears immediately, eliminating the white/blank
// flash that makes the product feel broken on mobile.
//
// The actual lore content loads after hydration — but users see the product
// shell immediately, which signals "something is happening."

import type { ReactNode } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function TripRoomLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const supabase = await createSupabaseServerClient();

  // Auth gate — redirect to login before rendering anything
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const { tripId } = await params;
    redirect(`/login?next=/trips/${tripId}`);
  }

  return (
    // Instant dark background — prevents white/blank flash on load.
    // This renders as HTML immediately, before any JS executes.
    // The trip room client component replaces this content on hydration.
    <div
      style={{
        minHeight: '100vh',
        background: '#060604',
        color: '#F5F0E8',
      }}
    >
      {children}
    </div>
  );
}
