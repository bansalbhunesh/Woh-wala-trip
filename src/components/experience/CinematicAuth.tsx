'use client';
/**
 * CinematicAuth — pure 6-digit OTP via custom API
 *
 * Flow:
 *   1. User enters email → POST /api/auth/send-otp
 *   2. OTP generated via Supabase admin, delivered via Resend (or console in dev)
 *   3. UI IMMEDIATELY shows 6-digit input
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

    const pts = Array.from({ length: 360 }, () => {
      const edge = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (edge === 0) { x = Math.random() * W; y = -20; }
      else if (edge === 1) { x = W + 20; y = Math.random() * H; }
      else if (edge === 2) { x = Math.random() * W; y = H + 20; }
      else { x = -20; y = Math.random() * H; }
      return {
        x, y, vx: 0, vy: 0,
        size: Math.random() * 1.7 + 0.2,
        hue: ([10, 185, 280] as number[])[Math.floor(Math.random() * 3)],
        phase: Math.random() * Math.PI * 2,
        speed: 0.007 + Math.random() * 0.01,
        settled: false,
      };
    });

    let portalR = 0, t = 0, raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 0.006;
      const p = phaseRef.current;

      ctx.fillStyle = `rgba(6,6,4,${p >= 1 ? 0.88 : 0.76})`;
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;
      const intensity = [0.5, 0.2, 0.6, 1.0, 0.0][Math.min(p, 4)];

      const portalTarget = p >= 2 ? 85 + Math.sin(t * 1.2) * 6 : p === 0 ? Math.min(t * 110, 75) : 0;
      portalR += (portalTarget - portalR) * 0.05;

      pts.forEach(pt => {
        pt.phase += pt.speed;
        const alpha = ((Math.sin(pt.phase) + 1) / 2) * intensity;
        const dx = cx - pt.x, dy = cy - pt.y, d = Math.sqrt(dx * dx + dy * dy) + 1;

        if (p === 0 && d > 35) {
          pt.vx += (dx / d) * 0.32; pt.vy += (dy / d) * 0.32;
        } else if (p >= 2 && p < 4) {
          pt.vx += (dx / d) * 0.0012; pt.vy += (dy / d) * 0.0012;
        } else if (p >= 4) {
          pt.vx += (dx / d) * 0.01; pt.vy += (dy / d) * 0.01;
        } else {
          pt.vx += (Math.random() - 0.5) * 0.003;
          pt.vy += (Math.random() - 0.5) * 0.003;
        }

        const damp = p === 0 ? 0.92 : 0.97;
        pt.vx *= damp; pt.vy *= damp;
        pt.x += pt.vx; pt.y += pt.vy;

        if (p >= 1 || d < 50) {
          if (pt.x < -8) pt.x = W + 8; if (pt.x > W + 8) pt.x = -8;
          if (pt.y < -8) pt.y = H + 8; if (pt.y > H + 8) pt.y = -8;
        }

        if (alpha < 0.015) return;
        const cols: Record<number, [number,number,number]> = { 10:[255,77,77], 185:[45,158,139], 280:[124,106,255] };
        const [r,g,b] = cols[pt.hue] ?? [245,240,232];

        if (pt.size > 1.2) {
          const grd = ctx.createRadialGradient(pt.x,pt.y,0,pt.x,pt.y,pt.size*5);
          grd.addColorStop(0,`rgba(${r},${g},${b},${alpha})`);
          grd.addColorStop(1,`rgba(${r},${g},${b},0)`);
          ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.size*5,0,Math.PI*2); ctx.fill();
        }
        ctx.fillStyle=`rgba(${r},${g},${b},${Math.min(alpha*1.3,1)})`;
        ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.size,0,Math.PI*2); ctx.fill();
      });

      if (portalR > 3 && (p === 0 || p === 2)) {
        const ra = Math.min(portalR/85,1) * 0.25 * (p===0 ? Math.min(t*2,1) : 1);
        ctx.save();
        ctx.strokeStyle=`rgba(255,77,77,${ra*1.3})`; ctx.lineWidth=1;
        ctx.shadowBlur=10; ctx.shadowColor='rgba(255,77,77,0.4)';
        ctx.beginPath(); ctx.arc(cx,cy,portalR,0,Math.PI*2); ctx.stroke();
        ctx.strokeStyle=`rgba(45,158,139,${ra*0.4})`; ctx.lineWidth=0.5; ctx.shadowBlur=5;
        ctx.beginPath(); ctx.arc(cx,cy,portalR*0.6,0,Math.PI*2); ctx.stroke();
        ctx.restore();
      }

      if (p >= 4) {
        const cA = Math.min((t % 30)*0.28, 1);
        ctx.fillStyle=`rgba(6,6,4,${cA})`; ctx.fillRect(0,0,W,H);
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
  const [otp, setOtp] = useState(['','','','','','']);
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
    if (token.length !== 6 || verifyLoading) return;
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
    if (digit && i < 5) setTimeout(() => otpRefs.current[i+1]?.focus(), 40);
    if (next.join('').length === 6) verifyOtp(next);
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
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
    if (next.join('').length === 6) setTimeout(() => verifyOtp(next), 50);
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
               style={{ background: '#FF4D4D', boxShadow: '0 0 28px 12px rgba(255,77,77,0.45)' }} />
        </div>
      </div>

      {/* ── PHASE 1: EMAIL ENTRY ── */}
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
                border: `1px solid ${inputFocused || email ? 'rgba(255,77,77,0.32)' : 'rgba(245,240,232,0.07)'}`,
                borderRadius: '0.9rem',
                color: 'rgba(245,240,232,0.85)',
                caretColor: '#FF4D4D',
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
                    style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.32)', color: 'rgba(255,77,77,0.9)', transition: 'background 0.3s ease, box-shadow 0.4s ease' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.boxShadow='0 0 40px rgba(255,77,77,0.2)'; el.style.background='rgba(255,77,77,0.13)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.boxShadow='none'; el.style.background='rgba(255,77,77,0.08)'; }}>
              {sendLoading ? (
                <><div style={{ width:12,height:12,borderRadius:'50%',border:'1px solid rgba(255,77,77,0.3)',borderTopColor:'#FF4D4D',animation:'wwt-spin 0.9s linear infinite' }} /> TRANSMITTING...</>
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

      {/* ── PHASE 2: 6-DIGIT OTP ── */}
      <div style={phaseStyle(2)}>
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-3">
            <p className="font-mono text-[8px] uppercase tracking-[0.6em]"
               style={{ color: 'rgba(255,77,77,0.45)' }}>
              ● CODE TRANSMITTED
            </p>
            <h2 className="font-display font-black uppercase leading-[0.85]"
                style={{ fontSize: 'clamp(32px, 6vw, 60px)', color: 'rgba(245,240,232,0.92)' }}>
              ENTER THE<br /><em className="italic" style={{ color: '#FF4D4D' }}>CODE</em>
            </h2>
            <p className="font-mono text-[8.5px]" style={{ color: 'rgba(245,240,232,0.25)', letterSpacing: '0.1em' }}>
              6-DIGIT CODE SENT TO {email.toUpperCase()}
            </p>
            {isDevMode && (
              <p className="font-mono text-[8px]" style={{ color: 'rgba(255,77,77,0.45)' }}>
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
                    color: d ? '#FF4D4D' : 'rgba(245,240,232,0.3)',
                    caretColor: '#FF4D4D',
                    transform: d ? 'scale(1.04)' : 'scale(1)',
                    transition: 'transform 0.2s cubic-bezier(0.16,1,0.3,1), border-color 0.3s ease, background 0.3s ease',
                  }}
                />
                {activeDigit === i && (
                  <div className="absolute bottom-0.5 left-2 right-2 h-px"
                       style={{ background: '#FF4D4D', boxShadow: '0 0 4px rgba(255,77,77,0.8)', borderRadius: 1 }} />
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

          {verifyLoading && (
            <p className="text-center font-mono text-[8px] uppercase tracking-[0.5em]"
               style={{ color: 'rgba(255,77,77,0.5)', animation: 'wwt-breathe-dot 1s ease-in-out infinite' }}>
              VERIFYING...
            </p>
          )}

          <div className="flex items-center justify-between">
            <button onClick={() => { setPhase(1); setOtp(['','','','','','']); setError(''); }}
                    className="font-mono text-[7.5px] uppercase tracking-[0.4em] hover:opacity-60 transition-opacity"
                    style={{ color: 'rgba(245,240,232,0.18)' }}>
              ← WRONG EMAIL
            </button>
            <button
              onClick={() => { setOtp(['','','','','','']); sendOtp(); }}
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
            ACCESS<br /><em className="italic" style={{ color: '#FF4D4D' }}>GRANTED</em>
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
