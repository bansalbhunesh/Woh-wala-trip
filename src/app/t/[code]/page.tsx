import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { LoreJson } from '@/lib/types';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: trip } = await supabase
    .from('trips')
    .select('name, destination, lore_json, chaos_score')
    .eq('invite_code', code.toUpperCase())
    .single();

  if (!trip) return { title: 'Woh Wala Trip' };

  const lore = (trip as any).lore_json as LoreJson | null;

  return {
    title: lore?.trip_title || (trip as any).name,
    description: lore?.tagline || `${(trip as any).destination} trip archive`,
    openGraph: {
      title: lore?.trip_title || (trip as any).name,
      description: lore?.tagline,
      images: [
        {
          url: `/api/card/${code}`,
          width: 1080,
          height: 1920,
          alt: lore?.trip_title || (trip as any).name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: lore?.trip_title || (trip as any).name,
      description: lore?.tagline,
    },
  };
}

export default async function PublicLorePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: tripData } = await supabase
    .from('trips')
    .select('id, name, destination, chaos_score, member_count, lore_json, tier, invite_code, trip_start_date, trip_end_date')
    .eq('invite_code', code.toUpperCase())
    .single();

  if (!tripData) redirect('/');
  const trip = tripData as any;

  const lore = trip.lore_json as LoreJson | null;
  if (!lore) redirect(`/trips/join?code=${code}`);

  const cookedLevel = lore.cooked_level ?? trip.chaos_score ?? 60;
  const duration = computeDays(trip.trip_start_date, trip.trip_end_date);

  return (
    <div className="min-h-screen bg-[#060604] text-[#F5F0E8] font-vibe selection:bg-cooked-accent selection:text-white">
      {/* Cinematic Hero */}
      <section className="relative min-h-[90vh] flex flex-col justify-center px-8 pt-20 pb-16 overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full opacity-10 blur-[150px] animate-floatA"
            style={{ background: '#FF3B2F' }}
          />
        </div>

        <div className="relative z-10 max-w-2xl space-y-10">
          <div className="space-y-4">
            <p className="text-[9px] uppercase tracking-[0.5em] text-white/20 font-vibe font-bold">
               {trip.destination} · {duration} Days · {trip.member_count} Cast Members
            </p>
            <h1 className="text-6xl md:text-8xl font-cinematic font-black text-[#F5F0E8] leading-[0.8] tracking-tighter uppercase">
              {lore.trip_title}
            </h1>
          </div>

          <p className="text-2xl font-cinematic italic text-cooked-accent/80 leading-tight">
            &ldquo;{lore.tagline}&rdquo;
          </p>

          {/* Chaos Score */}
          <div className="flex items-baseline gap-6">
            <span className="text-[25vw] md:text-[15vw] font-vibe font-black tracking-tighter leading-none text-cooked-accent animate-fade-in">
              {cookedLevel}
            </span>
            <div className="flex flex-col">
              <span className="text-2xl font-vibe font-black uppercase tracking-tight text-[#F5F0E8]">
                {lore.cooked_verdict}
              </span>
              <span className="text-[10px] text-white/30 font-vibe font-bold uppercase tracking-[0.2em]">Collective Chaos / 100</span>
            </div>
          </div>

          {lore.cooked_explanation && (
            <p className="text-lg font-vibe font-bold text-white/40 italic border-l-2 border-white/10 pl-8 max-w-lg leading-relaxed">
              {lore.cooked_explanation}
            </p>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 pt-8">
            <Link
              href={`/trips/join?code=${trip.invite_code}`}
              className="px-12 py-6 bg-[#F5F0E8] text-black rounded-full font-vibe font-black uppercase tracking-[0.2em] text-[10px] hover:scale-110 active:scale-95 transition-all text-center shadow-3xl"
            >
              Join the Archive
            </Link>
            <Link
              href={`/api/card/${trip.invite_code}`}
              target="_blank"
              className="px-12 py-6 border border-white/10 bg-white/[0.03] text-white/60 rounded-full font-vibe font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-white/10 transition-all text-center"
            >
              View Identity Card
            </Link>
          </div>
        </div>
      </section>

      {/* Recap */}
      {lore.season_recap?.full_narrative && (
        <section className="px-8 py-24 border-t border-white/[0.05] bg-white/[0.01]">
          <div className="max-w-2xl mx-auto space-y-10">
            <p className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-vibe font-bold">The Season Recap</p>
            <p className="text-2xl font-cinematic italic text-white/70 leading-relaxed">
              &ldquo;{lore.season_recap.full_narrative}&rdquo;
            </p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="px-8 py-20 border-t border-white/[0.05] text-center bg-black">
        <div className="font-cinematic italic text-xs text-white/10 tracking-[0.2em] mb-12">woh wala trip</div>
        <Link
          href="/"
          className="inline-block px-8 py-4 border border-white/5 rounded-full text-[9px] uppercase tracking-[0.4em] font-vibe text-white/20 hover:text-white/60 transition-colors"
        >
          Create Your Own Lore →
        </Link>
      </footer>
    </div>
  );
}

function computeDays(start: string | null, end: string | null): number {
  if (!start || !end) return 3;
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);
}
