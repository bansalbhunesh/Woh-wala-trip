'use client';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { Plus } from 'lucide-react';
import { useState, useEffect } from 'react';

const SEASON_ACCENTS = ['#FF4D4D', '#2D9E8B', '#7C6AFF', '#D49E2D', '#C94B9E', '#2D6E9E'];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

function seasonAccent(name: string) {
  return SEASON_ACCENTS[hashName(name) % SEASON_ACCENTS.length];
}

function chaosPercentileLabel(
  score: number | null | undefined,
  dist: { p50: number; p75: number; p90: number } | null | undefined
): string | null {
  if (!score || !dist) return null;
  if (score >= dist.p90) return 'TOP 10% CHAOS';
  if (score >= dist.p75) return 'TOP 25% CHAOS';
  if (score >= dist.p50) return 'ABOVE AVERAGE';
  return null;
}

function NostalgiaStrip() {
  const { data: moments, isLoading } = trpc.photos.nostalgiaFeed.useQuery({ limit: 8 });
  if (isLoading || !moments || moments.length === 0) return null;

  return (
    <div className="px-8 py-5" style={{ borderBottom: '1px solid oklch(87% 0.015 72)' }}>
      <p
        className="font-mono text-[8px] uppercase tracking-[0.55em] mb-4"
        style={{ color: 'oklch(60% 0.22 25)' }}
      >
        ● THIS DAY IN HISTORY
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {moments.map((m: any) => (
          <a
            key={m.photo_id}
            href={`/trips/${m.trip_id}`}
            className="flex-shrink-0 relative rounded-xl overflow-hidden"
            style={{
              width: 80,
              height: 80,
              background: 'oklch(93.5% 0.012 72)',
              border: '1px solid oklch(87% 0.015 72)',
              transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.06)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
            }}
          >
            {m.thumbnailUrl || m.url ? (
              <img
                src={m.thumbnailUrl ?? m.url}
                alt={m.trip_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'oklch(90% 0.015 72)' }} />
            )}
            <div
              className="absolute inset-0 flex flex-col justify-end p-1.5"
              style={{ background: 'linear-gradient(to top, rgba(16,12,8,0.8) 40%, transparent)' }}
            >
              <p
                className="font-mono text-[7px] font-bold leading-none"
                style={{ color: 'oklch(60% 0.22 25)' }}
              >
                {m.years_ago}Y AGO
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function TripsPage() {
  const { data: trips, isLoading } = trpc.trips.listMine.useQuery();
  const { data: chaosDist } = trpc.trips.getChaosDistribution.useQuery();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ background: 'oklch(97% 0.008 70)', color: 'oklch(16% 0.015 60)' }}
    >
      <div className="light-grain" />

      {/* Header */}
      <header
        className="relative z-10 flex items-end justify-between px-8 pt-12 pb-8"
        style={{ borderBottom: '1px solid oklch(87% 0.015 72)' }}
      >
        <div className="space-y-1">
          <p
            className="font-mono text-[8px] uppercase tracking-[0.6em]"
            style={{
              color: 'oklch(60% 0.22 25)',
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
              filter: revealed ? 'blur(0px)' : 'blur(6px)',
              transition:
                'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s, transform 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s, filter 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s',
              willChange: 'transform, opacity',
            }}
          >
            ● YOUR ARCHIVES
          </p>
          <h1
            className="font-display font-black uppercase tracking-tighter leading-[0.85]"
            style={{
              fontSize: 'clamp(36px, 6vw, 72px)',
              color: 'oklch(16% 0.015 60)',
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
              filter: revealed ? 'blur(0px)' : 'blur(6px)',
              transition:
                'opacity 0.75s cubic-bezier(0.16,1,0.3,1) 0.12s, transform 0.75s cubic-bezier(0.16,1,0.3,1) 0.12s, filter 0.75s cubic-bezier(0.16,1,0.3,1) 0.12s',
              willChange: 'transform, opacity',
            }}
          >
            THE{' '}
            <em className="italic" style={{ color: 'oklch(60% 0.22 25)' }}>
              SEASONS
            </em>
          </h1>
        </div>

        <Link
          href="/trips/new"
          className="flex items-center gap-2 px-6 py-3 rounded-full font-ui font-black text-[10px] uppercase tracking-widest active:scale-95"
          style={{
            background: 'oklch(16% 0.015 60)',
            color: 'oklch(97% 0.008 70)',
            opacity: revealed ? 1 : 0,
            transition:
              'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.22s, transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s',
            willChange: 'transform',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.transform = 'translate3d(0,-2px,0)';
            el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.transform = 'translate3d(0,0,0)';
            el.style.boxShadow = 'none';
          }}
        >
          <Plus size={14} /> NEW SEASON
        </Link>
      </header>

      <NostalgiaStrip />

      {/* Content */}
      <main className="relative z-10 px-8 py-10 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-5">
            <div
              className="w-8 h-8 rounded-full"
              style={{
                border: '2px solid oklch(87% 0.015 72)',
                borderTopColor: 'oklch(60% 0.22 25)',
                animation: 'trips-spin 0.9s linear infinite',
              }}
            />
            <p
              className="font-mono text-[8px] uppercase tracking-[0.6em]"
              style={{ color: 'oklch(70% 0.015 60)' }}
            >
              LOADING ARCHIVES...
            </p>
          </div>
        ) : trips?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-8 text-center max-w-sm mx-auto">
            <div
              className="w-px h-16 mx-auto"
              style={{
                background:
                  'linear-gradient(to bottom, transparent, oklch(60% 0.22 25 / 0.4), transparent)',
              }}
            />
            <div className="space-y-3">
              <p
                className="font-mono text-[8px] uppercase tracking-[0.6em]"
                style={{ color: 'oklch(60% 0.22 25)' }}
              >
                NO LORE YET
              </p>
              <h2
                className="font-display font-black text-3xl uppercase"
                style={{ color: 'oklch(16% 0.015 60)' }}
              >
                ARCHIVE EMPTY
              </h2>
              <p className="font-display italic text-sm" style={{ color: 'oklch(52% 0.015 60)' }}>
                "No friendship has been documented yet."
              </p>
            </div>
            <Link
              href="/trips/new"
              className="px-8 py-4 rounded-full font-ui font-black text-[10px] uppercase tracking-widest"
              style={{
                background: 'oklch(16% 0.015 60)',
                color: 'oklch(97% 0.008 70)',
                transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = 'translate3d(0,-2px,0)';
                el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = 'translate3d(0,0,0)';
                el.style.boxShadow = 'none';
              }}
            >
              INITIALIZE FIRST SEASON →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {trips?.map((trip, idx) => {
              const accent = seasonAccent(trip.name ?? '');
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const loreStatus = (trip as any).lore_status ?? 'default';
              const chaosScore = (trip as any).chaos_score ?? null;
              const percentileLabel =
                loreStatus === 'ready' ? chaosPercentileLabel(chaosScore, chaosDist) : null;
              const animDelay = idx * 0.07;

              const statusLabel =
                loreStatus === 'ready'
                  ? '✓ LORE ARCHIVED'
                  : loreStatus === 'processing'
                    ? '◌ PROCESSING'
                    : '● ACTIVE';
              const statusColor =
                loreStatus === 'ready'
                  ? 'oklch(45% 0.12 180)'
                  : loreStatus === 'processing'
                    ? 'oklch(55% 0.12 85)'
                    : 'oklch(60% 0.22 25)';

              return (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="group relative block rounded-2xl overflow-hidden focus:outline-none"
                  style={{
                    background: 'oklch(93.5% 0.012 72)',
                    border: '1.5px solid oklch(87% 0.015 72)',
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
                    filter: revealed ? 'blur(0px)' : 'blur(6px)',
                    transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${animDelay}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${animDelay}s, filter 0.6s cubic-bezier(0.16,1,0.3,1) ${animDelay}s, box-shadow 0.35s cubic-bezier(0.16,1,0.3,1), border-color 0.3s`,
                    willChange: 'transform, opacity',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.transform = 'translate3d(0,-4px,0)';
                    el.style.boxShadow = `0 20px 48px rgba(0,0,0,0.12), 0 0 0 1px ${accent}30`;
                    el.style.borderColor = `${accent}50`;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.transform = 'translate3d(0,0,0)';
                    el.style.boxShadow = 'none';
                    el.style.borderColor = 'oklch(87% 0.015 72)';
                  }}
                >
                  {/* Poster strip — the colored gradient "poster" */}
                  <div
                    className="h-2 w-full"
                    style={{ background: `linear-gradient(90deg, ${accent}cc, ${accent}55)` }}
                  />

                  <div className="p-6 space-y-4">
                    {/* Status + dot */}
                    <div className="flex items-center justify-between">
                      <p
                        className="font-mono text-[9px] font-bold uppercase tracking-[0.35em]"
                        style={{ color: statusColor }}
                      >
                        {statusLabel}
                      </p>
                      {loreStatus === 'processing' && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: statusColor,
                            animation: 'trips-pulse 1.5s ease-in-out infinite',
                          }}
                        />
                      )}
                    </div>

                    {/* Trip name */}
                    <h3
                      className="font-display font-black text-2xl leading-tight"
                      style={{ color: 'oklch(16% 0.015 60)' }}
                    >
                      {trip.name}
                    </h3>

                    {/* Meta */}
                    <div className="space-y-1.5">
                      {trip.destination && (
                        <p
                          className="font-mono text-[10px]"
                          style={{ color: 'oklch(52% 0.015 60)' }}
                        >
                          ◎ {trip.destination}
                        </p>
                      )}
                      {trip.trip_start_date && (
                        <p
                          className="font-mono text-[9px]"
                          style={{ color: 'oklch(65% 0.015 60)' }}
                        >
                          {new Date(trip.trip_start_date).toLocaleDateString('en', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                      {percentileLabel && (
                        <div
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                          style={{ background: `${accent}12`, border: `1px solid ${accent}30` }}
                        >
                          <span
                            className="font-mono text-[8px] font-bold uppercase tracking-[0.3em]"
                            style={{ color: accent }}
                          >
                            {percentileLabel}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Enter cue */}
                    <div
                      className="flex items-center justify-between pt-3"
                      style={{ borderTop: '1px solid oklch(87% 0.015 72)' }}
                    >
                      <p
                        className="font-mono text-[9px] uppercase tracking-[0.35em]"
                        style={{ color: 'oklch(65% 0.015 60)' }}
                      >
                        OPEN ARCHIVE
                      </p>
                      <span
                        className="font-mono text-base font-bold group-hover:translate-x-1.5"
                        style={{
                          color: accent,
                          transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
                        }}
                      >
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Add new card */}
            <Link
              href="/trips/new"
              className="group flex flex-col items-center justify-center rounded-2xl"
              style={{
                minHeight: 200,
                border: '1.5px dashed oklch(82% 0.015 72)',
                background: 'transparent',
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
                filter: revealed ? 'blur(0px)' : 'blur(6px)',
                transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${(trips?.length ?? 0) * 0.07}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${(trips?.length ?? 0) * 0.07}s, filter 0.6s cubic-bezier(0.16,1,0.3,1) ${(trips?.length ?? 0) * 0.07}s, background 0.3s`,
                willChange: 'transform, opacity',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'oklch(93.5% 0.012 72)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
              }}
            >
              <div className="space-y-3 text-center">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mx-auto"
                  style={{
                    border: '1.5px solid oklch(82% 0.015 72)',
                    background: 'oklch(93.5% 0.012 72)',
                    transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
                  }}
                >
                  <Plus size={18} style={{ color: 'oklch(52% 0.015 60)' }} />
                </div>
                <p
                  className="font-mono text-[8px] uppercase tracking-[0.4em]"
                  style={{ color: 'oklch(65% 0.015 60)' }}
                >
                  NEW SEASON
                </p>
              </div>
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-8 py-3 z-20"
        style={{
          borderTop: '1px solid oklch(87% 0.015 72)',
          background: 'oklch(97% 0.008 70 / 0.9)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <p
          className="font-mono text-[7.5px] uppercase tracking-[0.5em]"
          style={{ color: 'oklch(65% 0.015 60)' }}
        >
          YAARLORE
        </p>
        <p
          className="font-mono text-[7.5px] uppercase tracking-[0.5em]"
          style={{ color: 'oklch(75% 0.015 60)' }}
        >
          LORE PIPELINE V2 · ACTIVE
        </p>
      </footer>

      <style jsx>{`
        @keyframes trips-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes trips-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.25;
          }
        }
      `}</style>
    </div>
  );
}
