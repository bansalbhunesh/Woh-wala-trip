'use client';
/**
 * CinematicAuth — dimensional entry portal
 *
 * Phase 0: TRANSIT   — particles rush inward from edges (arrival from portal)
 * Phase 1: IDENTIFY  — content reveals from center outward
 * Phase 2: SIGNAL    — check email waiting state
 * Phase 3: GRANTED   — session confirmed, collapse
 * Phase 4: TRANSIT   — wipe to /trips
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

function PortalCanvas({ phase }: { phase: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef  = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);

    // Particles start near edges, rush inward, then settle into gentle drift
    const pts = Array.from({ length: 380 }, () => {
      // Birth position: near a random edge
      const edge = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (edge === 0) { x = Math.random() * W; y = -20; }
      else if (edge === 1) { x = W + 20; y = Math.random() * H; }
      else if (edge === 2) { x = Math.random() * W; y = H + 20; }
      else { x = -20; y = Math.random() * H; }
      return {
        x, y,
        vx: 0, vy: 0,
        size: Math.random() * 1.8 + 0.2,
        hue: ([10, 185, 280] as number[])[Math.floor(Math.random() * 3)],
        phase: Math.random() * Math.PI * 2,
        speed: 0.006 + Math.random() * 0.01,
        settled: false,
      };
    });

    let portalR = 0, portalTargetR = 0;
    let t = 0, raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 0.006;
      const p = phaseRef.current;

      ctx.fillStyle = `rgba(6,6,4,${p >= 1 ? 0.88 : 0.75})`;
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;
      const intensity = [0.55, 0.25, 0.55, 1.0, 0.0][Math.min(p, 4)];

      // Portal ring
      portalTargetR = p >= 2 ? 88 + Math.sin(t * 1.2) * 7 : p === 0 ? Math.min(t * 120, 80) : 0;
      portalR += (portalTargetR - portalR) * 0.05;

      pts.forEach(pt => {
        pt.phase += pt.speed;
        const lifeAlpha = (Math.sin(pt.phase) + 1) / 2;
        const alpha = lifeAlpha * intensity;

        const dx = cx - pt.x, dy = cy - pt.y, d = Math.sqrt(dx * dx + dy * dy) + 1;

        // Phase 0: rush inward fast, then settle
        if (p === 0) {
          if (d > 40) {
            pt.vx += (dx / d) * 0.35;
            pt.vy += (dy / d) * 0.35;
          } else {
            pt.settled = true;
          }
        } else if (p >= 2) {
          // Gentle pull during waiting
          pt.vx += (dx / d) * 0.0012;
          pt.vy += (dy / d) * 0.0012;
        } else {
          // Phase 1: gentle drift
          pt.vx += (Math.random() - 0.5) * 0.003;
          pt.vy += (Math.random() - 0.5) * 0.003;
        }

        // Stronger damping in transit, normal otherwise
        const damp = p === 0 ? 0.91 : 0.97;
        pt.vx *= damp; pt.vy *= damp;
        pt.x += pt.vx; pt.y += pt.vy;

        // Wrap only after settling
        if (pt.settled || p >= 1) {
          if (pt.x < -8) pt.x = W + 8;
          if (pt.x > W + 8) pt.x = -8;
          if (pt.y < -8) pt.y = H + 8;
          if (pt.y > H + 8) pt.y = -8;
        }

        if (alpha < 0.015) return;
        const cols: Record<number, [number,number,number]> = {
          10:  [255, 77, 77],
          185: [45, 158, 139],
          280: [124, 106, 255],
        };
        const [r, g, b] = cols[pt.hue] ?? [245, 240, 232];
        if (pt.size > 1.2) {
          const grd = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.size * 5);
          grd.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
          grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(alpha * 1.3, 1)})`;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
      });

      // Portal ring (smooth, single, no spinning)
      if (portalR > 3 && (p === 0 || p === 2)) {
        const ra = Math.min(portalR / 88, 1) * 0.28 * (p === 0 ? Math.min(t * 2, 1) : 1);
        ctx.save();
        ctx.strokeStyle = `rgba(255,77,77,${ra * 1.3})`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(255,77,77,0.4)';
        ctx.beginPath(); ctx.arc(cx, cy, portalR, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(45,158,139,${ra * 0.4})`;
        ctx.lineWidth = 0.5; ctx.shadowBlur = 5; ctx.shadowColor = 'rgba(45,158,139,0.25)';
        ctx.beginPath(); ctx.arc(cx, cy, portalR * 0.6, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      // Collapse
      if (p >= 3) {
        const cAlpha = Math.min((t % 30) * 0.3, 1);
        ctx.fillStyle = `rgba(6,6,4,${cAlpha})`;
        ctx.fillRect(0, 0, W, H);
      }
    };

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" style={{ zIndex: 0 }} />;
}

/* ─────────────────────────────────────────────────────────────────────── */

export default function CinematicAuth() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [phase, setPhase] = useState(0);
  const [email, setEmail] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [fragIdx, setFragIdx] = useState(0);
  const transitioningRef = useRef(false);

  const goToTrips = useCallback(() => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    setPhase(3);
    document.body.style.background = '#060604';
    setTimeout(() => {
      router.refresh();
      setPhase(4);
      setTimeout(() => router.push('/trips'), 600);
    }, 1100);
  }, [router]);

  // Arrival sequence: phase 0 → 1 after transit animation
  useEffect(() => {
    const t = setTimeout(() => setPhase(1), 1100);
    return () => clearTimeout(t);
  }, []);

  // Check existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) goToTrips();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auth state listener — detects magic link click
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) goToTrips();
    });
    return () => subscription.unsubscribe();
  }, [supabase, goToTrips]);

  // Fragment rotation
  useEffect(() => {
    const id = setInterval(() => setFragIdx(i => (i + 1) % FRAGMENTS.length), 3200);
    return () => clearInterval(id);
  }, []);

  // Rate limit countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const sendLink = async () => {
    if (cooldown > 0) return;
    if (!EMAIL_RE.test(email.trim())) { setError('Enter a valid email address.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: true },
    });
    setLoading(false);
    if (err) {
      if (/rate|limit|too many|over_email/i.test(err.message)) {
        setError(`Wait ${60}s before requesting again.`);
        setCooldown(60);
      } else {
        setError(err.message);
      }
    } else {
      setPhase(2);
    }
  };

  // Each phase rendered as absolute overlay so they don't affect each other's layout
  const phaseStyle = (target: number) => ({
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    opacity: phase === target ? 1 : 0,
    transform: phase === target ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.98)',
    transition: 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)',
    pointerEvents: (phase === target ? 'auto' : 'none') as 'auto' | 'none',
    zIndex: 10,
  });

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#060604' }}>
      <PortalCanvas phase={phase} />

      {/* Ghost memory fragments */}
      {FRAGMENTS.map((fr, i) => (
        <div key={i} className="absolute pointer-events-none select-none font-mono"
             style={{
               left: `${4 + (i * 41) % 86}%`,
               top: `${6 + (i * 19) % 78}%`,
               fontSize: 9, letterSpacing: '0.15em',
               color: 'rgba(245,240,232,0.8)',
               opacity: phase >= 1 ? (i === fragIdx ? 0.16 : 0.035) : 0,
               transform: `rotate(${-2 + (i * 5) % 8}deg)`,
               transition: 'opacity 1.4s cubic-bezier(0.4,0,0.2,1)',
               whiteSpace: 'nowrap', zIndex: 1,
             }}>
          {fr}
        </div>
      ))}

      {/* ── PHASE 0: TRANSIT ARRIVAL ── */}
      <div style={phaseStyle(0)}>
        <div className="text-center space-y-4">
          <div className="w-1 h-1 rounded-full mx-auto"
               style={{ background: '#FF4D4D', boxShadow: '0 0 28px 12px rgba(255,77,77,0.45)' }} />
          <p className="font-mono text-[8px] uppercase tracking-[0.7em]"
             style={{ color: 'rgba(245,240,232,0.1)' }}>ENTERING</p>
        </div>
      </div>

      {/* ── PHASE 1: IDENTIFY ── */}
      <div style={phaseStyle(1)}>
        <div className="w-full max-w-md space-y-9">
          <div className="text-center space-y-3">
            <p className="font-mono text-[8px] uppercase tracking-[0.7em]"
               style={{ color: 'rgba(255,77,77,0.45)' }}>
              ● MEMORY GATEWAY ACTIVE
            </p>
            <h1 className="font-display font-black uppercase leading-[0.85]"
                style={{ fontSize: 'clamp(44px, 8vw, 80px)', color: 'rgba(245,240,232,0.92)' }}>
              IDENTIFY<br /><em className="italic" style={{ color: '#FF4D4D' }}>YOURSELF</em>
            </h1>
            <p key={fragIdx} className="font-mono text-[9px]"
               style={{ color: 'rgba(245,240,232,0.18)', letterSpacing: '0.12em', transition: 'opacity 0.8s ease' }}>
              {FRAGMENTS[fragIdx]}
            </p>
          </div>

          <div className="relative">
            <input
              type="email" value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={e => e.key === 'Enter' && sendLink()}
              placeholder="enter.your@signal.address"
              autoFocus
              className="w-full py-6 px-8 text-center font-mono text-base outline-none"
              style={{
                background: 'rgba(245,240,232,0.025)',
                border: `1px solid ${inputFocused || email ? 'rgba(255,77,77,0.32)' : 'rgba(245,240,232,0.07)'}`,
                borderRadius: '0.9rem',
                color: 'rgba(245,240,232,0.85)',
                caretColor: '#FF4D4D',
                letterSpacing: '0.04em',
                boxShadow: inputFocused ? '0 0 20px rgba(255,77,77,0.06)' : 'none',
                transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
              }}
            />
            <div className="absolute bottom-0 left-8 right-8 h-px"
                 style={{
                   background: 'linear-gradient(90deg, transparent, rgba(255,77,77,0.45), transparent)',
                   opacity: inputFocused ? 1 : 0,
                   transition: 'opacity 0.4s ease',
                 }} />
          </div>

          <div className="space-y-3">
            <button
              onClick={sendLink}
              disabled={loading || !email.trim() || cooldown > 0}
              className="w-full py-4 rounded-2xl font-ui font-black text-[10px] uppercase tracking-[0.35em] flex items-center justify-center gap-3 disabled:opacity-30"
              style={{
                background: 'rgba(255,77,77,0.08)',
                border: '1px solid rgba(255,77,77,0.32)',
                color: 'rgba(255,77,77,0.9)',
                transition: 'box-shadow 0.5s ease, background 0.3s ease',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.boxShadow = '0 0 40px rgba(255,77,77,0.2)'; el.style.background = 'rgba(255,77,77,0.13)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.boxShadow = 'none'; el.style.background = 'rgba(255,77,77,0.08)'; }}
            >
              {loading ? (
                <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '1px solid rgba(255,77,77,0.3)', borderTopColor: '#FF4D4D', animation: 'wwt-spin 0.9s linear infinite' }} /> TRANSMITTING...</>
              ) : cooldown > 0 ? (
                `WAIT ${cooldown}s`
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
      </div>

      {/* ── PHASE 2: SIGNAL SENT ── */}
      <div style={phaseStyle(2)}>
        <div className="w-full max-w-md text-center space-y-9">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full"
                 style={{ border: '1px solid rgba(255,77,77,0.2)', animation: 'wwt-breathe 3s ease-in-out infinite' }} />
            <div className="absolute inset-3 rounded-full"
                 style={{ border: '1px solid rgba(255,77,77,0.1)', animation: 'wwt-breathe 3s ease-in-out infinite 0.6s' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full" style={{ background: '#FF4D4D', boxShadow: '0 0 14px rgba(255,77,77,0.8)', animation: 'wwt-breathe-dot 3s ease-in-out infinite' }} />
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-mono text-[8px] uppercase tracking-[0.6em]" style={{ color: 'rgba(255,77,77,0.45)' }}>
              ● SIGNAL TRANSMITTED
            </p>
            <h2 className="font-display font-black uppercase"
                style={{ fontSize: 'clamp(28px, 5vw, 52px)', color: 'rgba(245,240,232,0.9)' }}>
              CHECK YOUR<br /><em className="italic" style={{ color: '#FF4D4D' }}>EMAIL</em>
            </h2>
            <p className="font-mono text-[9px]" style={{ color: 'rgba(245,240,232,0.3)' }}>
              LINK SENT TO {email.toUpperCase()}
            </p>
          </div>

          <div className="space-y-2.5 px-5 py-5 rounded-2xl text-left"
               style={{ background: 'rgba(245,240,232,0.025)', border: '1px solid rgba(245,240,232,0.05)' }}>
            {['Open the email from Woh Wala Trip', 'Click the "Log In" button', 'You\'ll arrive here instantly'].map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="font-mono text-[8px] mt-0.5" style={{ color: 'rgba(255,77,77,0.35)' }}>0{i + 1}</span>
                <span className="font-ui text-sm" style={{ color: 'rgba(245,240,232,0.38)' }}>{s}</span>
              </div>
            ))}
          </div>

          <button onClick={() => { setPhase(1); setEmail(''); setError(''); }}
                  className="font-mono text-[7.5px] uppercase tracking-[0.4em] hover:opacity-60 transition-opacity"
                  style={{ color: 'rgba(245,240,232,0.18)' }}>
            ← WRONG EMAIL
          </button>
        </div>
      </div>

      {/* ── PHASE 3: ACCESS GRANTED ── */}
      <div style={phaseStyle(3)}>
        <div className="text-center space-y-4">
          <p className="font-mono text-[8px] uppercase tracking-[0.6em]" style={{ color: 'rgba(255,77,77,0.4)' }}>
            ● IDENTITY CONFIRMED
          </p>
          <div className="font-display font-black uppercase"
               style={{ fontSize: 'clamp(36px, 7vw, 64px)', color: 'rgba(245,240,232,0.9)' }}>
            ACCESS<br /><em className="italic" style={{ color: '#FF4D4D' }}>GRANTED</em>
          </div>
        </div>
      </div>

      {/* Error pill */}
      {error && (
        <div className="fixed bottom-16 left-0 right-0 flex justify-center z-20" style={{ pointerEvents: 'none' }}>
          <div className="px-6 py-3 rounded-full font-mono text-[8px] uppercase tracking-[0.25em]"
               style={{ background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.22)', color: 'rgba(255,77,77,0.8)' }}>
            {error}
          </div>
        </div>
      )}

      {/* Final wipe */}
      <div style={{
        position: 'fixed', inset: 0, background: '#060604', zIndex: 50,
        opacity: phase >= 4 ? 1 : 0,
        transition: 'opacity 0.65s cubic-bezier(0.4,0,1,1)',
        pointerEvents: 'none',
      }} />

      <style jsx>{`
        @keyframes wwt-spin { to { transform: rotate(360deg); } }
        @keyframes wwt-breathe { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.1);opacity:1} }
        @keyframes wwt-breathe-dot { 0%,100%{box-shadow:0 0 14px rgba(255,77,77,.7)} 50%{box-shadow:0 0 24px rgba(255,77,77,1)} }
      `}</style>
    </div>
  );
}
