import { createSupabaseServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { LoreJson } from '@/lib/types';

export const metadata = {
  title: 'Hall of Chaos — Yaarlore',
  description: 'The most historically cooked trips on Yaarlore. Ranked by chaos score.',
};

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const supabase = createSupabaseServiceClient();

  const { data: trips } = await supabase
    .from('trips')
    .select(
      'id, name, destination, chaos_score, lore_json, invite_code, member_count, trip_start_date'
    )
    .eq('lore_status', 'ready')
    .eq('story_visible', true)
    .not('chaos_score', 'is', null)
    .order('chaos_score', { ascending: false })
    .limit(25);

  const ranked = (trips ?? []) as Array<{
    id: string;
    name: string;
    destination: string | null;
    chaos_score: number;
    lore_json: LoreJson | null;
    invite_code: string;
    member_count: number | null;
    trip_start_date: string | null;
  }>;

  const TIER_LABEL = (score: number) => {
    if (score >= 90) return { label: 'UNHINGED', color: '#FF4D4D' };
    if (score >= 75) return { label: 'HISTORICALLY COOKED', color: '#FF6B35' };
    if (score >= 60) return { label: 'PEAK DELUSION', color: '#D49E2D' };
    if (score >= 45) return { label: 'EMOTIONALLY UNSTABLE', color: '#2D9E8B' };
    return { label: 'MILDLY SIMMERING', color: '#7C6AFF' };
  };

  return (
    <div className="min-h-screen" style={{ background: '#060604', color: '#F5F0E8' }}>
      <div className="film-grain" />

      <header
        className="sticky top-0 z-20 flex items-center justify-between px-6 lg:px-12 py-5"
        style={{
          borderBottom: '1px solid rgba(245,240,232,0.06)',
          background: 'rgba(6,6,4,0.85)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Link
          href="/trips"
          className="font-mono text-[10px] uppercase tracking-[0.4em] transition-opacity hover:opacity-70"
          style={{ color: 'rgba(245,240,232,0.45)' }}
        >
          ← My Archive
        </Link>
        <span className="font-display font-black text-base tracking-[0.1em] uppercase">
          YAARLORE
        </span>
        <Link
          href="/"
          className="font-mono text-[9px] uppercase tracking-[0.3em] transition-opacity hover:opacity-70"
          style={{ color: 'rgba(245,240,232,0.3)' }}
        >
          Home
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 pb-32">
        {/* Header */}
        <div className="mb-14 space-y-4">
          <p
            className="font-mono text-[8px] uppercase tracking-[0.6em]"
            style={{ color: 'rgba(255,77,77,0.6)' }}
          >
            ● PUBLIC ARCHIVE
          </p>
          <h1
            className="font-display font-black uppercase leading-[0.85] tracking-tighter"
            style={{ fontSize: 'clamp(44px, 8vw, 88px)', color: 'rgba(245,240,232,0.95)' }}
          >
            Hall of
            <br />
            <em className="italic" style={{ color: '#FF4D4D' }}>
              Chaos
            </em>
          </h1>
          <p
            className="font-display italic text-base max-w-md"
            style={{ color: 'rgba(245,240,232,0.45)' }}
          >
            The most historically cooked trips on record. Ranked by AI-verified chaos score.
            Anonymised by invite code.
          </p>
          {ranked.length > 0 && (
            <p
              className="font-mono text-[9px] uppercase tracking-[0.4em]"
              style={{ color: 'rgba(245,240,232,0.25)' }}
            >
              {ranked.length} trips archived · public trips only
            </p>
          )}
        </div>

        {/* Board */}
        {ranked.length === 0 ? (
          <div className="py-24 text-center space-y-4">
            <p
              className="font-mono text-[9px] uppercase tracking-[0.5em]"
              style={{ color: 'rgba(245,240,232,0.2)' }}
            >
              NO PUBLIC TRIPS YET
            </p>
            <p className="font-display italic text-sm" style={{ color: 'rgba(245,240,232,0.35)' }}>
              The Hall of Chaos is empty. Be the first to make your trip public.
            </p>
            <Link
              href="/trips/new"
              className="inline-block mt-4 px-6 py-3 rounded-full font-mono text-[9px] uppercase tracking-widest"
              style={{ border: '1px solid rgba(255,77,77,0.3)', color: 'rgba(255,77,77,0.8)' }}
            >
              Create a Trip →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {ranked.map((trip, i) => {
              const tier = TIER_LABEL(trip.chaos_score);
              const year = trip.trip_start_date
                ? new Date(trip.trip_start_date).getFullYear()
                : null;
              return (
                <Link
                  key={trip.id}
                  href={`/t/${trip.invite_code}`}
                  className="group flex items-center gap-4 px-5 py-4 rounded-2xl transition-all"
                  style={{
                    background: 'rgba(245,240,232,0.025)',
                    border: '1px solid rgba(245,240,232,0.07)',
                  }}
                  onMouseEnter={undefined}
                >
                  {/* Rank */}
                  <div className="w-8 text-right flex-shrink-0">
                    <span
                      className="font-display font-black text-lg"
                      style={{ color: i < 3 ? tier.color : 'rgba(245,240,232,0.2)' }}
                    >
                      {i + 1}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-display font-black text-base uppercase truncate"
                      style={{ color: 'rgba(245,240,232,0.85)' }}
                    >
                      {trip.lore_json?.trip_title ?? trip.name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {trip.destination && (
                        <span
                          className="font-mono text-[8px] uppercase tracking-wider"
                          style={{ color: 'rgba(245,240,232,0.35)' }}
                        >
                          {trip.destination}
                        </span>
                      )}
                      {year && (
                        <span
                          className="font-mono text-[8px] uppercase tracking-wider"
                          style={{ color: 'rgba(245,240,232,0.25)' }}
                        >
                          {year}
                        </span>
                      )}
                      {trip.member_count && trip.member_count > 0 && (
                        <span
                          className="font-mono text-[8px] uppercase tracking-wider"
                          style={{ color: 'rgba(245,240,232,0.25)' }}
                        >
                          {trip.member_count} people
                        </span>
                      )}
                    </div>
                    {trip.lore_json?.tagline && (
                      <p
                        className="font-display italic text-[11px] mt-1 line-clamp-1"
                        style={{ color: 'rgba(245,240,232,0.35)' }}
                      >
                        &ldquo;{trip.lore_json.tagline}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Score */}
                  <div className="flex-shrink-0 text-right space-y-0.5">
                    <p className="font-display font-black text-2xl" style={{ color: tier.color }}>
                      {trip.chaos_score}
                    </p>
                    <p
                      className="font-mono text-[7px] uppercase tracking-wider"
                      style={{ color: `${tier.color}60` }}
                    >
                      {tier.label}
                    </p>
                  </div>

                  <span
                    className="font-mono text-xs flex-shrink-0 group-hover:translate-x-1 transition-transform"
                    style={{ color: tier.color }}
                  >
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        <div
          className="mt-16 pt-8 space-y-2"
          style={{ borderTop: '1px solid rgba(245,240,232,0.06)' }}
        >
          <p
            className="font-mono text-[8px] uppercase tracking-[0.4em]"
            style={{ color: 'rgba(245,240,232,0.2)' }}
          >
            ABOUT THIS RANKING
          </p>
          <p
            className="font-display italic text-sm"
            style={{ color: 'rgba(245,240,232,0.35)', lineHeight: 1.7 }}
          >
            Chaos scores are assigned by the Yaarlore AI based on photographic evidence, behavioral
            signals, and timeline reconstruction. Only trips marked public by their creators appear
            here. No personally identifiable information is shown.
          </p>
        </div>
      </main>
    </div>
  );
}
