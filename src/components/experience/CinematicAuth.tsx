'use client';
/**
 * CinematicAuth — pure 8-digit OTP via custom API
 *
 * Flow:
 *   1. User enters email → POST /api/auth/send-otp
 *   2. OTP generated via Supabase admin, delivered via Resend (or console in dev)
 *   3. UI IMMEDIATELY shows 8-digit input
 *   4. User enters code → POST /api/auth/verify-otp
 *   5. Session created server-side, client picks it up
 *   6. Cinematic collapse → /trips
 *
 * No magic links. No redirects. No hybrid confusion.
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

// Phase 0: Dr. Strange portal (big, dramatic, opening)
// Phase 1+: Portal fades → golden snitch hops around edges
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

    // Portal ring definitions — thicker, more dramatic
    const RINGS = [
      { r: 260, segs: 28, gap: 0.22, speed:  0.18, width: 3.5, bright: 1.0 },
      { r: 224, segs: 18, gap: 0.32, speed: -0.30, width: 3.0, bright: 0.95 },
      { r: 192, segs: 24, gap: 0.26, speed:  0.48, width: 2.5, bright: 0.9 },
      { r: 160, segs: 14, gap: 0.38, speed: -0.64, width: 3.0, bright: 0.85 },
      { r: 128, segs: 20, gap: 0.24, speed:  0.88, width: 2.0, bright: 0.8 },
      { r:  98, segs: 10, gap: 0.42, speed: -1.15, width: 2.5, bright: 0.75 },
      { r:  70, segs: 16, gap: 0.28, speed:  1.55, width: 1.8, bright: 0.7 },
      { r:  44, segs:  8, gap: 0.48, speed: -2.10, width: 2.0, bright: 0.65 },
    ];

    interface Spark { x:number; y:number; vx:number; vy:number; life:number; maxLife:number; size:number; }
    const sparks: Spark[] = [];

    // Snitch state — bounces around screen edges, avoids center safe zone
    const snitch = {
      x: W * 0.1, y: H * 0.15,
      tx: W * 0.85, ty: H * 0.12,
      vx: 0, vy: 0,
      wingT: 0,
      waitFrames: 0,
      trail: [] as {x:number;y:number}[],
    };

    function newSnitchTarget() {
      // Random position in the outer 25% of the screen (avoid center safe zone)
      const edge = Math.floor(Math.random() * 4);
      const margin = 0.08;
      const band = 0.22;
      if (edge === 0) return { tx: margin + Math.random() * (1 - margin*2), ty: margin + Math.random() * band };
      if (edge === 1) return { tx: margin + Math.random() * (1 - margin*2), ty: 1 - margin - Math.random() * band };
      if (edge === 2) return { tx: margin + Math.random() * band, ty: margin + Math.random() * (1 - margin*2) };
      return { tx: 1 - margin - Math.random() * band, ty: margin + Math.random() * (1 - margin*2) };
    }

    let portalScale = 0;
    let snitchAlpha = 0;
    let t = 0, raf = 0;

    const GOLD  = (a: number) => `rgba(255,168,30,${a})`;
    const AMBER = (a: number) => `rgba(255,100,10,${a})`;
    const WHITE = (a: number) => `rgba(255,228,130,${a})`;

    const drawRing = (cx: number, cy: number, ring: typeof RINGS[0], intensity: number, scale: number) => {
      const r = ring.r * scale;
      if (r < 4) return;
      const angle = t * ring.speed;
      const segArc = (Math.PI * 2) / ring.segs;
      const fillArc = segArc * (1 - ring.gap);
      const glow = ring.bright * intensity;

      ctx.save();
      ctx.strokeStyle = GOLD(glow * 0.95);
      ctx.lineWidth = ring.width;
      ctx.shadowBlur = 18;
      ctx.shadowColor = AMBER(glow * 0.8);

      for (let i = 0; i < ring.segs; i++) {
        const start = angle + segArc * i;
        ctx.beginPath();
        ctx.arc(cx, cy, r, start, start + fillArc);
        ctx.stroke();
      }
      // Bright dots at segment ends
      ctx.fillStyle = WHITE(glow);
      ctx.shadowBlur = 10;
      for (let i = 0; i < ring.segs; i++) {
        const end = angle + segArc * i + fillArc;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(end) * r, cy + Math.sin(end) * r, ring.width * 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const emitSparks = (cx: number, cy: number, scale: number, intensity: number) => {
      if (intensity < 0.25) return;
      const outerR = RINGS[0].r * scale;
      for (let i = 0; i < Math.floor(intensity * 4); i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 1.8 + Math.random() * 4;
        sparks.push({
          x: cx + Math.cos(a) * outerR, y: cy + Math.sin(a) * outerR,
          vx: Math.cos(a) * spd * (0.5 + Math.random()), vy: Math.sin(a) * spd * (0.5 + Math.random()),
          life: 1, maxLife: 20 + Math.random() * 40, size: 0.8 + Math.random() * 2,
        });
      }
    };

    const drawSparks = () => {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]; s.x += s.vx; s.y += s.vy; s.vx *= 0.96; s.vy *= 0.96; s.life -= 1;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        const a = s.life / s.maxLife;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 4);
        g.addColorStop(0, WHITE(a * 0.9)); g.addColorStop(0.5, GOLD(a * 0.4)); g.addColorStop(1, AMBER(0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = WHITE(a); ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
      }
    };

    const drawSnitch = (alpha: number) => {
      if (alpha < 0.02) return;
      const sx = snitch.x, sy = snitch.y;

      // Trail
      snitch.trail.unshift({ x: sx, y: sy });
      if (snitch.trail.length > 18) snitch.trail.pop();
      snitch.trail.forEach((pt, i) => {
        const ta = alpha * (1 - i / snitch.trail.length) * 0.4;
        const tr = 5 * (1 - i / snitch.trail.length);
        if (ta < 0.01) return;
        const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, tr * 2);
        g.addColorStop(0, GOLD(ta)); g.addColorStop(1, AMBER(0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pt.x, pt.y, tr * 2, 0, Math.PI * 2); ctx.fill();
      });

      snitch.wingT += 0.18;
      const wingFlap = Math.sin(snitch.wingT) * 0.5 + 0.5;

      // Wing glow
      const wingSpan = 22 + wingFlap * 6;
      const wingH = 8 + wingFlap * 4;
      ctx.save();
      ctx.globalAlpha = alpha * 0.55;

      [-1, 1].forEach(side => {
        const g = ctx.createRadialGradient(sx + side * wingSpan * 0.5, sy, 0, sx + side * wingSpan * 0.5, sy, wingSpan);
        g.addColorStop(0, GOLD(0.7)); g.addColorStop(1, AMBER(0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(sx + side * wingSpan * 0.5, sy - wingH, wingSpan * 0.7, wingH + wingFlap * 3, side * 0.3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // Body glow
      const bg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 14);
      bg.addColorStop(0, WHITE(alpha * 0.95));
      bg.addColorStop(0.4, GOLD(alpha * 0.8));
      bg.addColorStop(0.8, AMBER(alpha * 0.4));
      bg.addColorStop(1, AMBER(0));
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.fill();

      // Core
      ctx.fillStyle = WHITE(alpha);
      ctx.shadowBlur = 12; ctx.shadowColor = GOLD(alpha);
      ctx.beginPath(); ctx.arc(sx, sy, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    };

    const updateSnitch = (p: number) => {
      if (p < 1) return;
      snitch.waitFrames--;
      if (snitch.waitFrames <= 0) {
        const { tx, ty } = newSnitchTarget();
        snitch.tx = tx * W;
        snitch.ty = ty * H;
        snitch.vx = (snitch.tx - snitch.x) * 0.18;
        snitch.vy = (snitch.ty - snitch.y) * 0.18;
        snitch.waitFrames = 55 + Math.floor(Math.random() * 90);
      }
      snitch.x += snitch.vx; snitch.y += snitch.vy;
      snitch.vx *= 0.84; snitch.vy *= 0.84;
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 0.014;
      const p = phaseRef.current;

      ctx.fillStyle = `rgba(4,2,2,0.82)`;
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;

      // Portal: visible in phase 0 only, fades in phase 1+
      const portalTarget = p === 0 ? Math.min(t * 0.14, 1) : 0;
      portalScale += (portalTarget - portalScale) * (p === 0 ? 0.05 : 0.04);

      // Snitch: visible in phase 1+, fades on phase 4
      const snitchTarget = (p >= 1 && p < 4) ? 1 : 0;
      snitchAlpha += (snitchTarget - snitchAlpha) * 0.04;

      // Portal draw
      if (portalScale > 0.02) {
        const I = portalScale;
        const deep = ctx.createRadialGradient(cx, cy, 0, cx, cy, 270 * I);
        deep.addColorStop(0,    `rgba(255,150,20,${0.18 * I})`);
        deep.addColorStop(0.4,  `rgba(160,50,8,${0.10 * I})`);
        deep.addColorStop(0.75, `rgba(60,15,3,${0.06 * I})`);
        deep.addColorStop(1,    'rgba(4,2,2,0)');
        ctx.fillStyle = deep; ctx.fillRect(0, 0, W, H);

        RINGS.forEach(ring => drawRing(cx, cy, ring, I, I));

        // Outer bloom
        ctx.save();
        ctx.strokeStyle = AMBER(0.18 * I);
        ctx.lineWidth = 22 * I;
        ctx.shadowBlur = 30; ctx.shadowColor = AMBER(0.4 * I);
        ctx.beginPath(); ctx.arc(cx, cy, 260 * I, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // Center window
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 38 * I);
        cg.addColorStop(0, WHITE(0.92 * I));
        cg.addColorStop(0.3, GOLD(0.75 * I));
        cg.addColorStop(0.7, AMBER(0.35 * I));
        cg.addColorStop(1, 'rgba(4,2,2,0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, 38 * I, 0, Math.PI * 2); ctx.fill();

        emitSparks(cx, cy, I, I);
      }

      drawSparks();

      // Snitch
      updateSnitch(p);
      drawSnitch(snitchAlpha);

      // Final wipe
      if (p >= 4) {
        const wA = Math.min((t % 40) * 0.25, 1);
        ctx.fillStyle = `rgba(4,2,2,${wA})`; ctx.fillRect(0, 0, W, H);
      }
    };

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" style={{ zIndex: 0 }} />;
}

export default function CinematicAuth() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [phase, setPhase] = useState(0); // 0=transit 1=email 2=otp 3=granted 4=wipe
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['','','','','','','','']);
  const [inputFocused, setInputFocused] = useState(false);
  const [activeDigit, setActiveDigit] = useState(-1);
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [fragIdx, setFragIdx] = useState(0);
  const otpRefs = useRef<(HTMLInputElement|null)[]>([]);
  const transitionRef = useRef(false);

  const goToTrips = useCallback(() => {
    if (transitionRef.current) return;
    transitionRef.current = true;
    setPhase(3);
    document.body.style.background = '#060604';
    setTimeout(() => {
      router.refresh();
      setPhase(4);
      setTimeout(() => router.push('/trips'), 700);
    }, 1100);
  }, [router]);

  // Arrival animation
  useEffect(() => {
    const t = setTimeout(() => setPhase(1), 1100);
    return () => clearTimeout(t);
  }, []);

  // Check existing session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) goToTrips();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auth state change — handles if user verified in another tab
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((ev, session) => {
      if ((ev === 'SIGNED_IN' || ev === 'TOKEN_REFRESHED') && session) goToTrips();
    });
    return () => subscription.unsubscribe();
  }, [supabase, goToTrips]);

  // Fragment cycling
  useEffect(() => {
    const id = setInterval(() => setFragIdx(i => (i+1) % FRAGMENTS.length), 3200);
    return () => clearInterval(id);
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(c => Math.max(0, c-1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Send OTP via our custom API
  const sendOtp = async () => {
    if (cooldown > 0 || sendLoading) return;
    if (!EMAIL_RE.test(email.trim())) { setError('Enter a valid email address.'); return; }
    setSendLoading(true); setError('');

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to send code.');
        setCooldown(30);
      } else {
        // Success — IMMEDIATELY advance to OTP screen
        setPhase(2);
        setTimeout(() => otpRefs.current[0]?.focus(), 300);
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSendLoading(false);
    }
  };

  // Verify OTP via our custom API
  const verifyOtp = useCallback(async (digits: string[]) => {
    const token = digits.join('');
    if (token.length !== 8 || verifyLoading) return;
    setVerifyLoading(true); setError('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), token }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Verification failed.');
        setVerifyLoading(false);
      } else {
        // Session set server-side — trigger client to pick it up
        await supabase.auth.refreshSession();
        goToTrips();
      }
    } catch {
      setError('Network error. Try again.');
      setVerifyLoading(false);
    }
  }, [email, verifyLoading, supabase, goToTrips]);

  const handleDigitChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g,'').slice(-1);
    const next = [...otp]; next[i] = digit; setOtp(next);
    if (digit && i < 7) setTimeout(() => otpRefs.current[i+1]?.focus(), 40);
    if (next.join('').length === 8) verifyOtp(next);
  };

  const handleDigitKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i-1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,8);
    const next = [...otp];
    digits.split('').forEach((d,i) => { next[i] = d; });
    setOtp(next);
    otpRefs.current[Math.min(digits.length, 7)]?.focus();
    if (next.join('').length === 8) setTimeout(() => verifyOtp(next), 50);
  };

  // Dev-mode OTP: if running locally, OTP is printed to terminal
  const isDevMode = process.env.NODE_ENV === 'development' && !process.env.RESEND_API_KEY;

  const phaseStyle = (target: number): React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    opacity: phase === target ? 1 : 0,
    transform: phase === target ? 'translate3d(0, 0, 0) scale(1)' : 'translate3d(0, 16px, 0) scale(0.985)',
    filter: phase === target ? 'blur(0px)' : 'blur(4px)',
    transition: 'opacity 0.65s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1), filter 0.65s cubic-bezier(0.16,1,0.3,1)',
    pointerEvents: phase === target ? 'auto' : 'none',
    zIndex: 10,
  });

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#060604' }}>
      <PortalCanvas phase={phase} />

      {/* Ghost fragments */}
      {FRAGMENTS.map((fr, i) => (
        <div key={i} className="absolute pointer-events-none select-none font-mono"
             style={{
               // Keep fragments in safe zone — max left 60% so long strings don't clip right edge
               left: `${4+(i*31)%56}%`, top: `${6+(i*19)%78}%`,
               fontSize: 9, letterSpacing: '0.12em', color: 'rgba(245,240,232,0.8)',
               opacity: phase >= 1 ? (i===fragIdx ? 0.15 : 0.025) : 0,
               transform: `rotate(${-2+(i*5)%8}deg)`,
               transition: 'opacity 0.4s cubic-bezier(0.16,1,0.3,1)',
               whiteSpace: 'nowrap', zIndex: 1,
               maxWidth: '40vw', overflow: 'hidden', textOverflow: 'ellipsis',
             }}>
          {fr}
        </div>
      ))}

      {/* ── PHASE 0: ARRIVAL ── */}
      <div style={phaseStyle(0)}>
        <div className="text-center">
          <div className="w-1 h-1 rounded-full mx-auto"
               style={{ background: '#FFA020', boxShadow: '0 0 28px 12px rgba(255,140,30,0.5)' }} />
        </div>
      </div>

      {/* ── PHASE 1: EMAIL ENTRY ── */}
      <div style={phaseStyle(1)}>
        <div className="w-full max-w-md space-y-9">
          <div className="text-center space-y-3">
            <p className="font-mono text-[8px] uppercase tracking-[0.7em]"
               style={{
                 color: 'rgba(255,140,30,0.5)',
                 opacity: phase === 1 ? 1 : 0,
                 transform: phase === 1 ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
                 filter: phase === 1 ? 'blur(0px)' : 'blur(6px)',
                 transition: 'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s, transform 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s, filter 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s',
                 willChange: 'transform, opacity',
               }}>
              ● MEMORY GATEWAY ACTIVE
            </p>
            <h1 className="font-display font-black uppercase leading-[0.85]"
                style={{
                  fontSize: 'clamp(44px, 8vw, 80px)', color: 'rgba(245,240,232,0.92)',
                  opacity: phase === 1 ? 1 : 0,
                  transform: phase === 1 ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
                  filter: phase === 1 ? 'blur(0px)' : 'blur(6px)',
                  transition: 'opacity 0.65s cubic-bezier(0.16,1,0.3,1) 0.12s, transform 0.65s cubic-bezier(0.16,1,0.3,1) 0.12s, filter 0.65s cubic-bezier(0.16,1,0.3,1) 0.12s',
                  willChange: 'transform, opacity',
                }}>
              IDENTIFY<br /><em className="italic" style={{ color: '#FFA020' }}>YOURSELF</em>
            </h1>
            <p key={fragIdx} className="font-mono text-[9px]"
               style={{
                 color: 'rgba(245,240,232,0.18)', letterSpacing: '0.12em',
                 opacity: phase === 1 ? 1 : 0,
                 transition: 'opacity 0.4s cubic-bezier(0.16,1,0.3,1)',
               }}>
              {FRAGMENTS[fragIdx]}
            </p>
          </div>

          <div className="relative"
               style={{
                 opacity: phase === 1 ? 1 : 0,
                 transform: phase === 1 ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
                 filter: phase === 1 ? 'blur(0px)' : 'blur(6px)',
                 transition: 'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.22s, transform 0.55s cubic-bezier(0.16,1,0.3,1) 0.22s, filter 0.55s cubic-bezier(0.16,1,0.3,1) 0.22s',
                 willChange: 'transform, opacity',
               }}>
            <input
              type="email" value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={e => e.key === 'Enter' && sendOtp()}
              placeholder="enter.your@signal.address"
              autoFocus
              className="w-full py-6 px-8 text-center font-mono text-base outline-none"
              style={{
                background: 'rgba(245,240,232,0.025)',
                border: `1px solid ${inputFocused || email ? 'rgba(255,140,30,0.4)' : 'rgba(245,240,232,0.07)'}`,
                borderRadius: '0.9rem',
                color: 'rgba(245,240,232,0.85)',
                caretColor: '#FFA020',
                letterSpacing: '0.04em',
                transition: 'border-color 0.4s cubic-bezier(0.16,1,0.3,1)',
              }}
            />
            <div className="absolute bottom-0 left-8 right-8 h-px"
                 style={{ background: 'linear-gradient(90deg,transparent,rgba(255,77,77,0.4),transparent)', opacity: inputFocused ? 1 : 0, transition: 'opacity 0.4s cubic-bezier(0.16,1,0.3,1)' }} />
          </div>

          <div className="space-y-3"
               style={{
                 opacity: phase === 1 ? 1 : 0,
                 transform: phase === 1 ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
                 filter: phase === 1 ? 'blur(0px)' : 'blur(6px)',
                 transition: 'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.32s, transform 0.55s cubic-bezier(0.16,1,0.3,1) 0.32s, filter 0.55s cubic-bezier(0.16,1,0.3,1) 0.32s',
                 willChange: 'transform, opacity',
               }}>
            <button onClick={sendOtp} disabled={sendLoading || !email.trim() || cooldown > 0}
                    className="w-full py-4 rounded-2xl font-ui font-black text-[10px] uppercase tracking-[0.35em] flex items-center justify-center gap-3 disabled:opacity-30"
                    style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,140,30,0.4)', color: 'rgba(255,165,40,0.95)', transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), background 0.3s ease, box-shadow 0.4s cubic-bezier(0.16,1,0.3,1)', willChange: 'transform, opacity' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform='translate3d(0,-2px,0)'; el.style.boxShadow='0 8px 40px rgba(255,77,77,0.25)'; el.style.background='rgba(255,77,77,0.13)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform='translate3d(0,0,0)'; el.style.boxShadow='none'; el.style.background='rgba(255,77,77,0.08)'; }}>
              {sendLoading ? (
                <><div style={{ width:12,height:12,borderRadius:'50%',border:'1px solid rgba(255,77,77,0.3)',borderTopColor:'#FFA020',animation:'wwt-spin 0.9s linear infinite' }} /> TRANSMITTING...</>
              ) : cooldown > 0 ? `WAIT ${cooldown}s` : 'SEND CODE →'}
            </button>
            {isDevMode && (
              <p className="text-center font-mono text-[7.5px] uppercase tracking-[0.3em]"
                 style={{ color: 'rgba(245,240,232,0.15)' }}>
                DEV: code prints to terminal
              </p>
            )}
            {process.env.NODE_ENV === 'development' && (
              <button onClick={goToTrips}
                      className="w-full py-2 font-mono text-[7.5px] uppercase tracking-[0.4em] hover:opacity-50 transition-opacity"
                      style={{ color: 'rgba(245,240,232,0.12)' }}>
                BYPASS GATEWAY (DEV)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── PHASE 2: 8-DIGIT OTP ── */}
      <div style={phaseStyle(2)}>
        <div className="w-full max-w-md space-y-5">
          <div className="text-center space-y-2">
            <p className="font-mono text-[8px] uppercase tracking-[0.6em]"
               style={{
                 color: 'rgba(255,140,30,0.5)',
                 opacity: phase === 2 ? 1 : 0,
                 transform: phase === 2 ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
                 filter: phase === 2 ? 'blur(0px)' : 'blur(6px)',
                 transition: 'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s, transform 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s, filter 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s',
                 willChange: 'transform, opacity',
               }}>
              ● CODE TRANSMITTED
            </p>
            <h2 className="font-display font-black uppercase leading-tight"
                style={{
                  fontSize: 'clamp(28px, 5vw, 48px)', color: 'rgba(245,240,232,0.92)',
                  opacity: phase === 2 ? 1 : 0,
                  transform: phase === 2 ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
                  filter: phase === 2 ? 'blur(0px)' : 'blur(6px)',
                  transition: 'opacity 0.65s cubic-bezier(0.16,1,0.3,1) 0.12s, transform 0.65s cubic-bezier(0.16,1,0.3,1) 0.12s, filter 0.65s cubic-bezier(0.16,1,0.3,1) 0.12s',
                  willChange: 'transform, opacity',
                }}>
              ENTER THE <em className="italic" style={{ color: '#FFA020' }}>CODE</em>
            </h2>
            <p className="font-mono text-[8px]" style={{ color: 'rgba(245,240,232,0.22)', letterSpacing: '0.08em' }}>
              SENT TO {email.length > 28 ? email.slice(0,25)+'...' : email.toUpperCase()}
            </p>
            {isDevMode && (
              <p className="font-mono text-[8px]" style={{ color: 'rgba(255,140,30,0.5)' }}>
                CHECK YOUR TERMINAL
              </p>
            )}
          </div>

          {/* 8 digit slots */}
          <div className="flex gap-1 sm:gap-1.5 justify-center" onPaste={handlePaste}>
            {otp.map((d, i) => (
              <div key={i} className="relative"
                   style={{
                     opacity: phase === 2 ? 1 : 0,
                     transform: phase === 2 ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
                     filter: phase === 2 ? 'blur(0px)' : 'blur(6px)',
                     transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${0.18 + i * 0.04}s, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${0.18 + i * 0.04}s, filter 0.5s cubic-bezier(0.16,1,0.3,1) ${0.18 + i * 0.04}s`,
                     willChange: 'transform, opacity',
                   }}>
                {d && <div className="absolute inset-0 rounded-xl pointer-events-none"
                           style={{ boxShadow: '0 0 14px rgba(255,77,77,0.3)', background: 'rgba(255,77,77,0.06)', borderRadius: '0.7rem' }} />}
                <input
                  ref={el => { otpRefs.current[i] = el; }}
                  type="text" inputMode="numeric" maxLength={1}
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleDigitKey(i, e)}
                  onFocus={() => setActiveDigit(i)}
                  onBlur={() => setActiveDigit(-1)}
                  disabled={verifyLoading}
                  className="relative text-center font-display font-black outline-none rounded-xl disabled:opacity-50"
                  style={{
                    width: 'clamp(32px, 10vw, 44px)',
                    height: 'clamp(40px, 12vw, 52px)',
                    fontSize: 'clamp(16px, 4vw, 22px)',
                    background: d ? 'rgba(255,77,77,0.1)' : 'rgba(245,240,232,0.03)',
                    border: `1px solid ${activeDigit===i ? 'rgba(255,77,77,0.65)' : d ? 'rgba(255,77,77,0.35)' : 'rgba(245,240,232,0.08)'}`,
                    color: d ? '#FFA020' : 'rgba(245,240,232,0.3)',
                    caretColor: '#FFA020',
                    transform: d ? 'translate3d(0,0,0) scale(1.04)' : 'translate3d(0,0,0) scale(1)',
                    transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), border-color 0.3s cubic-bezier(0.16,1,0.3,1)',
                    willChange: 'transform',
                  }}
                />
                {activeDigit === i && (
                  <div className="absolute bottom-0.5 left-1 right-1 h-px"
                       style={{ background: '#FFA020', boxShadow: '0 0 4px rgba(255,77,77,0.8)', borderRadius: 1 }} />
                )}
              </div>
            ))}
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5">
            {otp.map((d, i) => (
              <div key={i} className="w-1 h-1 rounded-full"
                   style={{ background: d ? '#FFA020' : 'rgba(245,240,232,0.1)', boxShadow: d ? '0 0 5px rgba(255,140,30,0.6)' : 'none', transition: 'background 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s cubic-bezier(0.16,1,0.3,1)' }} />
            ))}
          </div>

          {verifyLoading && (
            <p className="text-center font-mono text-[8px] uppercase tracking-[0.5em]"
               style={{ color: 'rgba(255,140,30,0.55)', animation: 'wwt-breathe-dot 1s ease-in-out infinite' }}>
              VERIFYING...
            </p>
          )}

          {/* Bottom actions — larger text, clearly visible */}
          <div className="flex items-center justify-between pt-2"
               style={{ borderTop: '1px solid rgba(245,240,232,0.06)' }}>
            <button onClick={() => { setPhase(1); setOtp(['','','','','','','','']); setError(''); }}
                    className="font-mono text-[9px] uppercase tracking-[0.35em] hover:opacity-80 active:opacity-60 transition-opacity px-2 py-2"
                    style={{ color: 'rgba(245,240,232,0.45)' }}>
              ← WRONG EMAIL
            </button>
            <button
              onClick={() => { setOtp(['','','','','','','','']); sendOtp(); }}
              disabled={cooldown > 0 || sendLoading}
              className="font-mono text-[9px] uppercase tracking-[0.35em] disabled:opacity-30 hover:opacity-80 active:opacity-60 transition-opacity px-2 py-2"
              style={{ color: cooldown > 0 ? 'rgba(255,140,30,0.4)' : 'rgba(245,240,232,0.45)' }}>
              {cooldown > 0 ? `RESEND IN ${cooldown}s` : 'RESEND CODE'}
            </button>
          </div>
        </div>
      </div>

      {/* ── PHASE 3: ACCESS GRANTED ── */}
      <div style={phaseStyle(3)}>
        <div className="text-center space-y-4">
          <p className="font-mono text-[8px] uppercase tracking-[0.6em]"
             style={{
               color: 'rgba(255,77,77,0.4)',
               opacity: phase === 3 ? 1 : 0,
               transform: phase === 3 ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
               filter: phase === 3 ? 'blur(0px)' : 'blur(6px)',
               transition: 'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s, transform 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s, filter 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s',
               willChange: 'transform, opacity',
             }}>
            ● IDENTITY CONFIRMED
          </p>
          <div className="font-display font-black uppercase"
               style={{
                 fontSize: 'clamp(36px, 7vw, 64px)', color: 'rgba(245,240,232,0.9)',
                 opacity: phase === 3 ? 1 : 0,
                 transform: phase === 3 ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
                 filter: phase === 3 ? 'blur(0px)' : 'blur(6px)',
                 transition: 'opacity 0.75s cubic-bezier(0.16,1,0.3,1) 0.12s, transform 0.75s cubic-bezier(0.16,1,0.3,1) 0.12s, filter 0.75s cubic-bezier(0.16,1,0.3,1) 0.12s',
                 willChange: 'transform, opacity',
               }}>
            ACCESS<br /><em className="italic" style={{ color: '#FFA020' }}>GRANTED</em>
          </div>
        </div>
      </div>

      {/* Error pill */}
      {error && (
        <div className="fixed bottom-16 left-0 right-0 flex justify-center z-20 pointer-events-none"
             style={{
               animation: 'auth-error-enter 0.45s cubic-bezier(0.16,1,0.3,1) forwards',
             }}>
          <div className="px-6 py-3 rounded-full font-mono text-[8px] uppercase tracking-[0.25em]"
               style={{ background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.22)', color: 'rgba(255,77,77,0.8)' }}>
            {error}
          </div>
        </div>
      )}

      {/* Final wipe */}
      <div style={{ position:'fixed', inset:0, background:'#060604', zIndex:50, opacity: phase >= 4 ? 1 : 0, transition:'opacity 0.65s cubic-bezier(0.16,1,0.3,1)', pointerEvents:'none' }} />

      <style jsx>{`
        @keyframes wwt-spin { to{transform:rotate(360deg)} }
        @keyframes wwt-breathe-dot { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes auth-error-enter {
          from { opacity: 0; transform: translate3d(0,16px,0); filter: blur(6px); }
          to   { opacity: 1; transform: translate3d(0,0,0);   filter: blur(0px); }
        }
      `}</style>
    </div>
  );
}
