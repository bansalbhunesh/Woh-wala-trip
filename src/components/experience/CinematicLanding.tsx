'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const ParticleUniverse = dynamic(() => import('./ParticleUniverse'), { ssr: false });

// Cards occupy ONLY the peripheral zones — never the center title band (30-70% x, 30-70% y)
// and never the CTA zone (40-60% x, 72-92% y). All float animations stay in bounds.
const ARCHETYPES = [
  { emoji: '⚡', label: 'Chaos Source',  score: '9/10', color: '#FF4D4D', x:  7, y: 12, rot: -8, delay: 0    },
  { emoji: '🐈‍⬛', label: 'Black Cat',      score: '7/10', color: '#2D9E8B', x: 68, y:  9, rot:  5, delay: 0.15 },
  { emoji: '🐕', label: 'Golden Ret.',   score: '5/10', color: '#D49E2D', x: 78, y: 50, rot: -4, delay: 0.30 },
  { emoji: '🧍', label: 'NPC Energy',    score: '2/10', color: '#7C6AFF', x:  5, y: 55, rot:  7, delay: 0.45 },
  { emoji: '🌟', label: 'Main Char.',    score: '6/10', color: '#E86F2D', x: 76, y: 26, rot: -3, delay: 0.60 },
  { emoji: '🦋', label: 'Plot Twist',    score: '8/10', color: '#C94B9E', x: 28, y:  7, rot:  4, delay: 0.75 },
];

const SIGNAL_LINES = [
  '"2 days. 247 photos. 11 incidents."',
  '"CHAOS LEVEL: HISTORICALLY COOKED"',
  '"ARCHETYPES DETECTED: 6"',
  '"FRIENDSHIP STATUS: RECONSTRUCTING..."',
  '"LORE GENERATION: ACTIVE"',
];

export default function CinematicLanding() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [signalIdx, setSignalIdx] = useState(0);
  const [titleChars, setTitleChars] = useState<string[]>([]);
  const [portalHover, setPortalHover] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [tick, setTick] = useState(0);
  const phaseRef = useRef(0);

  // Advance phases automatically
  useEffect(() => {
    // Phase 0: void (0-1.2s)
    const t1 = setTimeout(() => { setPhase(1); phaseRef.current = 1; }, 1200);
    // Phase 1: signal (1.2-3.5s)
    const t2 = setTimeout(() => { setPhase(2); phaseRef.current = 2; }, 3500);
    // Phase 2: awaken (3.5-6s)
    const t3 = setTimeout(() => { setPhase(3); phaseRef.current = 3; }, 6000);
    // Phase 3: reveal (6s+)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Scan progress bar during phase 1
  useEffect(() => {
    if (phase !== 1) return;
    let v = 0;
    const id = setInterval(() => {
      v += Math.random() * 8 + 2;
      setScanProgress(Math.min(v, 100));
      if (v >= 100) clearInterval(id);
    }, 80);
    return () => clearInterval(id);
  }, [phase]);

  // Cycling signal lines
  useEffect(() => {
    if (phase < 2) return;
    const id = setInterval(() => {
      setSignalIdx(i => (i + 1) % SIGNAL_LINES.length);
    }, 2200);
    return () => clearInterval(id);
  }, [phase]);

  // Title character reveal in phase 3
  useEffect(() => {
    if (phase < 3) return;
    const full = 'YAARLORE';
    let i = 0;
    const id = setInterval(() => {
      setTitleChars(full.slice(0, i + 1).split(''));
      i++;
      if (i >= full.length) clearInterval(id);
    }, 60);
    return () => clearInterval(id);
  }, [phase]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [onMouseMove]);

  // Continuous animation tick for floating cards
  useEffect(() => {
    let id: number;
    const loop = () => { setTick(t => t + 1); id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  const handleEnter = () => {
    setPhase(4);
    // Keep body black during navigation so there's no flash of white
    document.body.style.background = '#060604';
    setTimeout(() => router.push('/login'), 1100);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden"
      style={{ background: '#060604', cursor: phase >= 3 ? 'default' : 'none' }}
    >
      {/* Three.js particle universe */}
      <ParticleUniverse phase={phase} mouseX={mousePos.x} mouseY={mousePos.y} />

      {/* ── PHASE 0: THE VOID ──────────────────────────────── */}
      <div
        className="absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-1000"
        style={{ opacity: phase === 0 ? 1 : 0, pointerEvents: 'none' }}
      >
        <div className="text-center space-y-6">
          <div
            className="w-1 h-1 rounded-full mx-auto"
            style={{
              background: '#FF4D4D',
              boxShadow: '0 0 20px 8px rgba(255,77,77,0.4)',
              animation: 'pulse 1s ease-in-out infinite',
            }}
          />
          <p className="font-mono text-[9px] uppercase tracking-[0.5em]"
             style={{ color: 'rgba(245,240,232,0.15)' }}>
            INITIALIZING
          </p>
        </div>
      </div>

      {/* ── PHASE 1: THE SIGNAL ───────────────────────────── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-10 transition-all duration-1000"
        style={{
          opacity: phase === 1 ? 1 : 0,
          pointerEvents: 'none',
          transform: phase === 1 ? 'scale(1)' : 'scale(0.97)',
        }}
      >
        <div className="text-center space-y-10 max-w-lg px-8">
          <div className="space-y-2">
            <p className="font-mono text-[8px] uppercase tracking-[0.6em]"
               style={{ color: 'rgba(255,77,77,0.6)' }}>
              ● SIGNAL DETECTED
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em]"
               style={{ color: 'rgba(245,240,232,0.25)' }}>
              RECOVERING MEMORY FRAGMENTS
            </p>
          </div>

          {/* Progress scanner */}
          <div className="space-y-2">
            <div className="relative h-px w-80 mx-auto overflow-hidden"
                 style={{ background: 'rgba(245,240,232,0.08)' }}>
              <div
                className="absolute left-0 top-0 h-full transition-all duration-100"
                style={{
                  width: `${scanProgress}%`,
                  background: 'linear-gradient(90deg, rgba(255,77,77,0.3), rgba(255,77,77,0.9))',
                  boxShadow: '0 0 8px rgba(255,77,77,0.5)',
                }}
              />
              {/* Scan line */}
              <div
                className="absolute top-0 h-full w-4"
                style={{
                  left: `${scanProgress}%`,
                  background: 'rgba(255,255,255,0.8)',
                  boxShadow: '0 0 6px rgba(255,255,255,0.5)',
                  animation: 'scan-flicker 0.15s steps(2) infinite',
                }}
              />
            </div>
            <p className="font-mono text-[8px]" style={{ color: 'rgba(245,240,232,0.2)' }}>
              {Math.floor(scanProgress)}% RECONSTRUCTED
            </p>
          </div>

          {/* Flashing data fragments */}
          <div className="grid grid-cols-3 gap-4 opacity-40">
            {['2 DAYS', '247 PHOTOS', '11 INCIDENTS', '6 PEOPLE', '84% CHAOS', '∞ LORE'].map((f, i) => (
              <div key={f} className="font-mono text-[8px] text-center"
                   style={{
                     color: 'rgba(245,240,232,0.5)',
                     animation: `flicker-data ${0.8 + i * 0.3}s steps(2) infinite`,
                   }}>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PHASE 2: AWAKENING ────────────────────────────── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-10"
        style={{
          opacity: phase === 2 ? 1 : 0,
          pointerEvents: 'none',
          transition: 'opacity 1.2s ease',
        }}
      >
        <div className="text-center space-y-8">
          <p
            className="font-mono text-[10px] uppercase tracking-[0.6em] transition-all duration-700"
            style={{ color: 'rgba(255,77,77,0.7)' }}
          >
            ● MEMORY RECONSTRUCTION COMPLETE
          </p>
          <div
            className="font-display font-black uppercase"
            style={{
              fontSize: 'clamp(18px, 3vw, 32px)',
              color: 'rgba(245,240,232,0.15)',
              letterSpacing: '0.5em',
              animation: 'pulse-text 2s ease-in-out infinite',
            }}
          >
            ENTERING THE ARCHIVE
          </div>
          {/* Cycling signal */}
          <p
            key={signalIdx}
            className="font-mono text-[9px]"
            style={{
              color: 'rgba(245,240,232,0.3)',
              animation: 'fade-signal 0.4s ease',
            }}
          >
            {SIGNAL_LINES[signalIdx]}
          </p>
        </div>
      </div>

      {/* ── PHASE 3+: THE REVEALED UNIVERSE ──────────────── */}
      <div
        className="absolute inset-0 z-10"
        style={{
          opacity: phase >= 3 ? 1 : 0,
          transition: 'opacity 1.5s ease',
          pointerEvents: phase >= 3 ? 'auto' : 'none',
        }}
      >
        {/* Depth fog layers */}
        <div className="absolute inset-0 pointer-events-none"
             style={{
               background: 'radial-gradient(ellipse 60% 50% at 50% 50%, transparent 30%, rgba(6,6,4,0.6) 100%)',
             }} />

        {/* Floating archetype cards in 3D space */}
        {ARCHETYPES.map((a, i) => {
          const parallaxX = (mousePos.x - 0.5) * 20 * (0.5 + (i % 3) * 0.3);
          const parallaxY = (mousePos.y - 0.5) * 20 * (0.5 + (i % 3) * 0.3);
          const floatY = Math.sin(tick / 60 + i * 1.2) * 6;
          const floatX = Math.cos(tick / 80 + i * 0.8) * 3;

          return (
            <div
              key={a.label}
              className="absolute"
              style={{
                left: `${a.x}%`,
                top: `${a.y}%`,
                transform: `translate(${parallaxX + floatX}px, ${parallaxY + floatY}px) rotate(${a.rot}deg)`,
                transition: 'transform 0.12s cubic-bezier(0.25,1,0.5,1)',
                animation: `card-emerge 1s cubic-bezier(0.16,1,0.3,1) ${a.delay + 0.2}s both`,
              }}
            >
              <div
                className="rounded-2xl p-4 select-none"
                style={{
                  background: `${a.color}18`,
                  border: `1px solid ${a.color}40`,
                  backdropFilter: 'blur(12px)',
                  boxShadow: `0 8px 32px ${a.color}22, inset 0 1px 0 rgba(255,255,255,0.08)`,
                  minWidth: 110,
                }}
              >
                <div className="text-2xl mb-2">{a.emoji}</div>
                <div className="text-[7px] font-ui font-bold uppercase tracking-widest mb-1"
                     style={{ color: `${a.color}99` }}>
                  {a.label}
                </div>
                <div className="font-display font-black text-xl" style={{ color: a.color }}>
                  {a.score}
                </div>
              </div>
            </div>
          );
        })}

        {/* ── CENTRAL TITLE ── */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {/* Cooked score floating behind title */}
          <div
            className="absolute font-display font-black"
            style={{
              fontSize: 'clamp(120px, 22vw, 280px)',
              color: 'rgba(255,77,77,0.04)',
              letterSpacing: '-0.05em',
              userSelect: 'none',
              lineHeight: 1,
              animation: 'slow-drift 20s ease-in-out infinite',
            }}
          >
            84
          </div>

          {/* The title — characters revealed one by one */}
          <h1
            className="relative font-display font-black uppercase text-center z-10"
            style={{
              fontSize: 'clamp(48px, 10vw, 128px)',
              letterSpacing: '-0.03em',
              lineHeight: 0.88,
              textShadow: '0 0 60px rgba(255,77,77,0.15)',
            }}
          >
            {['YAAR', 'LORE'].map((word, wi) => (
              <div key={word} className="block overflow-hidden">
                {word.split('').map((char, ci) => {
                  const charIdx = wi === 0 ? ci : 4 + ci;
                  const revealed = titleChars.length > charIdx;
                  return (
                    <span
                      key={ci}
                      style={{
                        display: 'inline-block',
                        color: wi === 1 ? '#FF4D4D' : 'rgba(245,240,232,0.92)',
                        fontStyle: wi === 1 ? 'italic' : 'normal',
                        transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,110%,0)',
                        opacity: revealed ? 1 : 0,
                        filter: revealed ? 'blur(0)' : 'blur(4px)',
                        transition: 'transform 0.55s cubic-bezier(0.16,1,0.3,1), opacity 0.35s cubic-bezier(0.16,1,0.3,1), filter 0.4s cubic-bezier(0.16,1,0.3,1)',
                      }}
                    >
                      {char}
                    </span>
                  );
                })}
              </div>
            ))}
          </h1>

          {/* Cycling lore signal below title */}
          <div
            className="mt-8 font-mono text-[9px] uppercase tracking-[0.4em] text-center"
            key={signalIdx}
            style={{
              color: 'rgba(245,240,232,0.25)',
              animation: 'fade-signal 0.5s ease',
              maxWidth: 360,
            }}
          >
            {SIGNAL_LINES[signalIdx]}
          </div>
        </div>

        {/* ── PORTAL CTA (bottom center) — z-30 keeps it above all cards ── */}
        <div
          className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-4 z-30"
          style={{ animation: 'lore-enter 1s cubic-bezier(0.16,1,0.3,1) 1.4s both' }}
        >
          <button
            onMouseEnter={() => setPortalHover(true)}
            onMouseLeave={() => setPortalHover(false)}
            onClick={handleEnter}
            className="relative group flex items-center gap-3 px-10 py-5 rounded-full"
            style={{
              background: portalHover ? 'rgba(255,77,77,1)' : 'rgba(255,77,77,0.12)',
              border: '1px solid rgba(255,77,77,0.5)',
              boxShadow: portalHover
                ? '0 0 60px rgba(255,77,77,0.45), 0 0 120px rgba(255,77,77,0.18), 0 8px 32px rgba(0,0,0,0.3)'
                : '0 0 24px rgba(255,77,77,0.18)',
              transform: portalHover ? 'translate3d(0,-2px,0) scale(1.04)' : 'translate3d(0,0,0) scale(1)',
              transition: 'background 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <span
              className="font-ui font-black uppercase tracking-[0.35em] text-[10px]"
              style={{
                color: portalHover ? '#060604' : 'rgba(255,77,77,0.9)',
                transition: 'color 0.3s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              Enter the Lore
            </span>
            <span
              style={{
                color: portalHover ? '#060604' : 'rgba(255,77,77,0.7)',
                transform: portalHover ? 'translate3d(6px,0,0)' : 'translate3d(0,0,0)',
                transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), color 0.3s cubic-bezier(0.16,1,0.3,1)',
                display: 'inline-block',
              }}
            >→</span>
          </button>

          <p className="font-mono text-[7.5px] uppercase tracking-[0.5em]"
             style={{ color: 'rgba(245,240,232,0.12)' }}>
            Season 2026 · AI Friendship Archive
          </p>
        </div>

        {/* ── BOTTOM TICKER ── */}
        <div
          className="absolute bottom-0 left-0 right-0 overflow-hidden py-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="flex animate-marquee whitespace-nowrap">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center">
                {['Black Cat', 'Chaos Source', 'NPC Energy', 'Main Character', 'Golden Retriever', 'Peak Delusion', 'Villain Arc', 'Historically Cooked'].map(t => (
                  <span key={t} className="inline-flex items-center gap-4 px-6">
                    <span className="text-[8px] font-ui font-bold uppercase tracking-[0.3em]"
                          style={{ color: 'rgba(245,240,232,0.1)' }}>{t}</span>
                    <span className="w-0.5 h-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(255,77,77,0.25)' }} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PHASE 4: PORTAL COLLAPSE — smooth full-screen fade, no scale pop ── */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: '#060604',
          opacity: phase === 4 ? 1 : 0,
          transition: 'opacity 1s cubic-bezier(0.4,0,1,1)',
        }}
      />

      <style jsx>{`
        @keyframes scan-flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes flicker-data {
          0%, 90%, 100% { opacity: 1; }
          91% { opacity: 0.1; }
        }
        @keyframes fade-signal {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-text {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.35; }
        }
        @keyframes card-emerge {
          from { opacity: 0; transform: translateY(24px) scale(0.92) rotate(var(--rot, 0deg)); }
          to { opacity: 1; transform: translateY(0) scale(1) rotate(var(--rot, 0deg)); }
        }
        @keyframes slow-drift {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
      `}</style>
    </div>
  );
}
