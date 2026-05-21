'use client';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { GroupPulse } from '@/components/experience/GroupPulse';
import { CharacterArcWidget } from '@/components/experience/CharacterArc';
import { FriendshipTimeline } from '@/components/experience/FriendshipTimeline';

// ─────────────────────────────────────────────────────────────────────────────
// FIRST-TIME WELCOME MODAL
// ─────────────────────────────────────────────────────────────────────────────
function WelcomeModal({ onDismiss }: { onDismiss: () => void }) {
  const steps = [
    { icon: '📸', label: 'Upload photos', desc: 'Drop in your recovered memories from the trip' },
    { icon: '🤖', label: 'AI generates lore', desc: 'Our engine writes your trip documentary' },
    {
      icon: '🎬',
      label: 'Share your documentary',
      desc: 'Send the chaos-scored story to your crew',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(6,6,4,0.88)', backdropFilter: 'blur(12px)' }}
      onClick={e => {
        if (e.target === e.currentTarget) onDismiss();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
        className="relative w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: '#0C0B09',
          border: '1px solid rgba(245,240,232,0.12)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
          animation: 'welcome-rise 0.55s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {/* Red accent stripe */}
        <div
          className="h-1 w-full"
          style={{ background: 'linear-gradient(90deg,#FF4D4D,#FF4D4D55)' }}
        />

        <div className="px-8 pt-8 pb-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <p
              className="font-mono text-[8px] uppercase tracking-[0.55em]"
              style={{ color: '#FF4D4D' }}
            >
              ● FIRST MISSION
            </p>
            <h2
              id="welcome-modal-title"
              className="font-display font-black uppercase tracking-tighter leading-none"
              style={{ fontSize: 'clamp(28px,7vw,36px)', color: '#F5F0E8' }}
            >
              Welcome to
              <br />
              <em className="italic" style={{ color: '#FF4D4D' }}>
                Yaarlore
              </em>
            </h2>
            <p
              className="font-display italic text-sm leading-relaxed"
              style={{ color: 'rgba(245,240,232,0.5)' }}
            >
              Your friend group&apos;s trips become mythology. Upload photos &rarr; AI generates
              your documentary.
            </p>
          </div>

          {/* 3-step visual */}
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-4 px-4 py-3 rounded-2xl"
                style={{
                  background: 'rgba(245,240,232,0.05)',
                  border: '1px solid rgba(245,240,232,0.14)',
                  animationDelay: `${0.2 + i * 0.1}s`,
                }}
              >
                <span className="text-xl flex-shrink-0 mt-0.5">{step.icon}</span>
                <div>
                  <p
                    className="font-mono text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: '#F5F0E8' }}
                  >
                    {step.label}
                  </p>
                  <p
                    className="font-display italic text-[12px] mt-0.5"
                    style={{ color: 'rgba(245,240,232,0.65)' }}
                  >
                    {step.desc}
                  </p>
                </div>
                {i < steps.length - 1 && <div className="absolute left-[2.65rem]" />}
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            href="/trips/new"
            className="block w-full py-4 rounded-full text-center font-ui font-black text-[10px] uppercase tracking-widest transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: '#F5F0E8', color: '#060604' }}
            onClick={onDismiss}
          >
            Create your first trip &rarr;
          </Link>

          <button
            onClick={onDismiss}
            className="block w-full text-center font-mono text-[8px] uppercase tracking-[0.4em] hover:opacity-60 transition-opacity"
            style={{ color: 'rgba(245,240,232,0.3)' }}
          >
            Maybe later
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes welcome-rise {
          from {
            opacity: 0;
            transform: translate3d(0, 32px, 0) scale(0.96);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
            filter: blur(0);
          }
        }
      `}</style>
    </div>
  );
}

const SEASON_ACCENTS = ['#FF4D4D', '#2D9E8B', '#7C6AFF', '#D49E2D', '#C94B9E', '#2D6E9E'];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

function seasonAccent(name: string) {
  return SEASON_ACCENTS[hashName(name) % SEASON_ACCENTS.length];
}

// AudioContext is intentionally module-level so oscillators from the same
// page session share one context (browsers cap concurrent contexts).
// It's never explicitly closed — the browser GC's it on page unload.
// Closure is NOT called on client-nav because that would cut off any
// currently-playing chime mid-note; the next page load creates a fresh one.
let sharedAudioCtx: AudioContext | null = null;

function playHomeChime(pitchMultiplier = 1.0, volume = 0.02) {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }

    const ctx = sharedAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const freqs = [523.25, 587.33, 659.25, 783.99, 880.0]; // Pentatonic Major
    const baseFreq = freqs[Math.floor(Math.random() * freqs.length)];

    osc.type = 'sine';
    osc.frequency.value = baseFreq * pitchMultiplier;

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.0);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.1);
  } catch (_) {}
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
    <div className="px-8 py-5" style={{ borderBottom: '1px solid rgba(245,240,232,0.12)' }}>
      <p
        className="font-mono text-[8px] uppercase tracking-[0.55em] mb-4"
        style={{ color: '#FF4D4D' }}
      >
        ● THIS DAY IN HISTORY
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {moments.map((m: any) => (
          <a
            key={m.photo_id}
            href={`/trips/${m.trip_id}`}
            className="nostalgia-thumb flex-shrink-0 relative rounded-xl overflow-hidden"
            style={{
              width: 80,
              height: 80,
              background: 'rgba(245,240,232,0.03)',
              border: '1px solid rgba(245,240,232,0.12)',
              transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}
            onMouseEnter={() => playHomeChime(1.2, 0.015)}
          >
            {m.thumbnailUrl || m.url ? (
              <img
                src={m.thumbnailUrl ?? m.url}
                alt={`Photo from ${m.trip_name}, ${m.years_ago} year${m.years_ago !== 1 ? 's' : ''} ago`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{ width: '100%', height: '100%', background: 'rgba(245,240,232,0.08)' }}
              />
            )}
            <div
              className="absolute inset-0 flex flex-col justify-end p-1.5"
              style={{ background: 'linear-gradient(to top, rgba(16,12,8,0.8) 40%, transparent)' }}
            >
              <p
                className="font-mono text-[7px] font-bold leading-none"
                style={{ color: '#FF4D4D' }}
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
  const { data: tripsData, isLoading } = trpc.trips.listMine.useQuery({});
  const trips = tripsData?.trips;
  const { data: chaosDist } = trpc.trips.getChaosDistribution.useQuery();
  const [revealed, setRevealed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 120);
    return () => clearTimeout(t);
  }, []);

  // Show welcome modal once for brand-new users who have no trips yet
  useEffect(() => {
    if (isLoading) return;
    const hasSeenWelcome = localStorage.getItem('yaarlore_welcomed');
    if (!hasSeenWelcome && (trips?.length ?? 0) === 0) {
      setShowWelcome(true);
    }
  }, [trips, isLoading]);

  const handleDismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('yaarlore_welcomed', '1');
  };

  return (
    <div className="min-h-screen" style={{ background: '#060604', color: '#F5F0E8' }}>
      {showWelcome && <WelcomeModal onDismiss={handleDismissWelcome} />}
      <div className="film-grain pointer-events-none" />

      {/* Header */}
      <header
        className="relative z-10 flex items-end justify-between px-8 pt-12 pb-8"
        style={{ borderBottom: '1px solid rgba(245,240,232,0.12)' }}
      >
        <div className="space-y-1">
          <p
            className="font-mono text-[8px] uppercase tracking-[0.6em]"
            style={{
              color: '#FF4D4D',
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
              color: '#F5F0E8',
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
              filter: revealed ? 'blur(0px)' : 'blur(6px)',
              transition:
                'opacity 0.75s cubic-bezier(0.16,1,0.3,1) 0.12s, transform 0.75s cubic-bezier(0.16,1,0.3,1) 0.12s, filter 0.75s cubic-bezier(0.16,1,0.3,1) 0.12s',
              willChange: 'transform, opacity',
            }}
          >
            THE{' '}
            <em className="italic" style={{ color: '#FF4D4D' }}>
              SEASONS
            </em>
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Join an existing trip — visible on all screen sizes */}
          <Link
            href="/trips/join"
            className="nav-btn-teal flex items-center gap-2 px-3 sm:px-4 py-3 rounded-full font-ui font-black text-[10px] uppercase tracking-widest active:scale-95"
            style={{
              background: 'rgba(45,158,139,0.08)',
              border: '1px solid rgba(45,158,139,0.25)',
              color: 'rgba(45,158,139,0.8)',
              opacity: revealed ? 1 : 0,
              transition:
                'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.14s, transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s, color 0.3s',
              willChange: 'transform, opacity',
            }}
          >
            <span className="hidden sm:inline">JOIN TRIP</span>
            <span className="sm:hidden" aria-label="Join trip">
              +
            </span>
          </Link>
          {/* Hall of Chaos leaderboard */}
          <Link
            href="/leaderboard"
            className="nav-btn-gold hidden sm:flex items-center gap-2 px-4 py-3 rounded-full font-ui font-black text-[10px] uppercase tracking-widest active:scale-95"
            style={{
              background: 'rgba(212,158,45,0.08)',
              border: '1px solid rgba(212,158,45,0.25)',
              color: 'rgba(212,158,45,0.8)',
              opacity: revealed ? 1 : 0,
              transition:
                'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.18s, transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s, color 0.3s',
              willChange: 'transform, opacity',
            }}
          >
            HALL OF CHAOS
          </Link>
          <Link
            href="/trips/new"
            className="nav-btn-primary flex items-center gap-2 px-4 sm:px-6 py-3 rounded-full font-ui font-black text-[10px] uppercase tracking-widest active:scale-95"
            style={{
              background: 'rgba(245,240,232,0.06)',
              border: '1px solid rgba(245,240,232,0.18)',
              color: '#F5F0E8',
              opacity: revealed ? 1 : 0,
              transition:
                'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.22s, transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s, background 0.3s, border-color 0.3s',
              willChange: 'transform, opacity',
            }}
            onMouseEnter={() => playHomeChime(1.4, 0.02)}
          >
            <Plus size={14} />
            <span className="hidden sm:inline">NEW SEASON</span>
            <span className="sm:hidden" aria-label="New season">
              NEW
            </span>
          </Link>
        </div>
      </header>

      {/* NostalgiaStrip — only shown when user has prior trips */}
      {(trips?.length ?? 0) > 0 && <NostalgiaStrip />}

      {/* Group Pulse — only shown when user has mythology activity.
          Comes FIRST because it shows what needs attention TODAY. */}
      {(trips?.length ?? 0) >= 2 && (
        <div className="px-8 pt-6 pb-2">
          <p
            className="font-mono text-[8px] uppercase tracking-[0.55em] mb-4"
            style={{ color: '#FF4D4D' }}
          >
            ● MYTHOLOGY IN MOTION
          </p>
          <GroupPulse />
        </div>
      )}

      {/* Content */}
      <main className="relative z-10 px-8 py-10 pb-24 animate-page-enter">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="relative flex flex-col rounded-2xl overflow-hidden"
                style={{
                  background: 'rgba(245,240,232,0.03)',
                  border: '1.5px solid rgba(245,240,232,0.08)',
                  minHeight: 220,
                  opacity: 0,
                  animation: `slide-up 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s forwards`,
                }}
              >
                {/* Header strip shimmer */}
                <div className="h-2 w-full flex-shrink-0 skeleton" />

                <div className="p-6 flex flex-col flex-1 gap-4">
                  <div className="h-2.5 rounded-full skeleton" style={{ width: '40%' }} />
                  <div className="space-y-2">
                    <div
                      className="h-6 rounded-lg skeleton"
                      style={{ width: '80%', animationDelay: '0.1s' }}
                    />
                    <div
                      className="h-6 rounded-lg skeleton"
                      style={{ width: '55%', animationDelay: '0.2s' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <div
                      className="h-2 rounded-full skeleton"
                      style={{ width: '60%', animationDelay: '0.15s' }}
                    />
                    <div
                      className="h-2 rounded-full skeleton"
                      style={{ width: '45%', animationDelay: '0.25s' }}
                    />
                  </div>
                  <div
                    className="flex items-center justify-between pt-4 mt-auto"
                    style={{ borderTop: '1px solid rgba(245,240,232,0.07)' }}
                  >
                    <div className="h-2 rounded-full skeleton" style={{ width: '30%' }} />
                    <div className="h-4 w-4 rounded-full skeleton" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : trips?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-8 text-center max-w-sm mx-auto">
            {/* Ghost chaos score */}
            <div
              className="font-display font-black select-none pointer-events-none"
              style={{
                fontSize: 'clamp(100px, 20vw, 180px)',
                color: 'rgba(255,77,77,0.04)',
                lineHeight: 1,
                letterSpacing: '-0.04em',
              }}
            >
              ?
            </div>
            <div className="space-y-3 -mt-8">
              <p
                className="font-mono text-[8px] uppercase tracking-[0.6em]"
                style={{ color: '#FF4D4D' }}
              >
                ● NO MYTHOLOGY YET
              </p>
              <h2
                className="font-display font-black text-3xl uppercase tracking-tighter"
                style={{ color: '#F5F0E8' }}
              >
                ARCHIVE EMPTY
              </h2>
              <p
                className="font-display italic text-sm leading-relaxed max-w-xs mx-auto"
                style={{ color: 'rgba(245,240,232,0.45)' }}
              >
                "Your chaos score is still unknown. Upload your trip photos and the AI will document
                what actually happened."
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/trips/new"
                className="px-8 py-4 rounded-full font-ui font-black text-[10px] uppercase tracking-widest"
                style={{
                  background: '#F5F0E8',
                  color: '#060604',
                  transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.transform = 'translate3d(0,-2px,0)';
                  el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                  playHomeChime(1.3, 0.02);
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.transform = 'translate3d(0,0,0)';
                  el.style.boxShadow = 'none';
                }}
              >
                CREATE YOUR FIRST TRIP →
              </Link>
              <Link
                href="/trips/join"
                className="px-8 py-4 rounded-full font-ui font-black text-[10px] uppercase tracking-widest"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(45,158,139,0.3)',
                  color: 'rgba(45,158,139,0.8)',
                  transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'translate3d(0,-2px,0)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'translate3d(0,0,0)';
                }}
              >
                JOIN A TRIP
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {trips?.map((trip, idx) => {
              const accent = seasonAccent(trip.name ?? '');
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const loreStatus = (trip as any).lore_status ?? 'default';
              const chaosScore = (trip as any).chaos_score ?? null;
              const loreJson = (trip as any).lore_json as {
                tagline?: string;
                cooked_verdict?: string;
              } | null;
              const tagline = loreStatus === 'ready' ? (loreJson?.tagline ?? null) : null;
              const cookedVerdict =
                loreStatus === 'ready' ? (loreJson?.cooked_verdict ?? null) : null;
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
                  ? accent
                  : loreStatus === 'processing'
                    ? '#D49E2D'
                    : '#FF4D4D';

              const cardLabel = [
                trip.name,
                trip.destination ? `in ${trip.destination}` : '',
                loreStatus === 'ready' && chaosScore != null ? `Chaos score: ${chaosScore}` : '',
                loreStatus === 'ready'
                  ? 'Lore archived'
                  : loreStatus === 'processing'
                    ? 'Generating lore'
                    : 'Active',
              ]
                .filter(Boolean)
                .join(', ');

              return (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  aria-label={cardLabel}
                  className="group relative flex flex-col rounded-2xl overflow-hidden"
                  style={{
                    background: 'rgba(245,240,232,0.03)',
                    border: '1.5px solid rgba(245,240,232,0.12)',
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
                    playHomeChime(0.85 + (idx % 4) * 0.08, 0.018);
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.transform = 'translate3d(0,0,0)';
                    el.style.boxShadow = 'none';
                    el.style.borderColor = 'rgba(245,240,232,0.12)';
                  }}
                >
                  {/* Poster strip — the colored gradient "poster" */}
                  <div
                    className="h-2 w-full flex-shrink-0"
                    style={{ background: `linear-gradient(90deg, ${accent}cc, ${accent}55)` }}
                  />

                  <div className="p-6 flex flex-col flex-1 gap-4">
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
                          className="w-2 h-2 rounded-full glow-pulse-red"
                          style={{
                            background: '#D49E2D',
                            boxShadow: '0 0 4px rgba(212,158,45,0.4)',
                          }}
                        />
                      )}
                    </div>

                    {/* Trip name */}
                    <h3
                      className="font-display font-black text-2xl leading-tight uppercase"
                      style={{ color: '#F5F0E8' }}
                    >
                      {trip.name}
                    </h3>

                    {/* Meta */}
                    <div className="space-y-2">
                      {trip.destination && (
                        <p
                          className="font-mono text-[10px] uppercase tracking-widest"
                          style={{ color: 'rgba(245,240,232,0.70)' }}
                        >
                          ◎ {trip.destination}
                        </p>
                      )}
                      {trip.trip_start_date && (
                        <p
                          className="font-vibe text-[10px] uppercase tracking-widest"
                          style={{ color: 'rgba(245,240,232,0.50)' }}
                        >
                          {new Date(trip.trip_start_date).toLocaleDateString('en', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                      {/* Tagline — the emotional reward of having lore. Shown prominently so
                          users immediately see what was generated without opening the archive. */}
                      {tagline && (
                        <p
                          className="font-display italic text-[12px] leading-snug line-clamp-2 pt-0.5"
                          style={{ color: 'rgba(245,240,232,0.55)' }}
                        >
                          &ldquo;{tagline}&rdquo;
                        </p>
                      )}
                      {/* Chaos score badge — the number users want to share */}
                      {loreStatus === 'ready' && chaosScore != null && (
                        <div className="flex items-center gap-2 pt-0.5">
                          <span
                            className="font-display font-black text-xl"
                            style={{ color: accent }}
                          >
                            {chaosScore}
                          </span>
                          <span
                            className="font-mono text-[7px] uppercase tracking-[0.3em]"
                            style={{ color: `${accent}80` }}
                          >
                            / 100 {cookedVerdict ?? 'cooked'}
                          </span>
                        </div>
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
                      className="flex items-center justify-between pt-4 mt-auto"
                      style={{ borderTop: '1px solid rgba(245,240,232,0.12)' }}
                    >
                      <p
                        className="font-mono text-[10px] uppercase tracking-[0.35em]"
                        style={{ color: 'rgba(245,240,232,0.50)' }}
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
                border: '1.5px dashed rgba(245,240,232,0.25)',
                background: 'transparent',
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
                filter: revealed ? 'blur(0px)' : 'blur(6px)',
                transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${(trips?.length ?? 0) * 0.07}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${(trips?.length ?? 0) * 0.07}s, filter 0.6s cubic-bezier(0.16,1,0.3,1) ${(trips?.length ?? 0) * 0.07}s, background 0.3s`,
                willChange: 'transform, opacity',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(245,240,232,0.03)';
                playHomeChime(1.5, 0.02);
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
              }}
            >
              <div className="space-y-3 text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
                  style={{
                    border: '1.5px solid rgba(245,240,232,0.25)',
                    background: 'rgba(245,240,232,0.06)',
                    transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
                  }}
                >
                  <Plus size={20} style={{ color: 'rgba(245,240,232,0.65)' }} />
                </div>
                <p
                  className="font-mono text-[9px] uppercase tracking-[0.4em]"
                  style={{ color: 'rgba(245,240,232,0.65)' }}
                >
                  NEW SEASON
                </p>
              </div>
            </Link>
          </div>
        )}
      </main>

      {/* Mythology depth — shown AFTER the trips grid, gated on 2+ trips.
          Progressive disclosure: users discover their arc after they've seen
          their trips. Not presented before they understand what they're building. */}
      {(trips?.length ?? 0) >= 2 && (
        <div className="px-8 pb-24 space-y-8">
          <div className="w-full h-px" style={{ background: 'rgba(245,240,232,0.06)' }} />
          {/* Character arc compact — your evolving identity */}
          <CharacterArcWidget />
          {/* Friendship timeline — your mythology across all trips */}
          <FriendshipTimeline />
        </div>
      )}

      {/* Footer */}
      <footer
        className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-8 py-3 z-20"
        style={{
          borderTop: '1px solid rgba(245,240,232,0.08)',
          background: 'rgba(6, 6, 4, 0.92)',
          backdropFilter: 'blur(12px)',
          paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <p
          className="font-mono text-[9px] uppercase tracking-[0.4em]"
          style={{ color: 'rgba(245,240,232,0.5)' }}
        >
          YAARLORE
        </p>
        <nav className="flex items-center gap-5" aria-label="Footer links">
          {[
            { href: '/contact', label: 'Contact' },
            { href: '/privacy', label: 'Privacy' },
            { href: '/terms', label: 'Terms' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="font-mono text-[8px] uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
              style={{ color: 'rgba(245,240,232,0.3)' }}
            >
              {label}
            </Link>
          ))}
        </nav>
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
