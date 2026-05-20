import { createSupabaseServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { LoreJson } from '@/lib/types';
import { FilmGrain, AtmosphericBlob, CinematicText } from '@/components/ui/atoms';
import { ArchiveFooter } from '@/components/cinematic/ArchiveRoom';
import { Image as ImageIcon, Film, Users, Calendar } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, destination, lore_json, chaos_score, story_visible')
    .eq('invite_code', code.toUpperCase())
    .single();

  if (!trip) return { title: 'Yaarlore' };

  if ((trip as any).story_visible === false) {
    return {
      title: 'Story hidden — Yaarlore',
      description: 'This trip story is private.',
      robots: { index: false, follow: false },
    };
  }

  const lore = (trip as any).lore_json as LoreJson | null;
  const tripId = (trip as any).id as string;

  return {
    title: lore?.trip_title || (trip as any).name,
    description: lore?.tagline || `${(trip as any).destination} trip archive`,
    openGraph: {
      title: lore?.trip_title || (trip as any).name,
      description: lore?.tagline,
      images: [
        {
          url: `/api/card/${tripId}`,
          width: 1200,
          height: 630,
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
    .select(
      'id, name, destination, chaos_score, member_count, total_photos, lore_json, tier, invite_code, trip_start_date, trip_end_date, story_visible'
    )
    .eq('invite_code', code.toUpperCase())
    .single();

  if (!tripData) {
    // Invite code doesn't exist. Show a real not-found state instead of bouncing
    // the visitor home with no explanation.
    return <PublicNotFound code={code} />;
  }
  const trip = tripData as any;

  if (trip.story_visible === false) {
    return <PublicLoreHidden inviteCode={trip.invite_code} />;
  }

  const lore = trip.lore_json as LoreJson | null;
  if (!lore) {
    // The trip exists but the AI hasn't written its story yet. Don't redirect
    // anon visitors into the auth-walled /trips/join — show a clear "story
    // still being written" placeholder with the trip name they were sent.
    return <PublicLorePending tripName={trip.name} inviteCode={trip.invite_code} />;
  }

  const cookedLevel = lore.cooked_level ?? trip.chaos_score ?? 60;
  const duration = computeDays(trip.trip_start_date, trip.trip_end_date);

  return (
    <div className="min-h-screen bg-black text-[#F5F0E8] font-cinematic selection:bg-cooked-accent selection:text-white overflow-x-hidden">
      <FilmGrain />

      {/* Immersive Teaser Hero */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 py-20 overflow-hidden">
        <AtmosphericBlob
          color="#FF3B2F"
          className="top-[-10%] right-[-10%] w-[600px] h-[600px] opacity-20"
        />
        <AtmosphericBlob
          color="#D49E2D"
          className="bottom-[10%] left-[-10%] w-[400px] h-[400px] opacity-10"
        />

        {/* Brand-coherent gradient background — no stock photography pretending
            to be the user's trip. The trip's own cover/portrait art (when
            generated) is surfaced by the OG card route. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(255,77,77,0.08), transparent 70%), radial-gradient(ellipse 60% 80% at 50% 100%, rgba(212,158,45,0.05), transparent 70%)',
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto w-full space-y-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.4em] text-white/40 font-black flex-wrap">
              <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10">
                Archive
              </span>
              {trip.destination && <span>{trip.destination}</span>}
              <span className="w-1.5 h-1.5 rounded-full bg-cooked-accent animate-pulse" />
            </div>

            <h1 className="text-7xl md:text-[12vw] font-black tracking-tighter leading-[0.8] uppercase font-cinematic">
              {lore.trip_title.split(' ').map((word: string, i: number) => (
                <span
                  key={i}
                  className={
                    i % 2 === 1 ? 'italic text-cooked-accent block md:inline' : 'block md:inline'
                  }
                >
                  {word}{' '}
                </span>
              ))}
            </h1>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-12">
            <div className="flex-1 space-y-6">
              <p className="text-3xl md:text-4xl font-cinematic italic text-white/80 leading-tight">
                &ldquo;{lore.tagline}&rdquo;
              </p>
              <div className="h-px w-20 bg-cooked-accent" />
            </div>

            <div className="flex items-baseline gap-6 bg-white/[0.03] border border-white/5 p-8 rounded-[3rem] backdrop-blur-xl">
              <span className="text-8xl font-vibe font-black tracking-tighter leading-none text-cooked-accent animate-number-reveal">
                {cookedLevel}
              </span>
              <div className="flex flex-col">
                <span className="text-xl font-vibe font-black uppercase tracking-tight text-white/90 leading-none">
                  {lore.cooked_verdict}
                </span>
                <span className="text-[9px] text-white/45 font-black uppercase tracking-[0.2em] mt-2">
                  Chaos Rating
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid — every card is a real number from the trip.
              The previous "Security: Encrypted" and "Status: Live Lore" cards
              were decoration; they've been replaced with photo and chapter
              counts so visitors see actual scale of the archive. */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Users size={14} />}
              label="Cast"
              value={trip.member_count ? `${trip.member_count}` : '—'}
            />
            <StatCard icon={<Calendar size={14} />} label="Runtime" value={`${duration} Days`} />
            <StatCard
              icon={<ImageIcon size={14} />}
              label="Evidence"
              value={trip.total_photos ? `${trip.total_photos}` : '—'}
            />
            <StatCard
              icon={<Film size={14} />}
              label="Eras"
              value={lore.trip_eras?.length ? `${lore.trip_eras.length}` : '—'}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-6 pt-12">
            <Link
              href={`/t/${trip.invite_code}/story`}
              className="group flex items-center justify-center gap-4 px-12 py-8 bg-[#F5F0E8] text-black rounded-full font-black uppercase tracking-[0.3em] text-[11px] hover:scale-105 active:scale-95 transition-all shadow-[0_0_60px_rgba(245,240,232,0.1)]"
            >
              View Full Story
              <ArrowRight className="group-hover:translate-x-2 transition-transform" />
            </Link>
            <Link
              href={`/trips/join?code=${trip.invite_code}`}
              className="flex items-center justify-center gap-4 px-12 py-8 border border-white/10 bg-white/[0.03] text-white/60 rounded-full font-black uppercase tracking-[0.3em] text-[11px] hover:bg-white/10 hover:text-white transition-all"
            >
              Join the Season
            </Link>
          </div>
        </div>
      </section>

      {/* Trip Eras teaser — gives visitors a feel for the story structure */}
      {lore.trip_eras && lore.trip_eras.length > 0 && (
        <section className="px-6 py-20 border-t border-white/5">
          <div className="max-w-4xl mx-auto space-y-8 reveal">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white/55">
                THE ERAS
              </p>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-cooked-accent/60">
                {lore.trip_eras.length} CHAPTERS
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {lore.trip_eras.map((era: any, i: number) => (
                <div
                  key={i}
                  className="p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/5 space-y-2"
                >
                  <p className="text-[9px] font-black uppercase tracking-[0.35em] text-white/50">
                    {era.timeframe ?? `Chapter ${i + 1}`}
                  </p>
                  <p className="font-cinematic font-black text-lg uppercase leading-tight text-white/80">
                    {era.era_name}
                  </p>
                  {era.defining_moment && (
                    <p className="text-[11px] font-cinematic italic text-white/40 leading-snug line-clamp-2">
                      {era.defining_moment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recap Section */}
      {lore.season_recap?.full_narrative && (
        <section className="px-6 py-40 border-t border-white/5 bg-white/[0.01] relative overflow-hidden reveal">
          <AtmosphericBlob
            color="#FF3B2F"
            className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-[0.03]"
          />
          <div className="max-w-3xl mx-auto space-y-12 relative z-10 text-center">
            <CinematicText variant="eyebrow" className="text-white/20">
              The Oral History
            </CinematicText>
            <p className="text-3xl md:text-5xl font-cinematic italic text-[#F5F0E8] leading-[1.2] tracking-tight">
              &ldquo;{lore.season_recap.full_narrative}&rdquo;
            </p>
            <div className="text-[9px] uppercase tracking-[0.5em] text-white/25 font-black">
              Archive Extract 88.2
            </div>
          </div>
        </section>
      )}

      <ArchiveFooter
        publicUrl={`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/t/${trip.invite_code}`}
        posterUrl={`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/card/${trip.id}`}
      />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-6 rounded-[2rem] bg-white/[0.04] border border-white/10 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-white/55 font-black">
        {icon} {label}
      </div>
      <div className="text-base font-black text-white/90">{value}</div>
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14m-7-7 7 7-7 7" />
    </svg>
  );
}

function computeDays(start: string | null, end: string | null): number {
  if (!start || !end) return 3;
  return Math.max(
    1,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
  );
}

// Shown when a shared invite code doesn't match any trip.
// Anon-visitor safe: no auth wall, no silent /home bounce.
function PublicNotFound({ code }: { code: string }) {
  return (
    <div className="min-h-screen bg-[#060604] text-[#F5F0E8] flex flex-col items-center justify-center px-6 text-center font-mono">
      <FilmGrain />
      <p className="text-[10px] uppercase tracking-[0.6em] text-[rgba(255,77,77,0.5)] mb-6">
        ● ARCHIVE NOT FOUND
      </p>
      <h1 className="text-3xl font-black uppercase tracking-tighter text-[#F5F0E8] mb-3">
        No such trip
      </h1>
      <p className="text-sm text-white/40 max-w-xs leading-relaxed mb-8">
        The link <span className="text-white/70">/t/{code.toUpperCase()}</span> isn&apos;t a trip we
        know about. Check the code with whoever sent it.
      </p>
      <Link
        href="/"
        className="px-7 py-3.5 rounded-full text-[10px] uppercase tracking-widest text-white/55 border border-white/10 hover:bg-white/5 transition-all"
      >
        ← Yaarlore
      </Link>
    </div>
  );
}

// Shown when the trip exists but the AI hasn't finished writing the story.
// Replaces a redirect to the auth-walled /trips/join so anon visitors aren't
// silently bounced into login.
function PublicLorePending({
  tripName,
  inviteCode,
}: {
  tripName: string | null;
  inviteCode: string | null;
}) {
  return (
    <div className="min-h-screen bg-[#060604] text-[#F5F0E8] flex flex-col items-center justify-center px-6 text-center font-mono">
      <FilmGrain />
      <p className="text-[10px] uppercase tracking-[0.6em] text-[rgba(212,158,45,0.6)] mb-6 animate-pulse">
        ◌ STILL WRITING
      </p>
      <h1 className="text-3xl font-black uppercase tracking-tighter text-[#F5F0E8] mb-3 max-w-md">
        {tripName ?? 'This trip'} doesn&apos;t have its story yet
      </h1>
      <p className="text-sm text-white/40 max-w-sm leading-relaxed mb-8">
        Yaarlore is still reading the photos. Come back in a couple of minutes — once the
        documentary drops you&apos;ll see it here.
      </p>
      {inviteCode && (
        <Link
          href={`/trips/join?code=${inviteCode}`}
          className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors"
        >
          On this trip? Join to upload photos →
        </Link>
      )}
    </div>
  );
}

function PublicLoreHidden({ inviteCode }: { inviteCode: string | null }) {
  return (
    <div className="min-h-screen bg-[#060604] text-[#F5F0E8] flex flex-col items-center justify-center px-6 text-center font-mono">
      <FilmGrain />
      <p className="text-[10px] uppercase tracking-[0.6em] text-white/35 mb-6">● ARCHIVE SEALED</p>
      <h1 className="text-3xl font-black uppercase tracking-tighter text-[#F5F0E8] mb-3 max-w-md">
        This story is private
      </h1>
      <p className="text-sm text-white/40 max-w-sm leading-relaxed mb-8">
        The trip creator has hidden this public lore page. Members can still open it from their
        private trip room.
      </p>
      {inviteCode && (
        <Link
          href={`/trips/join?code=${inviteCode}`}
          className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors"
        >
          On this trip? Join the season →
        </Link>
      )}
    </div>
  );
}
