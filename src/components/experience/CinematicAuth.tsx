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

// Dr. Strange portal — rotating mandala rings + golden sparks
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

    // Portal ring definitions
    const RINGS = [
      { r: 220, segs: 24, gap: 0.28, speed:  0.22, width: 2.5, bright: 1.0 },
      { r: 188, segs: 16, gap: 0.35, speed: -0.38, width: 2.0, bright: 0.9 },
      { r: 158, segs: 20, gap: 0.30, speed:  0.55, width: 1.8, bright: 0.85 },
      { r: 130, segs: 12, gap: 0.40, speed: -0.70, width: 2.2, bright: 0.8 },
      { r: 104, segs: 18, gap: 0.25, speed:  0.90, width: 1.5, bright: 0.75 },
      { r:  80, segs:  8, gap: 0.45, speed: -1.20, width: 1.8, bright: 0.7  },
      { r:  58, segs: 14, gap: 0.30, speed:  1.60, width: 1.2, bright: 0.65 },
      { r:  38, segs:  6, gap: 0.50, speed: -2.20, width: 1.5, bright: 0.6  },
    ];

    // Spark pool
    interface Spark { x:number; y:number; vx:number; vy:number; life:number; maxLife:number; size:number; }
    const sparks: Spark[] = [];

    // Portal radius (animates open)
    let portalScale = 0;

    let t = 0, raf = 0;

    const GOLD  = (a: number) => `rgba(255,165,30,${a})`;
    const AMBER = (a: number) => `rgba(255,110,10,${a})`;
    const WHITE = (a: number) => `rgba(255,220,120,${a})`;

    const drawRing = (cx: number, cy: number, ring: typeof RINGS[0], intensity: number, scale: number) => {
      const r = ring.r * scale;
      if (r < 4) return;
      const angle = t * ring.speed;
      const segArc = (Math.PI * 2) / ring.segs;
      const gapArc = segArc * ring.gap;
      const fillArc = segArc - gapArc;
      const glow = ring.bright * intensity;

      ctx.save();
      ctx.strokeStyle = GOLD(glow * 0.9);
      ctx.lineWidth = ring.width;
      ctx.shadowBlur = 14;
      ctx.shadowColor = AMBER(glow * 0.7);

      for (let i = 0; i < ring.segs; i++) {
        const start = angle + segArc * i;
        ctx.beginPath();
        ctx.arc(cx, cy, r, start, start + fillArc);
        ctx.stroke();
      }

      // Bright spark dots at segment endpoints
      for (let i = 0; i < ring.segs; i++) {
        const end = angle + segArc * i + fillArc;
        ctx.fillStyle = WHITE(glow * 0.9);
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(end) * r, cy + Math.sin(end) * r, ring.width * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const emitSparks = (cx: number, cy: number, scale: number, intensity: number) => {
      if (intensity < 0.3) return;
      const outerR = RINGS[0].r * scale;
      // Emit from random points along the outer ring
      const count = Math.floor(intensity * 3);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3.5;
        sparks.push({
          x: cx + Math.cos(a) * outerR,
          y: cy + Math.sin(a) * outerR,
          vx: Math.cos(a) * speed * (0.6 + Math.random() * 0.8),
          vy: Math.sin(a) * speed * (0.6 + Math.random() * 0.8),
          life: 1, maxLife: 25 + Math.random() * 35,
          size: 0.8 + Math.random() * 1.8,
        });
      }
    };

    const updateSparks = () => {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx; s.y += s.vy;
        s.vx *= 0.96; s.vy *= 0.96;
        s.life -= 1;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        const a = (s.life / s.maxLife);
        const trail = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3);
        trail.addColorStop(0, WHITE(a * 0.9));
        trail.addColorStop(0.5, GOLD(a * 0.5));
        trail.addColorStop(1, AMBER(0));
        ctx.fillStyle = trail;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = WHITE(a);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
      }
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 0.012;
      const p = phaseRef.current;

      // Background
      ctx.fillStyle = `rgba(4,2,2,${p === 0 ? 0.75 : 0.82})`;
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;

      // Portal open/close animation
      const targetScale = p === 0 ? Math.min(t * 0.18, 1) : p <= 3 ? 1 : 0;
      portalScale += (targetScale - portalScale) * 0.06;

      const intensity = portalScale * ([0.7, 0.4, 0.9, 1.1, 0][Math.min(p, 4)] ?? 0);

      if (portalScale > 0.02) {
        const scale = portalScale;

        // Deep-space glow BEHIND the portal
        const deep = ctx.createRadialGradient(cx, cy, 0, cx, cy, 230 * scale);
        deep.addColorStop(0,   `rgba(255,140,20,${0.12 * intensity})`);
        deep.addColorStop(0.35,`rgba(180,60,10,${0.08 * intensity})`);
        deep.addColorStop(0.7, `rgba(80,20,5,${0.05 * intensity})`);
        deep.addColorStop(1,   'rgba(4,2,2,0)');
        ctx.fillStyle = deep;
        ctx.fillRect(0, 0, W, H);

        // All rotating rings
        RINGS.forEach(ring => drawRing(cx, cy, ring, intensity, scale));

        // Outer glow ring
        ctx.save();
        ctx.strokeStyle = AMBER(0.15 * intensity);
        ctx.lineWidth = 16 * scale;
        ctx.beginPath(); ctx.arc(cx, cy, 220 * scale, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // Center — dimensional window
        const centerR = 32 * scale;
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, centerR);
        cg.addColorStop(0,    WHITE(0.85 * intensity));
        cg.addColorStop(0.25, GOLD(0.7 * intensity));
        cg.addColorStop(0.6,  AMBER(0.3 * intensity));
        cg.addColorStop(1,    'rgba(4,2,2,0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, centerR, 0, Math.PI * 2); ctx.fill();

        // Emit and draw sparks
        emitSparks(cx, cy, scale, intensity);
        updateSparks();

        // Collapse sweep
        if (p >= 4) {
          const sweep = Math.min((t % 40) * 0.22, 1);
          ctx.fillStyle = `rgba(4,2,2,${sweep})`;
          ctx.fillRect(0, 0, W, H);
        }
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
    const digits = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
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
    transform: phase === target ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.985)',
    transition: 'opacity 0.85s cubic-bezier(0.16,1,0.3,1), transform 0.85s cubic-bezier(0.16,1,0.3,1)',
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
               left: `${4+(i*41)%86}%`, top: `${6+(i*19)%78}%`,
               fontSize: 9, letterSpacing: '0.15em', color: 'rgba(245,240,232,0.8)',
               opacity: phase >= 1 ? (i===fragIdx ? 0.16 : 0.03) : 0,
               transform: `rotate(${-2+(i*5)%8}deg)`,
               transition: 'opacity 1.4s cubic-bezier(0.4,0,0.2,1)',
               whiteSpace: 'nowrap', zIndex: 1,
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
               style={{ color: 'rgba(255,140,30,0.5)' }}>
              ● MEMORY GATEWAY ACTIVE
            </p>
            <h1 className="font-display font-black uppercase leading-[0.85]"
                style={{ fontSize: 'clamp(44px, 8vw, 80px)', color: 'rgba(245,240,232,0.92)' }}>
              IDENTIFY<br /><em className="italic" style={{ color: '#FFA020' }}>YOURSELF</em>
            </h1>
            <p key={fragIdx} className="font-mono text-[9px]"
               style={{ color: 'rgba(245,240,232,0.18)', letterSpacing: '0.12em' }}>
              {FRAGMENTS[fragIdx]}
            </p>
          </div>

          <div className="relative">
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
                transition: 'border-color 0.5s ease',
              }}
            />
            <div className="absolute bottom-0 left-8 right-8 h-px"
                 style={{ background: 'linear-gradient(90deg,transparent,rgba(255,77,77,0.4),transparent)', opacity: inputFocused ? 1 : 0, transition: 'opacity 0.4s ease' }} />
          </div>

          <div className="space-y-3">
            <button onClick={sendOtp} disabled={sendLoading || !email.trim() || cooldown > 0}
                    className="w-full py-4 rounded-2xl font-ui font-black text-[10px] uppercase tracking-[0.35em] flex items-center justify-center gap-3 disabled:opacity-30"
                    style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,140,30,0.4)', color: 'rgba(255,165,40,0.95)', transition: 'background 0.3s ease, box-shadow 0.4s ease' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.boxShadow='0 0 40px rgba(255,77,77,0.2)'; el.style.background='rgba(255,77,77,0.13)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.boxShadow='none'; el.style.background='rgba(255,77,77,0.08)'; }}>
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
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-3">
            <p className="font-mono text-[8px] uppercase tracking-[0.6em]"
               style={{ color: 'rgba(255,140,30,0.5)' }}>
              ● CODE TRANSMITTED
            </p>
            <h2 className="font-display font-black uppercase leading-[0.85]"
                style={{ fontSize: 'clamp(32px, 6vw, 60px)', color: 'rgba(245,240,232,0.92)' }}>
              ENTER THE<br /><em className="italic" style={{ color: '#FFA020' }}>CODE</em>
            </h2>
            <p className="font-mono text-[8.5px]" style={{ color: 'rgba(245,240,232,0.25)', letterSpacing: '0.1em' }}>
              8-DIGIT CODE SENT TO {email.toUpperCase()}
            </p>
            {isDevMode && (
              <p className="font-mono text-[8px]" style={{ color: 'rgba(255,140,30,0.5)' }}>
                CHECK YOUR TERMINAL FOR THE CODE
              </p>
            )}
          </div>

          {/* 6 digit slots */}
          <div className="flex gap-3 justify-center" onPaste={handlePaste}>
            {otp.map((d, i) => (
              <div key={i} className="relative">
                {d && (
                  <div className="absolute inset-0 rounded-xl pointer-events-none"
                       style={{ boxShadow: '0 0 18px rgba(255,77,77,0.35)', background: 'rgba(255,77,77,0.06)', borderRadius: '0.7rem' }} />
                )}
                <input
                  ref={el => { otpRefs.current[i] = el; }}
                  type="text" inputMode="numeric" maxLength={1}
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleDigitKey(i, e)}
                  onFocus={() => setActiveDigit(i)}
                  onBlur={() => setActiveDigit(-1)}
                  disabled={verifyLoading}
                  className="relative w-12 h-14 text-center text-2xl font-display font-black outline-none rounded-xl disabled:opacity-50"
                  style={{
                    background: d ? 'rgba(255,77,77,0.1)' : 'rgba(245,240,232,0.03)',
                    border: `1px solid ${activeDigit===i ? 'rgba(255,77,77,0.65)' : d ? 'rgba(255,77,77,0.35)' : 'rgba(245,240,232,0.08)'}`,
                    color: d ? '#FFA020' : 'rgba(245,240,232,0.3)',
                    caretColor: '#FFA020',
                    transform: d ? 'scale(1.04)' : 'scale(1)',
                    transition: 'transform 0.2s cubic-bezier(0.16,1,0.3,1), border-color 0.3s ease, background 0.3s ease',
                  }}
                />
                {activeDigit === i && (
                  <div className="absolute bottom-0.5 left-2 right-2 h-px"
                       style={{ background: '#FFA020', boxShadow: '0 0 4px rgba(255,77,77,0.8)', borderRadius: 1 }} />
                )}
              </div>
            ))}
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {otp.map((d, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                   style={{ background: d ? '#FFA020' : 'rgba(245,240,232,0.1)', boxShadow: d ? '0 0 6px rgba(255,140,30,0.65)' : 'none' }} />
            ))}
          </div>

          {verifyLoading && (
            <p className="text-center font-mono text-[8px] uppercase tracking-[0.5em]"
               style={{ color: 'rgba(255,140,30,0.55)', animation: 'wwt-breathe-dot 1s ease-in-out infinite' }}>
              VERIFYING...
            </p>
          )}

          <div className="flex items-center justify-between">
            <button onClick={() => { setPhase(1); setOtp(['','','','','','','','']); setError(''); }}
                    className="font-mono text-[7.5px] uppercase tracking-[0.4em] hover:opacity-60 transition-opacity"
                    style={{ color: 'rgba(245,240,232,0.18)' }}>
              ← WRONG EMAIL
            </button>
            <button
              onClick={() => { setOtp(['','','','','','','','']); sendOtp(); }}
              disabled={cooldown > 0 || sendLoading}
              className="font-mono text-[7.5px] uppercase tracking-[0.4em] disabled:opacity-30 hover:opacity-60 transition-opacity"
              style={{ color: 'rgba(245,240,232,0.18)' }}>
              {cooldown > 0 ? `RESEND IN ${cooldown}s` : 'RESEND CODE'}
            </button>
          </div>
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
            ACCESS<br /><em className="italic" style={{ color: '#FFA020' }}>GRANTED</em>
          </div>
        </div>
      </div>

      {/* Error pill */}
      {error && (
        <div className="fixed bottom-16 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <div className="px-6 py-3 rounded-full font-mono text-[8px] uppercase tracking-[0.25em]"
               style={{ background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.22)', color: 'rgba(255,77,77,0.8)' }}>
            {error}
          </div>
        </div>
      )}

      {/* Final wipe */}
      <div style={{ position:'fixed', inset:0, background:'#060604', zIndex:50, opacity: phase >= 4 ? 1 : 0, transition:'opacity 0.65s cubic-bezier(0.4,0,1,1)', pointerEvents:'none' }} />

      <style jsx>{`
        @keyframes wwt-spin { to{transform:rotate(360deg)} }
        @keyframes wwt-breathe-dot { 0%,100%{opacity:.5} 50%{opacity:1} }
      `}</style>
    </div>
  );
}
