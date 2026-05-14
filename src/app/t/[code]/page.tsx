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

  const lore = trip.lore_json as LoreJson | null;

  return {
    title: lore?.trip_title || trip.name,
    description: lore?.tagline || `${trip.destination} trip archive`,
    openGraph: {
      title: lore?.trip_title || trip.name,
      description: lore?.tagline,
      images: [
        {
          url: `/api/card/${code}`,
          width: 1080,
          height: 1920,
          alt: lore?.trip_title || trip.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: lore?.trip_title || trip.name,
      description: lore?.tagline,
    },
  };
}

export default async function PublicLorePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, destination, chaos_score, member_count, lore_json, tier, invite_code, trip_start_date, trip_end_date')
    .eq('invite_code', code.toUpperCase())
    .single();

  if (!trip) redirect('/');

  const lore = trip.lore_json as LoreJson | null;
  if (!lore) redirect(`/trips/join?code=${code}`);

  const cookedLevel = lore.cooked_level ?? trip.chaos_score ?? 60;

  const cookedColor =
    cookedLevel >= 91 ? '#E24B4A'
      : cookedLevel >= 76 ? '#D85A30'
      : cookedLevel >= 51 ? '#D4537E'
      : cookedLevel >= 21 ? '#BA7517'
      : '#2D9E8B';

  const duration = computeDays(trip.trip_start_date, trip.trip_end_date);

  return (
    <div className="min-h-screen bg-cooked-bg text-white selection:bg-white selection:text-cooked-bg">
      {/* Hero */}
      <section className="relative min-h-[85vh] flex flex-col justify-center px-8 pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full opacity-15 blur-[200px]"
            style={{ background: cookedColor }}
          />
        </div>

        <div className="relative z-10 max-w-2xl space-y-8">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-vibe">
              {trip.destination} · {duration} days · {trip.member_count} people
            </p>
            <h1 className="text-6xl md:text-8xl font-cinematic font-medium text-white leading-[0.85] tracking-tight">
              {lore.trip_title}
            </h1>
          </div>

          <p className="text-xl font-cinematic italic leading-relaxed" style={{ color: `${cookedColor}cc` }}>
            &ldquo;{lore.tagline}&rdquo;
          </p>

          {/* Cooked level */}
          <div className="flex items-baseline gap-4">
            <span className="text-8xl font-vibe font-bold tracking-tighter leading-none" style={{ color: cookedColor }}>
              {cookedLevel}
            </span>
            <div className="flex flex-col">
              <span className="text-xl font-vibe font-bold uppercase tracking-tight text-white/90">
                {lore.cooked_verdict}
              </span>
              <span className="text-sm text-white/30 font-data">how cooked / 100</span>
            </div>
          </div>

          {lore.cooked_explanation && (
            <p className="text-base font-data font-light text-white/50 italic border-l-2 border-white/10 pl-6">
              {lore.cooked_explanation}
            </p>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link
              href={`/trips/join?code=${trip.invite_code}`}
              className="px-10 py-5 bg-white text-cooked-bg rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-transform text-center shadow-2xl"
            >
              Join this archive
            </Link>
            <Link
              href={`/api/card/${trip.id}`}
              target="_blank"
              className="px-10 py-5 border border-white/10 bg-white/5 text-white rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all text-center"
            >
              View card
            </Link>
          </div>
        </div>
      </section>

      {/* Season Recap */}
      {lore.season_recap?.full_narrative && (
        <section className="px-8 py-20 border-t border-white/5 max-w-2xl">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-vibe mb-8">The Season Recap</p>
          <p className="text-xl font-data font-light text-white/70 leading-relaxed">
            {lore.season_recap.full_narrative}
          </p>
        </section>
      )}

      {/* Footer */}
      <section className="px-8 py-16 border-t border-white/5 text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-white/15 font-vibe mb-6">
          Your friendships, narrated.
        </p>
        <Link
          href="/"
          className="text-[10px] uppercase tracking-widest font-vibe text-white/20 hover:text-white/40 transition-colors"
        >
          Woh Wala Trip →
        </Link>
      </section>
    </div>
  );
}

function computeDays(start: string | null, end: string | null): number {
  if (!start || !end) return 3;
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);
}
