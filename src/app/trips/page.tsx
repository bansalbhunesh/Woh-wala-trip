'use client';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { CinematicShell } from '@/components/experience/CinematicShell';
import { Plus } from 'lucide-react';
import { useState, useEffect } from 'react';

const CHAOS_COLORS: Record<string, string> = {
  ready: '#FF4D4D',
  processing: '#D49E2D',
  default: '#2D9E8B',
};

const SEASON_GLOWS: string[] = [
  'rgba(255,77,77,0.15)',
  'rgba(45,158,139,0.15)',
  'rgba(124,106,255,0.15)',
  'rgba(212,158,45,0.15)',
  'rgba(201,75,158,0.15)',
];

function seasonGlow(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return SEASON_GLOWS[Math.abs(h) % SEASON_GLOWS.length];
}

function seasonAccent(name: string) {
  const glows = ['#FF4D4D', '#2D9E8B', '#7C6AFF', '#D49E2D', '#C94B9E'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return glows[Math.abs(h) % glows.length];
}

function NostalgiaStrip() {
  const { data: moments } = trpc.photos.nostalgiaFeed.useQuery({ limit: 8 });
  if (!moments || moments.length === 0) return null;

  return (
    <div className="px-8 py-5" style={{ borderBottom: '1px solid rgba(245,240,232,0.04)' }}>
      <p className="font-mono text-[8px] uppercase tracking-[0.55em] mb-4"
         style={{ color: 'rgba(255,77,77,0.4)' }}>
        ● THIS DAY IN HISTORY
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2"
           style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {moments.map((m: any) => (
          <a
            key={m.photo_id}
            href={`/trips/${m.trip_id}`}
            className="flex-shrink-0 relative rounded-xl overflow-hidden group"
            style={{
              width: 96, height: 96,
              background: 'rgba(245,240,232,0.04)',
              border: '1px solid rgba(245,240,232,0.07)',
              transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = 'scale(1.05)'; el.style.borderColor = 'rgba(255,77,77,0.3)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = 'scale(1)'; el.style.borderColor = 'rgba(245,240,232,0.07)'; }}
          >
            {m.thumbnailUrl || m.url ? (
              <img src={m.thumbnailUrl ?? m.url} alt={m.trip_name}
                   style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'rgba(255,77,77,0.08)' }} />
            )}
            {/* Year overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-1.5"
                 style={{ background: 'linear-gradient(to top, rgba(6,6,4,0.85) 40%, transparent)' }}>
              <p className="font-mono text-[7px] font-bold"
                 style={{ color: 'rgba(255,77,77,0.9)', lineHeight: 1 }}>
                {m.years_ago}Y AGO
              </p>
              <p className="font-mono text-[6px] leading-tight"
                 style={{ color: 'rgba(245,240,232,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.destination || m.trip_name}
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
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <CinematicShell intensity={0.25}>
      {/* Film grain */}
      <div className="film-grain" />

      {/* Header */}
      <header className="relative px-8 pt-12 pb-8 flex items-end justify-between"
              style={{ borderBottom: '1px solid rgba(245,240,232,0.05)' }}>
        <div className="space-y-1">
          <p className="font-mono text-[8px] uppercase tracking-[0.6em]"
             style={{
               color: 'rgba(255,77,77,0.5)',
               opacity: revealed ? 1 : 0,
               transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
               filter: revealed ? 'blur(0px)' : 'blur(6px)',
               transition: 'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s, transform 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s, filter 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s',
               willChange: 'transform, opacity',
             }}>
            ● RECOVERED ARCHIVES
          </p>
          <h1 className="font-display font-black uppercase tracking-tighter leading-[0.85]"
              style={{
                fontSize: 'clamp(36px, 6vw, 72px)', color: 'rgba(245,240,232,0.92)',
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
                filter: revealed ? 'blur(0px)' : 'blur(6px)',
                transition: 'opacity 0.75s cubic-bezier(0.16,1,0.3,1) 0.12s, transform 0.75s cubic-bezier(0.16,1,0.3,1) 0.12s, filter 0.75s cubic-bezier(0.16,1,0.3,1) 0.12s',
                willChange: 'transform, opacity',
              }}>
            THE <em className="italic" style={{ color: '#FF4D4D' }}>SEASONS</em>
          </h1>
        </div>

        <Link
          href="/trips/new"
          className="flex items-center gap-2 px-6 py-3 rounded-full font-ui font-black text-[10px] uppercase tracking-widest active:scale-95"
          style={{
            border: '1px solid rgba(255,77,77,0.4)',
            background: 'rgba(255,77,77,0.08)',
            color: 'rgba(255,77,77,0.9)',
            boxShadow: '0 0 20px rgba(255,77,77,0.1)',
            transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1), background 0.3s ease',
            willChange: 'transform',
            opacity: revealed ? 1 : 0,
          }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = 'translate3d(0,-2px,0) scale(1.02)'; el.style.boxShadow = '0 8px 40px rgba(255,77,77,0.3)'; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = 'translate3d(0,0,0) scale(1)'; el.style.boxShadow = '0 0 20px rgba(255,77,77,0.1)'; }}
        >
          <Plus size={14} /> INITIALIZE SEASON
        </Link>
      </header>

      <NostalgiaStrip />

      {/* Content */}
      <main className="px-8 py-10 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <div className="relative w-16 h-16">
              {[1, 0.7, 0.4].map((s, i) => (
                <div key={i} className="absolute inset-0 rounded-full"
                     style={{
                       border: '1px solid rgba(255,77,77,0.3)',
                       transform: `scale(${s})`,
                       animation: `spin ${1.5 + i * 0.6}s linear infinite ${i % 2 ? 'reverse' : ''}`,
                     }} />
              ))}
            </div>
            <p className="font-mono text-[8px] uppercase tracking-[0.6em]"
               style={{ color: 'rgba(245,240,232,0.2)' }}>ACCESSING ARCHIVE...</p>
          </div>
        ) : trips?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-8 text-center max-w-sm mx-auto">
            <div className="w-px h-16 mx-auto" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,77,77,0.5), transparent)' }} />
            <div className="space-y-3">
              <p className="font-mono text-[8px] uppercase tracking-[0.6em]" style={{ color: 'rgba(255,77,77,0.4)' }}>
                NO LORE DETECTED
              </p>
              <h2 className="font-display font-black text-3xl uppercase" style={{ color: 'rgba(245,240,232,0.8)' }}>
                ARCHIVE EMPTY
              </h2>
              <p className="font-display italic text-sm" style={{ color: 'rgba(245,240,232,0.3)' }}>
                "No friendship has been documented yet."
              </p>
            </div>
            <Link href="/trips/new"
                  className="px-8 py-4 rounded-full font-ui font-black text-[10px] uppercase tracking-widest"
                  style={{ border: '1px solid rgba(255,77,77,0.4)', background: 'rgba(255,77,77,0.08)', color: 'rgba(255,77,77,0.9)', transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1)', willChange: 'transform' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = 'translate3d(0,-2px,0) scale(1.02)'; el.style.boxShadow = '0 8px 30px rgba(255,77,77,0.2)'; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = 'translate3d(0,0,0) scale(1)'; el.style.boxShadow = 'none'; }}>
              INITIALIZE FIRST SEASON →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {trips?.map((trip, idx) => {
              const accent = seasonAccent(trip.name ?? '');
              const glow = seasonGlow(trip.name ?? '');
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const loreStatus = (trip as any).lore_status ?? 'default';
              const statusColor = CHAOS_COLORS[loreStatus] ?? CHAOS_COLORS.default;
              const animDelay = idx * 0.08;

              return (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="group relative block rounded-2xl overflow-hidden focus:outline-none"
                  style={{
                    background: 'rgba(245,240,232,0.03)',
                    border: `1px solid rgba(245,240,232,0.07)`,
                    boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(245,240,232,0.04)`,
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
                    filter: revealed ? 'blur(0px)' : 'blur(6px)',
                    transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${animDelay}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${animDelay}s, filter 0.6s cubic-bezier(0.16,1,0.3,1) ${animDelay}s, box-shadow 0.4s cubic-bezier(0.16,1,0.3,1), border-color 0.3s cubic-bezier(0.16,1,0.3,1)`,
                    willChange: 'transform, opacity',
                    transformStyle: 'preserve-3d',
                  }}
                  onFocus={e => {
                    // Keyboard focus: lift + glow (no 3D tilt)
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.transform = 'translate3d(0,-4px,0)';
                    el.style.borderColor = `${accent}60`;
                    el.style.boxShadow = `0 20px 52px rgba(0,0,0,0.5), 0 0 40px ${glow}`;
                  }}
                  onBlur={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.transform = 'translate3d(0,0,0)';
                    el.style.borderColor = 'rgba(245,240,232,0.07)';
                    el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(245,240,232,0.04)';
                  }}
                  onMouseMove={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    const r = el.getBoundingClientRect();
                    const x = (e.clientX - r.left) / r.width - 0.5;
                    const y = (e.clientY - r.top) / r.height - 0.5;
                    el.style.transform = `perspective(800px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) translate3d(0,-4px,0)`;
                    el.style.borderColor = `${accent}40`;
                    el.style.boxShadow = `0 20px 52px rgba(0,0,0,0.5), 0 0 40px ${glow}, inset 0 1px 0 rgba(245,240,232,0.07)`;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.transform = revealed ? 'translate3d(0,0,0) perspective(800px) rotateX(0) rotateY(0)' : '';
                    el.style.borderColor = 'rgba(245,240,232,0.07)';
                    el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(245,240,232,0.04)';
                  }}
                >
                  {/* Color glow panel */}
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl transition-opacity duration-500 group-hover:opacity-100"
                       style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.5 }} />

                  {/* Card content */}
                  <div className="p-6 space-y-5">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 min-w-0">
                        {/* Status — bigger, bolder, clearly readable */}
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em]"
                           style={{ color: statusColor, opacity: 0.85 }}>
                          {loreStatus === 'ready' ? '✓ LORE ARCHIVED' : loreStatus === 'processing' ? '◌ PROCESSING' : '● SEASON ACTIVE'}
                        </p>
                        {/* Trip name */}
                        <h3 className="font-display font-black text-2xl leading-tight"
                            style={{ color: 'rgba(245,240,232,0.95)' }}>
                          {trip.name}
                        </h3>
                      </div>
                      {/* Status dot */}
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                           style={{ background: statusColor, boxShadow: `0 0 10px ${statusColor}`, animation: loreStatus === 'processing' ? 'pulse-soft 1.5s ease-in-out infinite' : 'none' }} />
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1.5">
                      {trip.destination && (
                        <p className="font-mono text-[10px] font-medium" style={{ color: 'rgba(245,240,232,0.5)' }}>
                          ◎ {trip.destination}
                        </p>
                      )}
                      {trip.start_date && (
                        <p className="font-mono text-[10px]" style={{ color: 'rgba(245,240,232,0.35)' }}>
                          {new Date(trip.start_date).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </div>

                    {/* Bottom — enter cue */}
                    <div className="flex items-center justify-between pt-3"
                         style={{ borderTop: '1px solid rgba(245,240,232,0.08)' }}>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em]"
                         style={{ color: 'rgba(245,240,232,0.45)' }}>
                        ENTER ARCHIVE
                      </p>
                      {/* Arrow — fully visible, accent color, clear */}
                      <span className="font-mono text-base font-bold group-hover:translate-x-1.5"
                            style={{ color: accent, transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Add new card */}
            <Link href="/trips/new"
                  className="group flex flex-col items-center justify-center rounded-2xl"
                  style={{
                    minHeight: 200,
                    border: '1px dashed rgba(245,240,232,0.08)',
                    background: 'rgba(245,240,232,0.02)',
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? 'translate3d(0,0,0) scale(1)' : 'translate3d(0,24px,0) scale(0.95)',
                    filter: revealed ? 'blur(0px)' : 'blur(6px)',
                    transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${(trips?.length ?? 0) * 0.08}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${(trips?.length ?? 0) * 0.08}s, filter 0.6s cubic-bezier(0.16,1,0.3,1) ${(trips?.length ?? 0) * 0.08}s`,
                    willChange: 'transform, opacity',
                  }}>
              <div className="space-y-3 text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto"
                     style={{ border: '1px solid rgba(255,77,77,0.25)', background: 'rgba(255,77,77,0.05)', transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)' }}
                     onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)'; }}
                     onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}>
                  <Plus size={18} style={{ color: 'rgba(255,77,77,0.5)' }} />
                </div>
                <p className="font-mono text-[8px] uppercase tracking-[0.4em]" style={{ color: 'rgba(245,240,232,0.2)' }}>
                  NEW SEASON
                </p>
              </div>
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-8 py-3 z-20"
              style={{ borderTop: '1px solid rgba(245,240,232,0.04)', background: 'rgba(6,6,4,0.8)', backdropFilter: 'blur(12px)' }}>
        <p className="font-mono text-[7.5px] uppercase tracking-[0.5em]" style={{ color: 'rgba(245,240,232,0.15)' }}>
          YAARLORE
        </p>
        <p className="font-mono text-[7.5px] uppercase tracking-[0.5em]" style={{ color: 'rgba(245,240,232,0.1)' }}>
          LORE PIPELINE V2 · ACTIVE
        </p>
      </footer>

      <style jsx>{`
        /* spin defined in globals.css */
        @keyframes pulse-soft { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </CinematicShell>
  );
}
