// FEAT: Hall of Chaos — public leaderboard of the most cooked friend groups.
// Server component — no auth required; only public, story_visible=true trips are shown.

import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hall of Chaos — Yaarlore',
  description:
    "The most cooked friend groups in Yaarlore, ranked by chaos score. India's most unhinged trips, documented by AI.",
  openGraph: {
    title: 'Hall of Chaos — Yaarlore',
    description: 'Top 10 most chaotic Indian friend groups, ranked by AI chaos score.',
    type: 'website',
  },
};

// Revalidate every 10 minutes — leaderboard doesn't need real-time accuracy
export const revalidate = 600;

interface LeaderboardTrip {
  id: string;
  name: string;
  destination: string | null;
  chaos_score: number | null;
  invite_code: string | null;
  lore_json: Record<string, unknown> | null;
}

function rankMedal(i: number): string {
  if (i === 0) return 'GOLD';
  if (i === 1) return 'SILVER';
  if (i === 2) return 'BRONZE';
  return `#${i + 1}`;
}

function rankColor(i: number): string {
  if (i === 0) return '#D49E2D';
  if (i === 1) return 'rgba(245,240,232,0.6)';
  if (i === 2) return '#C17B3A';
  return 'rgba(245,240,232,0.3)';
}

function chaosColor(score: number | null): string {
  if (!score) return '#2D9E8B';
  if (score >= 85) return '#FF4D4D';
  if (score >= 70) return '#D49E2D';
  if (score >= 50) return '#7C6AFF';
  return '#2D9E8B';
}

function chaosTier(score: number | null): string {
  if (!score) return 'Chill';
  if (score >= 85) return 'CERTIFIED UNHINGED';
  if (score >= 70) return 'COOKED';
  if (score >= 50) return 'SIMMERING';
  return 'CHILL';
}

export default async function LeaderboardPage() {
  const admin = createSupabaseServiceClient();
  const { data: rawTrips } = await admin
    .from('trips')
    .select('id, name, destination, chaos_score, invite_code, lore_json')
    .eq('lore_status', 'ready')
    .eq('story_visible', true)
    .not('chaos_score', 'is', null)
    .order('chaos_score', { ascending: false })
    .limit(10);

  const topTrips = (rawTrips ?? []) as LeaderboardTrip[];

  return (
    <main className="min-h-screen bg-[#060604] text-[#F5F0E8] relative overflow-hidden">
      {/* Background grain texture effect */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Hero header */}
      <div className="relative pt-16 pb-12 text-center px-6">
        {/* Top nav */}
        <div className="absolute top-6 left-6">
          <a
            href="/"
            className="font-mono text-[8px] uppercase tracking-[0.45em] text-white/30 hover:text-white/60 transition-colors"
          >
            ← Yaarlore
          </a>
        </div>

        <p className="font-mono text-[8px] uppercase tracking-[0.55em] mb-4 text-[#D49E2D80]">
          ● YAARLORE RANKINGS
        </p>
        <h1
          className="font-black uppercase tracking-tighter leading-none mb-3"
          style={{ fontSize: 'clamp(40px, 8vw, 80px)' }}
        >
          Hall of Chaos
        </h1>
        <p className="font-mono text-[11px] text-white/30 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
          The most cooked friend groups in Yaarlore.
          <br />
          Ranked by AI chaos score.
        </p>
      </div>

      {/* Leaderboard */}
      <div className="max-w-2xl mx-auto px-4 pb-20 space-y-3">
        {topTrips.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-mono text-white/20 text-sm uppercase tracking-widest">
              No trips ranked yet.
            </p>
            <p className="font-mono text-white/15 text-[9px] uppercase tracking-wider mt-2">
              Be the first to generate lore and go public.
            </p>
          </div>
        ) : (
          topTrips.map((trip, i) => {
            const tagline = (trip.lore_json as any)?.tagline ?? null;
            const storyHref = trip.invite_code ? `/t/${trip.invite_code}/story` : null;
            const color = chaosColor(trip.chaos_score);
            const medal = rankMedal(i);
            const medalColor = rankColor(i);

            return (
              <div
                key={trip.id}
                className="relative rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.01]"
                style={{
                  background: i < 3 ? `${color}08` : 'rgba(245,240,232,0.03)',
                  border: `1px solid ${i < 3 ? `${color}25` : 'rgba(245,240,232,0.07)'}`,
                }}
              >
                {/* Left accent bar for top 3 */}
                {i < 3 && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-0.5"
                    style={{ background: color }}
                  />
                )}

                <div className="flex items-center gap-4 px-5 py-4 pl-6">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-14 text-center">
                    <p
                      className="font-mono font-bold text-[11px] uppercase tracking-wider"
                      style={{ color: medalColor }}
                    >
                      {medal}
                    </p>
                  </div>

                  {/* Trip info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h2 className="font-black text-sm tracking-tight truncate">{trip.name}</h2>
                    </div>
                    {trip.destination && (
                      <p className="font-mono text-[9px] text-white/35 uppercase tracking-wider truncate">
                        {trip.destination}
                      </p>
                    )}
                    {tagline && (
                      <p className="font-light italic text-[11px] text-white/25 mt-0.5 truncate">
                        &ldquo;{tagline}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Chaos score + tier */}
                  <div className="flex-shrink-0 text-right">
                    <p className="font-black text-xl tabular-nums" style={{ color }}>
                      {trip.chaos_score ?? '—'}
                    </p>
                    <p
                      className="font-mono text-[7px] uppercase tracking-[0.3em]"
                      style={{ color: `${color}80` }}
                    >
                      {chaosTier(trip.chaos_score)}
                    </p>
                  </div>

                  {/* Arrow link */}
                  {storyHref && (
                    <a
                      href={storyHref}
                      aria-label={`View story for ${trip.name}`}
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                      style={{
                        background: 'rgba(245,240,232,0.06)',
                        color: 'rgba(245,240,232,0.35)',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2 6h8M7 3l3 3-3 3"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Footer CTA */}
        <div className="pt-8 text-center space-y-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-white/20">
            Think your group is more cooked?
          </p>
          <a
            href="/trips"
            className="inline-block px-8 py-3 rounded-full font-mono font-black text-[9px] uppercase tracking-[0.35em] transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(255,77,77,0.1)',
              border: '1px solid rgba(255,77,77,0.3)',
              color: 'rgba(255,77,77,0.85)',
            }}
          >
            Generate Your Lore →
          </a>
        </div>
      </div>
    </main>
  );
}
