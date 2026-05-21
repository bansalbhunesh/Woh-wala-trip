'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { trpc } from '@/lib/trpc/client';
import { analytics } from '@/lib/analytics';
import { PushNotificationToggle } from '@/components/experience/PushNotificationToggle';

const STAGES = [
  { id: 0, label: 'SCANNING MEMORIES', sub: 'Reading your photo dump for emotional evidence' },
  { id: 1, label: 'IDENTIFYING ARCHETYPES', sub: 'Detecting who started it this time' },
  { id: 2, label: 'CROSS-REFERENCING', sub: 'Connecting incidents to archetypes' },
  { id: 3, label: 'WRITING THE LORE', sub: 'Constructing your friendship mythology' },
  { id: 4, label: 'SCORING THE CHAOS', sub: 'Calculating historically cooked potential' },
  { id: 5, label: 'SEALING THE UNIVERSE', sub: 'Finalizing the memory archive' },
];

export default function GeneratingPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  // Mounted guard — prevents router.push after the component unmounts
  // (e.g. user navigates back during the 1800ms unlock animation)
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const [loreStatusResolved, setLoreStatusResolved] = useState(false);

  const { data: tripData, refetch } = trpc.trips.getFull.useQuery(
    { tripId },
    {
      refetchOnMount: true,
      // Window-focus refetch disabled — the generating page has both a Realtime
      // subscription AND a 15s polling fallback. refetchOnWindowFocus (default: true)
      // was firing an extra refetch every time the user clicked back from DevTools,
      // creating a burst of rapid-fire requests visible in the network tab.
      refetchOnWindowFocus: false,
      // Polling fallback: refetch every 15s so mobile users whose WebSocket drops
      // don't spin forever. Realtime fires immediately; polling is the safety net.
      // Stop polling once lore status is terminal (ready/failed).
      refetchInterval: loreStatusResolved ? false : 15_000,
      refetchIntervalInBackground: false,
    }
  );

  // FREEMIUM-01: check if this is the user's first generation to show the "on us" banner
  const { data: freemiumData } = trpc.trips.isFirstGeneration.useQuery(undefined, {
    staleTime: 60_000,
  });

  const resetStuckLore = trpc.trips.resetStuckLore.useMutation();

  // Single shared Supabase browser client — prevents duplicate WebSocket connections.
  const supabaseRef = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  // Stable ref for refetch — keeps channel subscription dep array stable so
  // the channel is never needlessly torn down and rebuilt between renders.
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  // Supabase Realtime — push update when lore_status changes instead of polling
  useEffect(() => {
    let mounted = true;
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`trip-lore-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`,
        },
        payload => {
          if (!mounted) return;
          const newStatus = (payload.new as any)?.lore_status;
          if (newStatus === 'ready' || newStatus === 'failed') {
            refetchRef.current();
          }
        }
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
    // Only re-subscribe when tripId changes — not when refetch changes identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trip = (tripData as any)?.trip;
  const loreStatus = trip?.lore_status;

  const [unlocking, setUnlocking] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (loreStatus === 'ready' && !unlocking) {
      setLoreStatusResolved(true);
      analytics.generationCompleted(tripId, trip?.chaos_score ?? 0);
      setUnlocking(true);
      setProgress(100);
      // Only navigate if still mounted — prevents stale push if user navigated away
      // during the 1800ms unlock animation (which corrupts Next.js router state).
      setTimeout(() => {
        if (mountedRef.current) router.push(`/trips/${tripId}`);
      }, 1800);
    } else if (loreStatus === 'failed') {
      setLoreStatusResolved(true);
      router.push(`/trips/${tripId}`);
    } else if (tripData && loreStatus !== 'processing' && loreStatus !== undefined) {
      setLoreStatusResolved(true);
      router.push(`/trips/${tripId}`);
    }
  }, [loreStatus, router, tripId, tripData, unlocking]);

  // 4-minute client-side timeout — REL-04: automatically reset lore_status → 'failed'
  // so the user can retry without manual DB intervention. The mutation is fire-and-forget;
  // if it succeeds, Realtime fires → refetch → 'failed' → redirects to FailedState.
  // If the user closes the tab before clicking, the status resets automatically on mount.
  useEffect(() => {
    const timeout = setTimeout(
      () => {
        if (loreStatus === 'processing' || loreStatus === undefined) {
          setTimedOut(true);
          // Auto-reset: trip stays retryable even if user doesn't click the button.
          resetStuckLore.mutate({ tripId });
        }
      },
      4 * 60 * 1000
    );
    return () => clearTimeout(timeout);
    // resetStuckLore.mutate is stable (tRPC mutation ref doesn't change identity)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loreStatus, tripId]);

  // Progress simulation — deterministic eased curve.
  // Replaces the previous Math.random-jitter (which felt manic on screen) with
  // a smooth ease-out approaching 95% over the expected pipeline duration.
  // Real 100% is set when the realtime DB subscription reports lore_status='ready'.
  useEffect(() => {
    const startedAt = Date.now();
    const EXPECTED_MS = 120_000; // matches the median real pipeline duration
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - startedAt) / EXPECTED_MS);
      // easeOutQuart — fast at the start, gentle approach to the ceiling.
      const eased = 1 - Math.pow(1 - t, 4);
      const next = Math.min(95, eased * 95);
      setProgress(next);
      setStage(Math.min(Math.floor((next / 95) * STAGES.length), STAGES.length - 1));
    }, 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 400);
    return () => clearTimeout(t);
  }, []);

  // Particle universe canvas — intensifies with stage
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = window.innerWidth,
      H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener('resize', onResize);

    // Adaptive particle count — fewer on mobile for 60fps
    const particleCount = Math.min(400, Math.max(150, Math.floor(W / 4)));
    const particles = Array.from({ length: particleCount }, () => {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * Math.max(W, H);
      return {
        x: W / 2 + Math.cos(angle) * r,
        y: H / 2 + Math.sin(angle) * r,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.3,
        hue: [10, 185, 280][Math.floor(Math.random() * 3)] as number,
        life: Math.random() * Math.PI * 2,
      };
    });

    // Easing helper for organic ring expansion
    const easeOutQuart = (x: number) => 1 - Math.pow(1 - x, 4);

    let t = 0;
    let lastTs = 0;
    const draw = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(draw);
      // Delta-time: 0.008/frame * 60fps = 0.48/s
      const dt = lastTs > 0 ? Math.min((timestamp - lastTs) / 1000, 0.05) : 1 / 60;
      lastTs = timestamp;
      t += dt * 0.48;

      ctx.fillStyle = 'rgba(6,6,4,0.88)';
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2,
        cy = H / 2;
      const stageIntensity = 0.15 + (stage / STAGES.length) * 0.85;

      // Drag coefficient: 0.985/frame = exp(-0.015*60) per second
      const drag = Math.exp(-0.9 * dt);

      particles.forEach(p => {
        p.life += dt * 0.9; // 0.015/frame * 60fps = 0.9/s
        const alpha = ((Math.sin(p.life) + 1) / 2) * stageIntensity;
        const dx = cx - p.x,
          dy = cy - p.y,
          dist = Math.sqrt(dx * dx + dy * dy);
        // Pull normalized: 0.0005/frame * 60 = 0.03/s base, stage adds 0.18/s max
        const pullPerSec = 0.03 + (stage / STAGES.length) * 0.18;
        p.vx += (dx / (dist + 1)) * pullPerSec * dt;
        p.vy += (dy / (dist + 1)) * pullPerSec * dt;
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        if (alpha < 0.01) return;
        const colors: Record<number, string> = {
          10: `rgba(255,77,77,${alpha})`,
          185: `rgba(45,158,139,${alpha})`,
          280: `rgba(124,106,255,${alpha})`,
        };
        if (p.size > 1.2) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5);
          g.addColorStop(0, colors[p.hue]);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = colors[p.hue];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Central stage ring — breathing at ~0.5Hz (t in seconds, 2*PI*0.5 = π/s)
      const ringR = 100 + easeOutQuart(stage / STAGES.length) * 80 + Math.sin(t * Math.PI) * 6;
      const ringA = 0.15 + (stage / STAGES.length) * 0.3;
      ctx.save();
      ctx.strokeStyle = `rgba(255,77,77,${ringA})`;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(255,77,77,0.3)';
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(45,158,139,${ringA * 0.4})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR * 0.65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    draw(0);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [stage]);

  const currentStage = STAGES[stage];

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#060604' }}>
      {/* pointer-events:none prevents hit-test cost — canvas has no event handlers */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
        style={{ pointerEvents: 'none' }}
      />

      {/* Screen reader live region — announces stage changes as they happen */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {currentStage
          ? `${currentStage.label}: ${currentStage.sub}. ${Math.floor(progress)}% complete.`
          : ''}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6">
        {/* Brand — decorative, hidden from AT */}
        <p
          className="absolute top-8 left-0 right-0 text-center font-mono text-[8px] uppercase tracking-[0.6em]"
          style={{ color: 'rgba(245,240,232,0.1)' }}
          aria-hidden="true"
        >
          yaarlore
        </p>

        {/* FREEMIUM-01: first trip free banner */}
        {freemiumData?.isFirstTrip && (
          <div
            className="absolute top-16 left-0 right-0 flex justify-center"
            style={{ animation: 'fade-in 1s ease 1s both', opacity: 0 }}
          >
            <div
              className="font-mono text-[9px] uppercase tracking-[0.4em] px-4 py-2 rounded-full"
              style={{
                background: 'rgba(45,158,139,0.1)',
                border: '1px solid rgba(45,158,139,0.3)',
                color: 'rgba(45,158,139,0.8)',
              }}
            >
              Your first trip is on us
            </div>
          </div>
        )}

        {/* Stage display */}
        <div
          className="text-center space-y-8 max-w-md"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,20px,0)',
            filter: revealed ? 'blur(0px)' : 'blur(6px)',
            transition:
              'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1), filter 0.9s cubic-bezier(0.16,1,0.3,1)',
            willChange: 'transform, opacity',
          }}
        >
          {/* Stage number */}
          <p
            className="font-mono text-[9px] uppercase tracking-[0.6em]"
            style={{ color: 'rgba(255,77,77,0.75)' }}
          >
            ● STAGE {stage + 1} OF {STAGES.length}
          </p>

          {/* Active stage label — transitions between stages */}
          <div key={stage} className="space-y-3">
            <h2
              className="font-display font-black uppercase leading-tight"
              style={{
                fontSize: 'clamp(28px, 5vw, 52px)',
                color: 'rgba(245,240,232,0.92)',
                animation: 'slide-up 0.65s cubic-bezier(0.16,1,0.3,1) both',
                willChange: 'transform, opacity',
              }}
            >
              {currentStage.label}
            </h2>
            <p
              className="font-display italic text-sm"
              style={{
                color: 'rgba(245,240,232,0.55)',
                animation: 'fade-in 0.65s cubic-bezier(0.16,1,0.3,1) 0.15s both',
                willChange: 'opacity',
              }}
            >
              "{currentStage.sub}"
            </p>
          </div>

          {/* Trip name reveal — fades in at 50%+ */}
          {trip?.name && progress >= 50 && (
            <div className="space-y-1" style={{ animation: 'fade-in 1s ease' }}>
              <p
                className="font-mono text-[9px] uppercase tracking-[0.4em]"
                style={{ color: 'rgba(245,240,232,0.45)' }}
              >
                SUBJECT
              </p>
              <p
                className="font-display font-black text-xl uppercase"
                style={{ color: 'rgba(245,240,232,0.85)' }}
              >
                {trip.name}
              </p>
            </div>
          )}

          {/* Stage progress dots */}
          <div className="flex items-center justify-center gap-2">
            {STAGES.map((s, i) => (
              <div
                key={i}
                className="transition-all duration-500"
                style={{
                  width: i === stage ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background:
                    i < stage ? '#2D9E8B' : i === stage ? '#FF4D4D' : 'rgba(245,240,232,0.1)',
                  boxShadow: i === stage ? '0 0 10px rgba(255,77,77,0.6)' : 'none',
                }}
              />
            ))}
          </div>

          {/* Fine progress line */}
          <div className="w-48 mx-auto">
            <div
              role="progressbar"
              aria-valuenow={Math.floor(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Lore generation progress"
              className="h-px w-full relative overflow-hidden rounded-full"
              style={{ background: 'rgba(245,240,232,0.06)' }}
            >
              <div
                className="absolute left-0 top-0 h-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, rgba(255,77,77,0.4), rgba(255,77,77,0.9))',
                  boxShadow: '0 0 6px rgba(255,77,77,0.4)',
                }}
              />
            </div>
            <p
              className="font-mono text-[7px] uppercase tracking-[0.4em] text-center mt-2"
              style={{ color: 'rgba(245,240,232,0.15)' }}
              aria-hidden="true"
            >
              {Math.floor(progress)}% RECONSTRUCTED
            </p>
          </div>

          {/* Skeleton preview — hints at what's being built */}
          <GeneratingSkeleton stage={stage} />

          {/* Push notification opt-in — highest motivation moment */}
          <PushNotificationToggle context="generating" />
        </div>

        {/* Timeout state — shown after 4 min if still processing */}
        {timedOut && (
          <div
            className="absolute text-center space-y-3"
            style={{
              animation: 'fade-in 0.6s ease both',
              bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <p
              className="font-mono text-[10px] uppercase tracking-[0.4em]"
              style={{ color: 'rgba(255,77,77,0.85)' }}
            >
              Taking longer than expected
            </p>
            <button
              onClick={async () => {
                try {
                  await resetStuckLore.mutateAsync({ tripId });
                } catch {
                  // Best-effort — even if reset fails (e.g. not creator, or race),
                  // still route back so user sees the failed state and can try again
                }
                router.push(`/trips/${tripId}`);
              }}
              className="font-mono text-[10px] uppercase tracking-[0.4em] px-5 py-3 rounded-full"
              style={{
                border: '1px solid rgba(255,77,77,0.5)',
                color: 'rgba(245,240,232,0.85)',
                background: 'rgba(255,77,77,0.08)',
              }}
            >
              Go back &amp; retry
            </button>
          </div>
        )}

        {/* Bottom hint — pb accounts for iOS home bar in PWA mode */}
        {!timedOut && (
          <p
            className="absolute font-mono text-[7.5px] uppercase tracking-[0.5em]"
            style={{
              color: 'rgba(245,240,232,0.1)',
              bottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
            USUALLY 2–5 MINUTES
          </p>
        )}
      </div>

      {/* Lore-unlock cinematic overlay — appears when lore_status→ready */}
      {unlocking && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center animate-zoom-in"
          style={{ background: '#060604' }}
        >
          <div style={{ textAlign: 'center' }} className="space-y-4">
            <p
              className="font-mono text-[8px] uppercase tracking-[0.7em] mb-6 animate-fade-in"
              style={{ color: 'rgba(255,77,77,0.6)', animationDelay: '0.2s', opacity: 0 }}
            >
              ● LORE SEALED
            </p>
            <div
              className="font-display font-black uppercase animate-slam-up"
              style={{
                fontSize: 'clamp(40px, 8vw, 80px)',
                color: 'rgba(245,240,232,0.95)',
                letterSpacing: '-0.03em',
                animationDelay: '0.3s',
                opacity: 0,
              }}
            >
              {trip?.name || 'THE LORE'}
            </div>
            <p
              className="font-mono text-[9px] uppercase tracking-[0.5em] mt-6 animate-fade-in"
              style={{
                color: 'rgba(255,77,77,0.5)',
                animationDelay: '0.9s',
                opacity: 0,
              }}
            >
              OPENING THE ARCHIVE...
            </p>
          </div>
        </div>
      )}

      {/* slam-up, fade-in, zoom-in are all in globals.css — no local keyframes needed */}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATING SKELETON — shimmer cards that suggest the content being built
// ─────────────────────────────────────────────────────────────────────────────
function GeneratingSkeleton({ stage }: { stage: number }) {
  // Only show from stage 2+ so the initial screen stays clean
  if (stage < 2) return null;

  return (
    <div
      className="w-full max-w-xs mx-auto space-y-3 mt-2"
      style={{
        opacity: 0,
        animation: 'fade-in 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s both',
      }}
      aria-hidden="true"
    >
      {/* Skeleton shimmers — use global .skeleton class for directional gradient sweep */}
      <div className="h-5 rounded skeleton" style={{ width: '72%' }} />
      <div className="h-3 rounded skeleton" style={{ width: '100%', animationDelay: '0.15s' }} />
      <div className="h-3 rounded skeleton" style={{ width: '83%', animationDelay: '0.3s' }} />
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="h-16 rounded skeleton"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    </div>
  );
}
