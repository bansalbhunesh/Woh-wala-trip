'use client';
/**
 * CinematicAuth — "The Dimensional Entry"
 *
 * Auth strategy: magic link (default Supabase), detected via onAuthStateChange.
 * No 6-digit OTP confusion. One path, no loops.
 *
 * Phase 0: ARRIVAL    — void with single pulse
 * Phase 1: IDENTIFY   — email terminal
 * Phase 2: SIGNAL     — "check your email" waiting portal
 * Phase 3: GRANTED    — session confirmed, collapse begins
 * Phase 4: TRANSIT    — dimensional wipe → /trips
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FRAGMENTS = [
  '"the golden retriever has been identified"',
  '"chaos source: confirmed"',
  '"emotionally cooked: 84%"',
  '"peak delusion detected"',
  '"this trip cannot be unexperienced"',
  '"friendship lore: reconstructing"',
];

/* ── Particle canvas — smooth, no jitter ─────────────────────── */
function PortalCanvas({ phase }: { phase: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // Particles — smooth lerp-based movement, no discrete jumps
    const pts = Array.from({ length: 400 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      tx: 0, ty: 0, // target velocity (lerped toward)
      size: Math.random() * 1.8 + 0.2,
      hue: ([10, 185, 280] as number[])[Math.floor(Math.random() * 3)],
      phase: Math.random() * Math.PI * 2,
      speed: 0.008 + Math.random() * 0.012,
    }));

    // Portal ring state — grows smoothly
    let portalR = 0;
    let portalTargetR = 0;

    let t = 0;
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 0.007;
      const p = phaseRef.current;

      // Soft background fade — slow, no flicker
      ctx.fillStyle = `rgba(6,6,4,${p >= 3 ? 0.96 : 0.88})`;
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;
      const intensity = [0.06, 0.2, 0.6, 1.0, 0.0][Math.min(p, 4)];

      // Update portal ring target
      portalTargetR = p >= 2 ? 90 + Math.sin(t * 1.4) * 8 : 0;
      portalR += (portalTargetR - portalR) * 0.04; // smooth lerp

      pts.forEach(pt => {
        pt.phase += pt.speed;
        const alpha = ((Math.sin(pt.phase) + 1) / 2) * intensity;

        // Target velocity: gentle drift + pull toward center in phases 2+
        if (p >= 2) {
          const dx = cx - pt.x, dy = cy - pt.y, d = Math.sqrt(dx * dx + dy * dy) + 1;
          const pull = p >= 3 ? 0.006 : 0.0015;
          pt.tx = (dx / d) * pull;
          pt.ty = (dy / d) * pull;
        } else {
          pt.tx = 0; pt.ty = 0;
        }

        // Lerp velocity toward target — eliminates jitter
        pt.vx = pt.vx * 0.96 + pt.tx * 0.04 + (Math.random() - 0.5) * 0.002;
        pt.vy = pt.vy * 0.96 + pt.ty * 0.04 + (Math.random() - 0.5) * 0.002;
        pt.x += pt.vx; pt.y += pt.vy;
        if (pt.x < -4) pt.x = W + 4;
        if (pt.x > W + 4) pt.x = -4;
        if (pt.y < -4) pt.y = H + 4;
        if (pt.y > H + 4) pt.y = -4;

        if (alpha < 0.015) return;

        const cols: Record<number, [number, number, number]> = {
          10:  [255, 77, 77],
          185: [45, 158, 139],
          280: [124, 106, 255],
        };
        const [r, g, b] = cols[pt.hue] ?? [245, 240, 232];

        if (pt.size > 1.2) {
          const grd = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.size * 5);
          grd.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
          grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = grd;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 1.4})`;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
      });

      // Portal ring — single smooth growing ring, no orbital jitter
      if (portalR > 2 && p >= 2 && p <= 3) {
        // Outer ring with depth gradient
        const ringAlpha = Math.min(portalR / 90, 1) * 0.35;
        ctx.save();
        // Depth halo behind the ring
        const halo = ctx.createRadialGradient(cx, cy, portalR - 24, cx, cy, portalR + 24);
        halo.addColorStop(0, `rgba(255,77,77,0)`);
        halo.addColorStop(0.5, `rgba(255,77,77,${ringAlpha * 0.4})`);
        halo.addColorStop(1, `rgba(255,77,77,0)`);
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, W, H);

        // Crisp ring stroke
        ctx.strokeStyle = `rgba(255,77,77,${ringAlpha * 1.4})`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 12;
        ctx.shadowColor = `rgba(255,77,77,0.5)`;
        ctx.beginPath(); ctx.arc(cx, cy, portalR, 0, Math.PI * 2); ctx.stroke();

        // Second inner ring — teal, slightly behind
        ctx.strokeStyle = `rgba(45,158,139,${ringAlpha * 0.5})`;
        ctx.lineWidth = 0.5;
        ctx.shadowColor = `rgba(45,158,139,0.3)`;
        ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(cx, cy, portalR * 0.62, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      // Collapse — smooth radial black expansion
      if (p >= 3) {
        const collapseProgress = Math.min((t % 20) * 0.25, 1);
        const collapseR = collapseProgress * Math.max(W, H) * 1.5;
        if (collapseR > 0) {
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, collapseR);
          g.addColorStop(0, `rgba(6,6,4,${collapseProgress})`);
          g.addColorStop(0.7, `rgba(6,6,4,${collapseProgress * 0.6})`);
          g.addColorStop(1, `rgba(6,6,4,0)`);
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, H);
        }
      }
    };

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}

/* ── Main component ──────────────────────────────────────────── */
export default function CinematicAuth() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [phase, setPhase] = useState(0);
  const [email, setEmail] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fragIdx, setFragIdx] = useState(0);
  const transitioningRef = useRef(false);

  const goToTrips = useCallback(() => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    setPhase(3);
    document.body.style.background = '#060604';
    // refresh() forces Next.js server components to re-run with new session cookies
    // then navigate after the cinematic collapse
    setTimeout(() => {
      router.refresh();
      setPhase(4);
      setTimeout(() => router.push('/trips'), 600);
    }, 1200);
  }, [router]);

  // Arrival
  useEffect(() => {
    const t = setTimeout(() => setPhase(1), 700);
    return () => clearTimeout(t);
  }, []);

  // Check if already signed in on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) goToTrips();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for session changes — works for magic link click (same or other tab)
  // and for OTP verification
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        goToTrips();
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, goToTrips]);

  // Fragment rotation when waiting
  useEffect(() => {
    if (phase < 1) return;
    const id = setInterval(() => setFragIdx(i => (i + 1) % FRAGMENTS.length), 3000);
    return () => clearInterval(id);
  }, [phase]);

  const sendLink = async () => {
    if (!EMAIL_RE.test(email.trim())) { setError('Enter a valid email address.'); return; }
    setLoading(true); setError('');
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    setLoading(false);
    if (err) {
      if (/rate|limit|too many|over_email/i.test(err.message))
        setError('Too many requests. Wait 60 seconds before trying again.');
      else
        setError(err.message);
    } else {
      setPhase(2);
    }
  };

  const isPhaseVisible = (target: number) => phase === target;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#060604' }}>
      <PortalCanvas phase={phase} />

      {/* Atmospheric memory fragments — fixed opacity, no pulsing */}
      {FRAGMENTS.map((fr, i) => (
        <div key={i} className="absolute pointer-events-none select-none font-mono"
             style={{
               left: `${4 + (i * 41) % 86}%`,
               top: `${6 + (i * 19) % 78}%`,
               fontSize: 9,
               letterSpacing: '0.15em',
               color: 'rgba(245,240,232,0.8)',
               opacity: phase >= 1 ? (i === fragIdx ? 0.18 : 0.04) : 0,
               transform: `rotate(${-2 + (i * 5) % 8}deg)`,
               transition: 'opacity 1.2s cubic-bezier(0.4,0,0.2,1)',
               whiteSpace: 'nowrap',
               zIndex: 1,
             }}>
          {fr}
        </div>
      ))}

      {/* ── UI LAYERS ──────────────────────────────────────── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6">

        {/* PHASE 0: Void */}
        <div style={{
          opacity: isPhaseVisible(0) ? 1 : 0,
          transition: 'opacity 0.8s ease',
          pointerEvents: 'none',
          position: 'absolute',
        }}>
          <div className="w-1 h-1 rounded-full mx-auto"
               style={{ background: '#FF4D4D', boxShadow: '0 0 24px 10px rgba(255,77,77,0.4)' }} />
        </div>

        {/* PHASE 1: IDENTIFY */}
        <div className="w-full max-w-md space-y-10"
             style={{
               opacity: isPhaseVisible(1) ? 1 : 0,
               transform: isPhaseVisible(1) ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.98)',
               transition: 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)',
               pointerEvents: isPhaseVisible(1) ? 'auto' : 'none',
             }}>
          <div className="space-y-3 text-center">
            <p className="font-mono text-[8px] uppercase tracking-[0.7em]"
               style={{ color: 'rgba(255,77,77,0.45)' }}>
              ● MEMORY GATEWAY ACTIVE
            </p>
            <h1 className="font-display font-black uppercase leading-[0.85]"
                style={{ fontSize: 'clamp(40px, 8vw, 80px)', color: 'rgba(245,240,232,0.92)' }}>
              IDENTIFY<br />
              <em className="italic" style={{ color: '#FF4D4D' }}>YOURSELF</em>
            </h1>
            <p className="font-mono text-[9px]"
               key={fragIdx}
               style={{ color: 'rgba(245,240,232,0.18)', letterSpacing: '0.15em', transition: 'opacity 0.8s ease' }}>
              {FRAGMENTS[fragIdx]}
            </p>
          </div>

          {/* Email input — no jitter, stable border */}
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={e => e.key === 'Enter' && sendLink()}
              placeholder="enter.your@signal.address"
              autoFocus
              className="w-full bg-transparent py-6 px-8 text-center font-mono text-base outline-none"
              style={{
                color: 'rgba(245,240,232,0.85)',
                caretColor: '#FF4D4D',
                letterSpacing: '0.04em',
                background: 'rgba(245,240,232,0.025)',
                border: '1px solid rgba(245,240,232,0.07)',
                borderRadius: '1rem',
                transition: 'border-color 0.6s ease, box-shadow 0.6s ease',
                ...(inputFocused || email ? {
                  borderColor: 'rgba(255,77,77,0.35)',
                  boxShadow: '0 0 24px rgba(255,77,77,0.07)',
                } : {}),
              }}
            />
            {/* Scan line — only on focus, smooth fade */}
            <div className="absolute bottom-0 left-8 right-8 h-px"
                 style={{
                   background: 'linear-gradient(90deg, transparent, rgba(255,77,77,0.5), transparent)',
                   opacity: inputFocused ? 1 : 0,
                   transition: 'opacity 0.5s ease',
                 }} />
          </div>

          <div className="space-y-4">
            <button
              onClick={sendLink}
              disabled={loading || !email.trim()}
              className="w-full py-4 rounded-2xl font-ui font-black text-[10px] uppercase tracking-[0.35em] transition-all disabled:opacity-30 flex items-center justify-center gap-3"
              style={{
                background: 'rgba(255,77,77,0.08)',
                border: '1px solid rgba(255,77,77,0.35)',
                color: 'rgba(255,77,77,0.9)',
                boxShadow: '0 0 24px rgba(255,77,77,0.08)',
                transition: 'box-shadow 0.6s ease, background 0.4s ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.boxShadow = '0 0 48px rgba(255,77,77,0.25)';
                el.style.background = 'rgba(255,77,77,0.14)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.boxShadow = '0 0 24px rgba(255,77,77,0.08)';
                el.style.background = 'rgba(255,77,77,0.08)';
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', border: '1px solid rgba(255,77,77,0.3)', borderTopColor: '#FF4D4D', animation: 'wwt-spin 0.9s cubic-bezier(0.4,0,0.6,1) infinite' }} />
                  TRANSMITTING...
                </>
              ) : 'TRANSMIT SIGNAL →'}
            </button>

            {process.env.NODE_ENV === 'development' && (
              <button onClick={goToTrips}
                      className="w-full py-2 font-mono text-[7.5px] uppercase tracking-[0.4em] transition-opacity hover:opacity-50"
                      style={{ color: 'rgba(245,240,232,0.15)' }}>
                BYPASS GATEWAY (DEV)
              </button>
            )}
          </div>
        </div>

        {/* PHASE 2: SIGNAL SENT — cinematic waiting portal */}
        <div className="w-full max-w-md text-center space-y-10"
             style={{
               opacity: isPhaseVisible(2) ? 1 : 0,
               transform: isPhaseVisible(2) ? 'translateY(0)' : 'translateY(20px)',
               transition: 'opacity 1s cubic-bezier(0.16,1,0.3,1) 0.15s, transform 1s cubic-bezier(0.16,1,0.3,1) 0.15s',
               pointerEvents: isPhaseVisible(2) ? 'auto' : 'none',
             }}>
          {/* Breathing portal indicator — smooth, not jittery */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full"
                 style={{
                   border: '1px solid rgba(255,77,77,0.2)',
                   animation: 'wwt-breathe 3s ease-in-out infinite',
                 }} />
            <div className="absolute inset-3 rounded-full"
                 style={{
                   border: '1px solid rgba(255,77,77,0.12)',
                   animation: 'wwt-breathe 3s ease-in-out infinite 0.5s',
                 }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full"
                   style={{ background: '#FF4D4D', boxShadow: '0 0 16px rgba(255,77,77,0.8)', animation: 'wwt-breathe-dot 3s ease-in-out infinite' }} />
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-mono text-[8px] uppercase tracking-[0.6em]"
               style={{ color: 'rgba(255,77,77,0.5)' }}>
              ● SIGNAL TRANSMITTED
            </p>
            <h2 className="font-display font-black uppercase"
                style={{ fontSize: 'clamp(24px, 5vw, 48px)', color: 'rgba(245,240,232,0.9)' }}>
              CHECK YOUR<br />
              <em className="italic" style={{ color: '#FF4D4D' }}>EMAIL</em>
            </h2>
            <p className="font-mono text-[9px]" style={{ color: 'rgba(245,240,232,0.25)', letterSpacing: '0.1em' }}>
              WE SENT A LINK TO
            </p>
            <p className="font-ui font-bold text-sm" style={{ color: 'rgba(245,240,232,0.6)' }}>
              {email}
            </p>
          </div>

          <div className="space-y-3 px-4 py-5 rounded-2xl"
               style={{ background: 'rgba(245,240,232,0.025)', border: '1px solid rgba(245,240,232,0.05)' }}>
            <p className="font-mono text-[8px] uppercase tracking-[0.4em]" style={{ color: 'rgba(245,240,232,0.2)' }}>
              HOW TO ENTER
            </p>
            <ol className="space-y-2 text-left">
              {['Open the email from Woh Wala Trip', 'Click the "Log In" button in the email', 'You\'ll be pulled through instantly'].map((step, i) => (
                <li key={i} className="flex items-start gap-3 font-ui text-sm"
                    style={{ color: 'rgba(245,240,232,0.4)' }}>
                  <span className="font-mono text-[8px] mt-0.5 flex-shrink-0" style={{ color: 'rgba(255,77,77,0.4)' }}>0{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <button onClick={() => { setPhase(1); setEmail(''); setError(''); }}
                  className="font-mono text-[7.5px] uppercase tracking-[0.4em] transition-opacity hover:opacity-60"
                  style={{ color: 'rgba(245,240,232,0.2)' }}>
            ← WRONG EMAIL ADDRESS
          </button>
        </div>

        {/* PHASE 3: ACCESS GRANTED */}
        <div style={{
          opacity: isPhaseVisible(3) ? 1 : 0,
          transform: isPhaseVisible(3) ? 'scale(1)' : 'scale(0.94)',
          transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)',
          pointerEvents: 'none',
          textAlign: 'center',
        }}>
          <p className="font-mono text-[8px] uppercase tracking-[0.6em] mb-4"
             style={{ color: 'rgba(255,77,77,0.5)' }}>
            ● IDENTITY CONFIRMED
          </p>
          <div className="font-display font-black uppercase"
               style={{ fontSize: 'clamp(32px, 7vw, 64px)', color: 'rgba(245,240,232,0.9)' }}>
            ACCESS<br /><em className="italic" style={{ color: '#FF4D4D' }}>GRANTED</em>
          </div>
        </div>

        {/* Error pill — smooth entrance */}
        <div style={{
          position: 'absolute',
          bottom: 72,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: error ? 1 : 0,
          transition: 'opacity 0.5s ease',
          pointerEvents: 'none',
          zIndex: 20,
          whiteSpace: 'nowrap',
        }}>
          <div className="px-6 py-3 rounded-full font-mono text-[8px] uppercase tracking-[0.25em]"
               style={{ background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.25)', color: 'rgba(255,77,77,0.8)' }}>
            {error}
          </div>
        </div>
      </div>

      {/* Dimensional collapse — smooth radial wipe, no abrupt cut */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#060604',
        opacity: phase >= 4 ? 1 : 0,
        transition: 'opacity 0.7s cubic-bezier(0.4,0,1,1)',
        pointerEvents: 'none',
        zIndex: 50,
      }} />

      <style jsx>{`
        @keyframes wwt-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes wwt-breathe {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50%       { transform: scale(1.12); opacity: 1; }
        }
        @keyframes wwt-breathe-dot {
          0%, 100% { box-shadow: 0 0 16px rgba(255,77,77,0.8); }
          50%       { box-shadow: 0 0 28px rgba(255,77,77,1); }
        }
      `}</style>
    </div>
  );
}
