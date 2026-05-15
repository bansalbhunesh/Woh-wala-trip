'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

/* ─────────────────────────────────────────────────────────────
   CINEMATIC AUTH — "The Dimensional Entry"

   Phase 0: ARRIVAL       — darkness, single signal, atmosphere
   Phase 1: IDENTIFY      — email terminal emerges from void
   Phase 2: TRANSMISSION  — particles collapse inward, portal forms
   Phase 3: CODE ARRIVAL  — 6 glowing fragments orbit into slots
   Phase 4: ACTIVATION    — code verified, universe collapses
   Phase 5: TRANSIT       — dimensional wipe, route to /trips
───────────────────────────────────────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MEMORY_FRAGMENTS = [
  '"the golden retriever has been identified"',
  '"chaos source: confirmed"',
  '"2 days · 247 photos · 11 incidents"',
  '"friendship lore: reconstructing"',
  '"emotionally cooked: 84%"',
  '"archetypes locked in"',
  '"peak delusion detected"',
  '"this trip cannot be unexperienced"',
];

function AuthCanvas({ phase, tick }: { phase: number; tick: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener('resize', resize);

    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      size: number;
      hue: number;
      alpha: number;
      life: number;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < 500; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * Math.max(W, H);
      particles.push({
        x: W / 2 + Math.cos(angle) * radius,
        y: H / 2 + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.3,
        hue: Math.random() > 0.7 ? 10 : (Math.random() > 0.5 ? 185 : 280),
        alpha: Math.random(),
        life: Math.random() * Math.PI * 2,
      });
    }

    let t = 0;
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      t += 0.008;

      const phaseIntensity = [0.05, 0.25, 0.8, 1.0, 1.4, 0.0][Math.min(phase, 5)];

      ctx.fillStyle = `rgba(6,6,4,${0.88 + (phase >= 4 ? 0.04 : 0)})`;
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;

      particles.forEach((p) => {
        p.life += 0.02;
        p.alpha = (Math.sin(p.life) + 1) / 2;

        // In phases 2-3: swirl toward center
        if (phase >= 2 && phase < 5) {
          const dx = cx - p.x;
          const dy = cy - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pull = phase >= 4 ? 0.015 : 0.002;
          p.vx += (dx / (dist + 1)) * pull;
          p.vy += (dy / (dist + 1)) * pull;
        }

        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        const a = p.alpha * phaseIntensity;
        if (a < 0.01) return;

        const colors: Record<number, string> = {
          10: `rgba(255,77,77,${a})`,
          185: `rgba(45,158,139,${a})`,
          280: `rgba(124,106,255,${a})`,
        };
        const col = colors[p.hue] ?? `rgba(245,240,232,${a * 0.3})`;

        // Halo for larger particles
        if (p.size > 1.5) {
          const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5);
          grd.addColorStop(0, col);
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Portal ring (phase 2-3)
      if (phase >= 2 && phase <= 4) {
        const portalR = phase === 4 ? 200 + (t - (phase === 4 ? t : 0)) * 300 : 80 + Math.sin(t * 2) * 8;
        const portalA = phase === 4 ? Math.max(0, 0.6 - (t % 5)) : 0.3 + Math.sin(t * 3) * 0.15;

        ctx.save();
        ctx.strokeStyle = `rgba(255,77,77,${portalA})`;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(255,77,77,0.4)';
        ctx.beginPath();
        ctx.arc(cx, cy, portalR, 0, Math.PI * 2);
        ctx.stroke();

        // Inner ring
        ctx.strokeStyle = `rgba(45,158,139,${portalA * 0.5})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, portalR * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Radial collapse (phase 4+)
      if (phase >= 4) {
        const collapseR = Math.max(0, 600 - (t % 10) * 900);
        const collapseA = Math.min(1, (t % 10) * 0.8);
        ctx.save();
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, collapseR);
        grd.addColorStop(0, `rgba(6,6,4,${collapseA})`);
        grd.addColorStop(1, 'rgba(6,6,4,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    };

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" style={{ zIndex: 0 }} />;
}

export default function CinematicAuth() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  const [phase, setPhase] = useState(0);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fragIdx, setFragIdx] = useState(0);
  const [tick, setTick] = useState(0);
  const [digitActive, setDigitActive] = useState(-1);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // RAF tick for animations
  useEffect(() => {
    let id: number;
    let frame = 0;
    const loop = () => { frame++; if (frame % 2 === 0) setTick(t => t + 1); id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  // Arrival sequence
  useEffect(() => {
    const t = setTimeout(() => setPhase(1), 800);
    return () => clearTimeout(t);
  }, []);

  // Auth error from callback
  useEffect(() => {
    if (params.get('error') === 'auth_failed') setError('Signal lost. Try again.');
  }, [params]);

  // Cycling fragments
  useEffect(() => {
    if (phase < 1) return;
    const id = setInterval(() => setFragIdx(i => (i + 1) % MEMORY_FRAGMENTS.length), 2800);
    return () => clearInterval(id);
  }, [phase]);

  const sendOtp = async () => {
    if (!EMAIL_RE.test(email.trim())) { setError('Invalid signal address.'); return; }
    setLoading(true); setError('');
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      if (/rate|limit|too many/i.test(error.message))
        setError('Transmission limit reached. Wait 60 seconds.');
      else
        setError(error.message);
    } else {
      setPhase(2);
      setTimeout(() => { setPhase(3); setTimeout(() => otpRefs.current[0]?.focus(), 300); }, 1800);
    }
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleOtpChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp]; next[i] = digit; setOtp(next);
    if (digit && i < 5) { setTimeout(() => otpRefs.current[i + 1]?.focus(), 50); }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...otp];
    digits.split('').forEach((d, i) => { next[i] = d; });
    setOtp(next);
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  const verifyOtp = useCallback(async () => {
    const token = otp.join('');
    if (token.length !== 6) return;
    setLoading(true); setError('');
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    });
    setLoading(false);
    if (error) {
      if (/expired/i.test(error.message)) setError('Code expired. Request a new one.');
      else if (/invalid/i.test(error.message)) setError('Wrong code. Check your email.');
      else setError(error.message);
    } else {
      setPhase(4);
      setTimeout(() => { setPhase(5); setTimeout(() => router.push('/trips'), 800); }, 1400);
    }
  }, [otp, email, supabase, router]);

  useEffect(() => {
    if (otp.join('').length === 6 && phase === 3) verifyOtp();
  }, [otp, phase, verifyOtp]);

  // Floating memory fragments in the background
  const fragments = MEMORY_FRAGMENTS.map((f, i) => ({
    text: f,
    x: 5 + (i * 37) % 90,
    y: 8 + (i * 23) % 80,
    opacity: phase >= 1 ? (i === fragIdx ? 0.22 : 0.06) : 0,
    rot: -3 + (i * 7) % 12,
    floatOffset: Math.sin(tick / 80 + i * 0.9) * 6,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#060604' }}>
      <AuthCanvas phase={phase} tick={tick} />

      {/* Atmospheric memory fragments — scattered text behind everything */}
      {fragments.map((fr, i) => (
        <div
          key={i}
          className="absolute font-mono pointer-events-none select-none transition-opacity duration-1000"
          style={{
            left: `${fr.x}%`,
            top: `${fr.y}%`,
            transform: `rotate(${fr.rot}deg) translateY(${fr.floatOffset}px)`,
            opacity: fr.opacity,
            fontSize: 9,
            letterSpacing: '0.15em',
            color: 'rgba(245,240,232,0.8)',
            zIndex: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {fr.text}
        </div>
      ))}

      {/* ── CENTRAL UI ───────────────────────────────────── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">

        {/* ── PHASE 0: ARRIVAL ── */}
        {phase === 0 && (
          <div className="text-center animate-fade-in">
            <div className="w-px h-px rounded-full mx-auto"
                 style={{ background: '#FF4D4D', boxShadow: '0 0 30px 12px rgba(255,77,77,0.5)' }} />
          </div>
        )}

        {/* ── PHASE 1: IDENTIFY (email entry) ── */}
        {phase === 1 && (
          <div className="w-full max-w-lg px-8 space-y-10 animate-slide-up">
            {/* Header */}
            <div className="text-center space-y-4">
              <p className="font-mono text-[8px] uppercase tracking-[0.8em]"
                 style={{ color: 'rgba(255,77,77,0.5)' }}>
                ● MEMORY GATEWAY ACTIVE
              </p>
              <h1 className="font-display font-black uppercase leading-[0.85] tracking-tight"
                  style={{ fontSize: 'clamp(36px, 7vw, 72px)', color: 'rgba(245,240,232,0.9)' }}>
                IDENTIFY<br />
                <em className="italic" style={{ color: '#FF4D4D' }}>YOURSELF</em>
              </h1>
              <p className="font-mono text-[9px] uppercase tracking-[0.4em]"
                 key={fragIdx}
                 style={{ color: 'rgba(245,240,232,0.2)', animation: 'fade-in 0.5s ease' }}>
                {MEMORY_FRAGMENTS[fragIdx]}
              </p>
            </div>

            {/* Email terminal input */}
            <div className="relative group">
              {/* Scan line effect on focus */}
              <div className="absolute inset-0 rounded-2xl pointer-events-none transition-all duration-500"
                   style={{
                     border: email ? '1px solid rgba(255,77,77,0.5)' : '1px solid rgba(245,240,232,0.08)',
                     boxShadow: email ? '0 0 30px rgba(255,77,77,0.1), inset 0 0 30px rgba(255,77,77,0.03)' : 'none',
                   }} />
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && sendOtp()}
                placeholder="enter.your@signal.address"
                autoFocus
                className="w-full bg-transparent outline-none text-center py-6 px-8 font-mono text-lg"
                style={{
                  color: 'rgba(245,240,232,0.85)',
                  caretColor: '#FF4D4D',
                  letterSpacing: '0.05em',
                  background: 'rgba(245,240,232,0.03)',
                  borderRadius: '1rem',
                }}
              />
              {/* Cursor glow */}
              {email && (
                <div className="absolute bottom-0 left-0 right-0 h-px mx-8 transition-all"
                     style={{ background: 'linear-gradient(90deg, transparent, rgba(255,77,77,0.6), transparent)' }} />
              )}
            </div>

            {/* Submit — minimal, cinematic */}
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={sendOtp}
                disabled={loading || !email.trim()}
                className="group relative flex items-center gap-3 px-10 py-4 rounded-full transition-all duration-500 disabled:opacity-20"
                style={{
                  border: '1px solid rgba(255,77,77,0.4)',
                  background: 'rgba(255,77,77,0.08)',
                  boxShadow: '0 0 20px rgba(255,77,77,0.1)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 40px rgba(255,77,77,0.4)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,77,77,0.15)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(255,77,77,0.1)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,77,77,0.08)';
                }}
              >
                <span className="font-ui font-black uppercase tracking-[0.35em] text-[10px]"
                      style={{ color: 'rgba(255,77,77,0.9)' }}>
                  {loading ? 'TRANSMITTING...' : 'TRANSMIT SIGNAL'}
                </span>
                {!loading && <span style={{ color: 'rgba(255,77,77,0.7)' }}>→</span>}
                {loading && (
                  <div className="w-3 h-3 rounded-full"
                       style={{ border: '1px solid rgba(255,77,77,0.5)', borderTopColor: '#FF4D4D', animation: 'spin 0.8s linear infinite' }} />
                )}
              </button>

              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={() => router.push('/trips')}
                  className="font-mono text-[8px] uppercase tracking-[0.4em] opacity-20 hover:opacity-40 transition-opacity"
                  style={{ color: 'rgba(245,240,232,0.6)' }}>
                  BYPASS GATEWAY (DEV)
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── PHASE 2: TRANSMISSION ── */}
        {phase === 2 && (
          <div className="text-center space-y-8 animate-fade-in">
            <div className="relative w-24 h-24 mx-auto">
              {/* Orbital rings */}
              {[1, 0.7, 0.4].map((scale, i) => (
                <div key={i}
                     className="absolute inset-0 rounded-full"
                     style={{
                       border: '1px solid rgba(255,77,77,0.3)',
                       transform: `scale(${scale})`,
                       animation: `spin ${1.5 + i * 0.7}s linear infinite ${i % 2 === 0 ? '' : 'reverse'}`,
                     }} />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full"
                     style={{ background: '#FF4D4D', boxShadow: '0 0 20px rgba(255,77,77,0.8)' }} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.6em]"
                 style={{ color: 'rgba(255,77,77,0.7)' }}>
                SIGNAL TRANSMITTED
              </p>
              <p className="font-display font-black text-2xl uppercase" style={{ color: 'rgba(245,240,232,0.8)' }}>
                PORTAL OPENING...
              </p>
              <p className="font-mono text-[8px]" style={{ color: 'rgba(245,240,232,0.2)' }}>
                CHECK YOUR EMAIL FOR THE ACCESS CODE
              </p>
            </div>
          </div>
        )}

        {/* ── PHASE 3: CODE ARRIVAL (6-digit OTP) ── */}
        {phase === 3 && (
          <div className="w-full max-w-md px-8 space-y-10">
            <div className="text-center space-y-4">
              <p className="font-mono text-[8px] uppercase tracking-[0.6em]"
                 style={{ color: 'rgba(255,77,77,0.6)' }}>
                ● ACCESS CODE RECEIVED
              </p>
              <h2 className="font-display font-black uppercase leading-tight"
                  style={{ fontSize: 'clamp(28px, 5vw, 52px)', color: 'rgba(245,240,232,0.9)' }}>
                ENTER THE<br />
                <em className="italic" style={{ color: '#FF4D4D' }}>MEMORY CODE</em>
              </h2>
              <p className="font-mono text-[8px]" style={{ color: 'rgba(245,240,232,0.2)' }}>
                6-DIGIT CODE SENT TO {email.toUpperCase()}
              </p>
            </div>

            {/* 6 cinematic digit fragments */}
            <div className="flex gap-3 justify-center" onPaste={handlePaste}>
              {otp.map((d, i) => (
                <div key={i} className="relative">
                  {/* Glow under filled digits */}
                  {d && (
                    <div className="absolute inset-0 rounded-xl"
                         style={{
                           boxShadow: '0 0 20px rgba(255,77,77,0.4)',
                           background: 'rgba(255,77,77,0.08)',
                           animation: 'pulse-soft 1.5s ease-in-out infinite',
                         }} />
                  )}
                  <input
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                    onFocus={() => setDigitActive(i)}
                    onBlur={() => setDigitActive(-1)}
                    className="relative w-12 h-14 text-center text-2xl font-display font-black outline-none rounded-xl transition-all duration-300"
                    style={{
                      background: d ? 'rgba(255,77,77,0.12)' : 'rgba(245,240,232,0.04)',
                      border: digitActive === i
                        ? '1px solid rgba(255,77,77,0.7)'
                        : d
                          ? '1px solid rgba(255,77,77,0.4)'
                          : '1px solid rgba(245,240,232,0.08)',
                      color: d ? '#FF4D4D' : 'rgba(245,240,232,0.3)',
                      caretColor: '#FF4D4D',
                      boxShadow: digitActive === i ? '0 0 15px rgba(255,77,77,0.2)' : 'none',
                      transform: d ? 'scale(1.05)' : 'scale(1)',
                    }}
                  />
                  {/* Bottom scan line on active */}
                  {digitActive === i && (
                    <div className="absolute bottom-0 left-1 right-1 h-px"
                         style={{ background: '#FF4D4D', boxShadow: '0 0 4px rgba(255,77,77,0.8)' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-2">
              {otp.map((d, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                     style={{ background: d ? '#FF4D4D' : 'rgba(245,240,232,0.1)', boxShadow: d ? '0 0 6px rgba(255,77,77,0.6)' : 'none' }} />
              ))}
            </div>

            {loading && (
              <div className="text-center">
                <p className="font-mono text-[8px] uppercase tracking-[0.5em]"
                   style={{ color: 'rgba(255,77,77,0.6)', animation: 'pulse-soft 1s ease-in-out infinite' }}>
                  VERIFYING IDENTITY...
                </p>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => { setPhase(1); setOtp(['','','','','','']); setError(''); }}
                className="font-mono text-[8px] uppercase tracking-[0.4em] transition-opacity hover:opacity-60"
                style={{ color: 'rgba(245,240,232,0.2)' }}>
                ← WRONG SIGNAL ADDRESS
              </button>
            </div>
          </div>
        )}

        {/* ── PHASE 4: ACTIVATION ── */}
        {(phase === 4 || phase === 5) && (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="font-display font-black uppercase"
                 style={{ fontSize: 'clamp(24px, 5vw, 56px)', color: 'rgba(245,240,232,0.9)' }}>
              ACCESS<br />
              <em className="italic" style={{ color: '#FF4D4D' }}>GRANTED</em>
            </div>
            <p className="font-mono text-[8px] uppercase tracking-[0.6em]"
               style={{ color: 'rgba(255,77,77,0.5)', animation: 'pulse-soft 0.8s ease-in-out infinite' }}>
              ENTERING THE UNIVERSE...
            </p>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div
            className="absolute bottom-16 left-0 right-0 flex justify-center animate-slide-up"
            style={{ zIndex: 20 }}
          >
            <div className="px-6 py-3 rounded-full font-mono text-[9px] uppercase tracking-[0.3em]"
                 style={{ background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.25)', color: 'rgba(255,77,77,0.8)' }}>
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Dimensional collapse overlay (phase 4+) */}
      <div
        className="fixed inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #060604 0%, transparent 70%)',
          opacity: phase >= 4 ? 1 : 0,
          transform: phase >= 5 ? 'scale(3)' : 'scale(1)',
          transition: 'opacity 1.2s ease, transform 0.8s cubic-bezier(0.4,0,1,1)',
          zIndex: 50,
        }}
      />

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse-soft {
          0%,100%{ opacity:1; }
          50%{ opacity:0.4; }
        }
      `}</style>
    </div>
  );
}
