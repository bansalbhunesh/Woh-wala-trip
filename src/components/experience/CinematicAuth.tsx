'use client';
import Link from 'next/link';

/**
 * CinematicAuth — premium OTP login with reliable first paint.
 *
 * Production rewrite:
 *   - Form is visible IMMEDIATELY (no phase 0 black-screen wait)
 *   - Light ambient background (no heavy 8-ring portal canvas)
 *   - Defensive Supabase init — page works even if env vars are missing
 *   - SSR-safe: renders meaningful structure server-side
 *   - Single rAF loop for ambient particle drift
 *
 * Flow:
 *   1. Email → POST /api/auth/send-otp
 *   2. 8-digit OTP → POST /api/auth/verify-otp
 *   3. Session refresh → redirect to /trips (or ?redirect=)
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FRAGMENTS = [
  '"three plans, none executed — confirmed"',
  '"chaos score: 84 / 100"',
  '"emotionally cooked: verified"',
  '"4 am was always their idea"',
  '"this trip cannot be unexperienced"',
  '"friendship lore: reconstructing"',
];

// ── Ambient background — much lighter than the previous portal ──────────────
function AmbientBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // Lightweight memory particles — drift slowly upward
    const N = Math.min(40, Math.floor((W * H) / 36000));
    const particles = Array.from({ length: N }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.6 + Math.random() * 1.2,
      vy: -0.15 - Math.random() * 0.25,
      a: 0.05 + Math.random() * 0.25,
      ph: Math.random() * Math.PI * 2,
    }));

    let raf = 0;
    let t0 = 0;

    const draw = (ts: number) => {
      raf = requestAnimationFrame(draw);
      const dt = t0 > 0 ? Math.min((ts - t0) / 1000, 0.05) : 1 / 60;
      t0 = ts;

      ctx.clearRect(0, 0, W, H);

      // Warm center glow — like distant firelight
      const cx = W / 2;
      const cy = H / 2;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.6);
      g.addColorStop(0, 'rgba(255,140,40,0.06)');
      g.addColorStop(0.4, 'rgba(180,60,20,0.03)');
      g.addColorStop(1, 'rgba(4,2,2,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Drifting amber particles
      for (const p of particles) {
        p.y += p.vy * dt * 60;
        p.ph += dt * 0.6;
        if (p.y < -10) {
          p.y = H + 10;
          p.x = Math.random() * W;
        }
        const flicker = 0.7 + Math.sin(p.ph) * 0.3;
        ctx.fillStyle = `rgba(255,170,60,${p.a * flicker})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

// Safe relative-path-only redirect target
function readSafeRedirect(): string {
  if (typeof window === 'undefined') return '/trips';
  const raw = new URLSearchParams(window.location.search).get('redirect');
  if (!raw) return '/trips';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/trips';
  return raw;
}

export default function CinematicAuth() {
  const router = useRouter();

  // phase: 1=email | 2=otp | 3=success
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '', '', '']);
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [fragIdx, setFragIdx] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const transitionRef = useRef(false);

  // ── Existing session check — defensive ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase/client');
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) goToTrips();
      } catch {
        // Supabase not configured — let the user use the form anyway
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cycle fragments
  useEffect(() => {
    const id = setInterval(() => setFragIdx(i => (i + 1) % FRAGMENTS.length), 3400);
    return () => clearInterval(id);
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const goToTrips = () => {
    if (transitionRef.current) return;
    transitionRef.current = true;
    const target = readSafeRedirect();
    setPhase(3);
    setTimeout(() => {
      router.refresh();
      router.push(target);
    }, 900);
  };

  // Send OTP
  const sendOtp = async () => {
    if (cooldown > 0 || sendLoading) return;
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setSendLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? 'Failed to send code. Try again.');
        setCooldown(30);
      } else {
        setPhase(2);
        setTimeout(() => otpRefs.current[0]?.focus(), 250);
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSendLoading(false);
    }
  };

  // Verify OTP
  const verifyOtp = async (digits: string[]) => {
    const token = digits.join('');
    if (token.length !== 8 || verifyLoading) return;
    setVerifyLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? 'Verification failed. Try again.');
        setVerifyLoading(false);
      } else {
        try {
          const { createSupabaseBrowserClient } = await import('@/lib/supabase/client');
          const supabase = createSupabaseBrowserClient();
          await supabase.auth.refreshSession();
        } catch {
          // Continue regardless — session is set server-side
        }
        goToTrips();
      }
    } catch {
      setError('Network error. Try again.');
      setVerifyLoading(false);
    }
  };

  const handleDigitChange = (i: number, val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length > 1) {
      // Paste handling
      const next = [...otp];
      digits
        .slice(0, 8)
        .split('')
        .forEach((d, idx) => {
          next[idx] = d;
        });
      setOtp(next);
      otpRefs.current[Math.min(digits.length, 7)]?.focus();
      if (next.join('').length === 8) setTimeout(() => verifyOtp(next), 50);
      return;
    }
    const digit = digits.slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 7) setTimeout(() => otpRefs.current[i + 1]?.focus(), 30);
    if (next.join('').length === 8) verifyOtp(next);
  };

  const handleDigitKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
    const next = [...otp];
    digits.split('').forEach((d, i) => {
      next[i] = d;
    });
    setOtp(next);
    otpRefs.current[Math.min(digits.length, 7)]?.focus();
    if (next.join('').length === 8) setTimeout(() => verifyOtp(next), 50);
  };

  const isDevMode =
    process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_FORCE_PROD_AUTH;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#060604',
        color: '#F5F0E8',
      }}
    >
      <AmbientBackdrop />

      {/* Subtle film grain */}
      <div className="film-grain" aria-hidden />

      {/* Vignette */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          background:
            'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(4,3,2,0.7) 100%)',
        }}
      />

      {/* Back to landing — Link for client-side nav (avoids full page reload) */}
      <Link
        href="/"
        style={{
          position: 'fixed',
          top: 24,
          left: 24,
          zIndex: 20,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          color: 'rgba(245,240,232,0.35)',
          textDecoration: 'none',
          transition: 'color 0.3s',
        }}
        onMouseEnter={e => ((e.target as HTMLElement).style.color = 'rgba(245,240,232,0.8)')}
        onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(245,240,232,0.35)')}
      >
        ← HOME
      </Link>

      {/* Wordmark top-right */}
      <span
        style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 20,
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontWeight: 900,
          fontSize: 14,
          letterSpacing: '0.1em',
          color: 'rgba(255,160,32,0.7)',
        }}
      >
        yaarlore
      </span>

      {/* ── Main form — RENDERED IMMEDIATELY, no phase 0 delay ──────────── */}
      <main
        style={{
          position: 'relative',
          zIndex: 10,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        {/* PHASE 1: EMAIL */}
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            display: phase === 1 ? 'flex' : 'none',
            flexDirection: 'column',
            gap: 32,
            animation: 'auth-fade-in 0.7s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                letterSpacing: '0.7em',
                textTransform: 'uppercase',
                color: 'rgba(255,140,30,0.55)',
                marginBottom: 14,
              }}
            >
              ● MEMORY GATEWAY
            </p>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 'clamp(40px, 7vw, 68px)',
                letterSpacing: '-0.025em',
                color: 'rgba(245,240,232,0.92)',
                lineHeight: 0.88,
                textTransform: 'uppercase',
                marginBottom: 16,
              }}
            >
              IDENTIFY
              <br />
              <em style={{ color: '#FFA020', fontStyle: 'italic' }}>YOURSELF</em>
            </h1>
            <p
              key={fragIdx}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'rgba(245,240,232,0.22)',
                letterSpacing: '0.12em',
                animation: 'auth-fade-in 0.5s cubic-bezier(0.16,1,0.3,1)',
                minHeight: '1.2em',
              }}
            >
              {FRAGMENTS[fragIdx]}
            </p>
          </div>

          <div>
            <label htmlFor="email" style={{ position: 'absolute', left: -9999 }}>
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={e => e.key === 'Enter' && sendOtp()}
              placeholder="enter.your@signal.address"
              autoFocus
              autoComplete="email"
              inputMode="email"
              style={{
                width: '100%',
                padding: '22px 24px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 15,
                background: 'rgba(245,240,232,0.06)',
                border: `1px solid ${email ? 'rgba(255,140,30,0.55)' : 'rgba(245,240,232,0.18)'}`,
                borderRadius: 14,
                color: 'rgba(245,240,232,0.95)',
                caretColor: '#FFA020',
                letterSpacing: '0.04em',
                outline: 'none',
                transition: 'border-color 0.3s, background 0.3s',
              }}
            />
          </div>

          <button
            onClick={sendOtp}
            style={{
              width: '100%',
              padding: '18px',
              borderRadius: 14,
              fontFamily: 'var(--font-ui)',
              fontWeight: 900,
              fontSize: 11,
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              background: sendLoading ? 'rgba(255,77,77,0.06)' : 'rgba(255,77,77,0.1)',
              border: '1px solid rgba(255,140,30,0.4)',
              color: 'rgba(255,165,40,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              cursor: sendLoading ? 'wait' : 'pointer',
              opacity: sendLoading ? 0.7 : 1,
              transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}
            onMouseEnter={e => {
              if (!sendLoading) {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,77,77,0.16)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 8px 30px rgba(255,77,77,0.2)';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = sendLoading
                ? 'rgba(255,77,77,0.06)'
                : 'rgba(255,77,77,0.1)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            {sendLoading ? (
              <>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    border: '1.5px solid rgba(255,165,40,0.3)',
                    borderTopColor: '#FFA020',
                    animation: 'auth-spin 0.9s linear infinite',
                    display: 'inline-block',
                  }}
                />
                TRANSMITTING…
              </>
            ) : cooldown > 0 ? (
              `WAIT ${cooldown}s`
            ) : (
              'SEND CODE →'
            )}
          </button>

          {isDevMode && (
            <p
              style={{
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 7.5,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: 'rgba(245,240,232,0.18)',
              }}
            >
              DEV MODE · code prints to your terminal
            </p>
          )}
        </div>

        {/* PHASE 2: OTP */}
        <div
          style={{
            width: '100%',
            maxWidth: 460,
            display: phase === 2 ? 'flex' : 'none',
            flexDirection: 'column',
            gap: 24,
            animation: 'auth-fade-in 0.6s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                letterSpacing: '0.6em',
                textTransform: 'uppercase',
                color: 'rgba(255,140,30,0.55)',
                marginBottom: 14,
              }}
            >
              ● CODE TRANSMITTED
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 'clamp(28px, 5vw, 44px)',
                letterSpacing: '-0.02em',
                color: 'rgba(245,240,232,0.92)',
                lineHeight: 1,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              ENTER THE <em style={{ color: '#FFA020', fontStyle: 'italic' }}>CODE</em>
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'rgba(245,240,232,0.55)',
                letterSpacing: '0.08em',
              }}
            >
              SENT TO {email.length > 30 ? email.slice(0, 27) + '…' : email.toUpperCase()}
            </p>
          </div>

          {/* 8 digit slots */}
          <div
            style={{ display: 'flex', gap: 6, justifyContent: 'center' }}
            onPaste={handlePaste}
            role="group"
            aria-label="8-digit verification code"
          >
            {otp.map((d, i) => (
              <input
                key={i}
                ref={el => {
                  otpRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleDigitKey(i, e)}
                onPaste={handlePaste}
                disabled={verifyLoading}
                aria-label={`Digit ${i + 1} of 8`}
                style={{
                  width: 'clamp(34px, 10vw, 46px)',
                  height: 'clamp(44px, 12vw, 56px)',
                  textAlign: 'center',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: 'clamp(18px, 4.5vw, 24px)',
                  background: d ? 'rgba(255,77,77,0.12)' : 'rgba(245,240,232,0.06)',
                  border: `1.5px solid ${d ? 'rgba(255,77,77,0.5)' : 'rgba(245,240,232,0.2)'}`,
                  borderRadius: 12,
                  color: d ? '#FFA020' : 'rgba(245,240,232,0.45)',
                  caretColor: '#FFA020',
                  outline: 'none',
                  transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                  opacity: verifyLoading ? 0.5 : 1,
                }}
              />
            ))}
          </div>

          {verifyLoading && (
            <p
              style={{
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.5em',
                textTransform: 'uppercase',
                color: 'rgba(255,140,30,0.7)',
                animation: 'auth-breathe 1s ease-in-out infinite',
              }}
            >
              VERIFYING…
            </p>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 12,
              borderTop: '1px solid rgba(245,240,232,0.1)',
            }}
          >
            <button
              onClick={() => {
                setPhase(1);
                setOtp(['', '', '', '', '', '', '', '']);
                setError('');
              }}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.35em',
                textTransform: 'uppercase',
                color: 'rgba(245,240,232,0.65)',
                background: 'none',
                border: 'none',
                padding: '8px 4px',
                cursor: 'pointer',
                transition: 'opacity 0.3s',
              }}
            >
              ← WRONG EMAIL
            </button>
            <button
              onClick={() => {
                setOtp(['', '', '', '', '', '', '', '']);
                sendOtp();
              }}
              disabled={cooldown > 0 || sendLoading}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.35em',
                textTransform: 'uppercase',
                color: cooldown > 0 ? 'rgba(255,140,30,0.6)' : 'rgba(245,240,232,0.65)',
                background: 'none',
                border: 'none',
                padding: '8px 4px',
                cursor: cooldown > 0 || sendLoading ? 'not-allowed' : 'pointer',
                opacity: cooldown > 0 || sendLoading ? 0.5 : 1,
                transition: 'opacity 0.3s',
              }}
            >
              {cooldown > 0 ? `RESEND IN ${cooldown}s` : 'RESEND CODE'}
            </button>
          </div>
        </div>

        {/* PHASE 3: ACCESS GRANTED */}
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            display: phase === 3 ? 'flex' : 'none',
            flexDirection: 'column',
            gap: 16,
            textAlign: 'center',
            animation: 'auth-fade-in 0.6s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              letterSpacing: '0.6em',
              textTransform: 'uppercase',
              color: 'rgba(45,158,139,0.7)',
            }}
          >
            ● IDENTITY CONFIRMED
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(36px, 7vw, 60px)',
              letterSpacing: '-0.025em',
              color: 'rgba(245,240,232,0.92)',
              lineHeight: 0.9,
              textTransform: 'uppercase',
            }}
          >
            ACCESS
            <br />
            <em style={{ color: '#FFA020', fontStyle: 'italic' }}>GRANTED</em>
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'rgba(245,240,232,0.4)',
              marginTop: 24,
            }}
          >
            Loading your archive…
          </p>
        </div>
      </main>

      {/* Error pill */}
      {error && (
        <div
          style={{
            position: 'fixed',
            bottom: 60,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 30,
            pointerEvents: 'none',
            animation: 'auth-error-rise 0.45s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <div
            role="alert"
            aria-live="assertive"
            style={{
              padding: '12px 24px',
              borderRadius: 100,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              background: 'rgba(20,8,8,0.95)',
              border: '1px solid rgba(255,77,77,0.45)',
              color: 'rgba(255,140,140,1)',
              backdropFilter: 'blur(12px)',
              maxWidth: '90vw',
              textAlign: 'center',
            }}
          >
            {error.length > 80 ? error.slice(0, 80) + '…' : error}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes auth-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes auth-fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        @keyframes auth-breathe {
          0%,
          100% {
            opacity: 0.55;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes auth-error-rise {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
