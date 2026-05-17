'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ParticleUniverse from './ParticleUniverse';

const ARCHETYPES = [
  {
    emoji: '⚡',
    label: 'Chaos Source',
    score: '9.2',
    color: '#FF4D4D',
    x: 62,
    y: 8,
    rot: -6,
    delay: 0,
  },
  {
    emoji: '🐈‍⬛',
    label: 'Black Cat',
    score: '7.8',
    color: '#2D9E8B',
    x: 76,
    y: 38,
    rot: 4,
    delay: 0.12,
  },
  {
    emoji: '🐕',
    label: 'Golden Ret.',
    score: '5.1',
    color: '#D49E2D',
    x: 58,
    y: 58,
    rot: -3,
    delay: 0.22,
  },
  {
    emoji: '🧍',
    label: 'NPC Energy',
    score: '2.4',
    color: '#7C6AFF',
    x: 78,
    y: 68,
    rot: 5,
    delay: 0.32,
  },
  {
    emoji: '🌟',
    label: 'Main Char.',
    score: '6.6',
    color: '#E86F2D',
    x: 66,
    y: 25,
    rot: -2,
    delay: 0.42,
  },
  {
    emoji: '🦋',
    label: 'Plot Twist',
    score: '8.3',
    color: '#C94B9E',
    x: 82,
    y: 52,
    rot: 6,
    delay: 0.5,
  },
];

const TICKER_ITEMS = [
  'Black Cat',
  'Chaos Source',
  'NPC Energy',
  'Main Character',
  'Golden Retriever',
  'Peak Delusion',
  'Villain Arc',
  'Historically Cooked',
  'Emotionally Cooked',
  'Plot Twist',
  'Chaos Rating',
  'Lore Locked',
];

export default function CinematicLanding() {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [titleChars, setTitleChars] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Animation refs — never trigger React re-renders
  const tickRef = useRef(0);
  const mousePosRef = useRef({ x: 0.5, y: 0.5 });
  const parallaxRef = useRef(ARCHETYPES.map(() => ({ x: 0, y: 0 })));
  const cardDivRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef(0);

  useEffect(() => {
    const t1 = setTimeout(() => setRevealed(true), 80);
    return () => clearTimeout(t1);
  }, []);

  // Stagger title character reveal
  useEffect(() => {
    if (!revealed) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTitleChars(i);
      if (i >= 8) clearInterval(id); // YAARLORE = 8 chars
    }, 55);
    return () => clearInterval(id);
  }, [revealed]);

  // Mouse tracking — writes to ref only, zero React renders
  const onMouseMove = useCallback((e: MouseEvent) => {
    mousePosRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [onMouseMove]);

  // Combined rAF loop — float + lerped parallax, writes directly to DOM nodes
  useEffect(() => {
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      tickRef.current += 1;
      const t = tickRef.current;
      const { x: mx, y: my } = mousePosRef.current;
      const par = parallaxRef.current;

      ARCHETYPES.forEach((a, i) => {
        // Lerp parallax toward mouse target — same feel as the old 0.12s CSS transition
        const targetX = (mx - 0.5) * 18 * (0.4 + (i % 3) * 0.35);
        const targetY = (my - 0.5) * 14 * (0.4 + (i % 3) * 0.35);
        par[i].x += (targetX - par[i].x) * 0.1;
        par[i].y += (targetY - par[i].y) * 0.1;

        const floatY = Math.sin(t / 60 + i * 1.1) * 5;
        const floatX = Math.cos(t / 80 + i * 0.9) * 2.5;

        const el = cardDivRefs.current[i];
        if (el) {
          el.style.transform = `translate(${par[i].x + floatX}px, ${par[i].y + floatY}px) rotate(${a.rot}deg)`;
        }
      });
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleEnter = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => router.push('/login'), 600);
  };

  const FULL = 'YAARLORE';

  // Colour tokens — all transitions driven by CSS `transition` on the wrapper
  const D = darkMode;
  const bg = D ? '#060604' : 'oklch(97% 0.008 70)';
  const textMain = D ? 'rgba(245,240,232,0.92)' : 'oklch(16% 0.015 60)';
  const textMuted = D ? 'rgba(245,240,232,0.60)' : 'oklch(52% 0.015 60)';
  const textFaint = D ? 'rgba(245,240,232,0.40)' : 'oklch(44% 0.015 60)';
  const borderColor = D ? 'rgba(245,240,232,0.07)' : 'oklch(87% 0.015 72)';
  const tickerText = D ? 'rgba(245,240,232,0.35)' : 'oklch(46% 0.015 60)';
  const ctaBg = D ? 'rgba(245,240,232,0.92)' : 'oklch(16% 0.015 60)';
  const ctaText = D ? '#060604' : 'oklch(97% 0.008 70)';
  const ghostBorder = D ? 'rgba(245,240,232,0.18)' : 'oklch(68% 0.015 72)';
  const ghostText = D ? 'rgba(245,240,232,0.45)' : 'oklch(38% 0.015 60)';
  const panelRadial = D ? 'none' : 'oklch(93.5% 0.012 72)';
  const panelDots = D
    ? 'none'
    : 'radial-gradient(circle, oklch(80% 0.018 72) 1.2px, transparent 1.2px)';

  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col"
      style={{
        background: bg,
        color: textMain,
        transition:
          'background 0.55s cubic-bezier(0.16,1,0.3,1), color 0.55s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* Particle universe — only mounted in dark mode */}
      {D && <ParticleUniverse phase={2} mouseX={0.5} mouseY={0.5} />}

      {/* Grain overlay — lighter in light mode, heavier in dark */}
      <div className={D ? 'film-grain' : 'light-grain'} />

      {/* Dark/light mode toggle — top-right corner */}
      <button
        onClick={() => setDarkMode(dm => !dm)}
        className="absolute top-6 right-8 z-20 font-mono text-[7.5px] uppercase tracking-[0.4em] px-3 py-1.5 rounded-full"
        style={{
          color: D ? 'rgba(245,240,232,0.45)' : 'oklch(60% 0.015 60)',
          border: `1px solid ${D ? 'rgba(245,240,232,0.12)' : 'oklch(82% 0.015 72)'}`,
          background: D ? 'rgba(245,240,232,0.04)' : 'transparent',
          transition: 'color 0.4s, border-color 0.4s, background 0.4s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '0.6';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '1';
        }}
      >
        {D ? '◑ LIGHT' : '◐ DARK'}
      </button>

      {/* ── MAIN LAYOUT: left editorial | right card collage ── */}
      <div className="relative z-10 flex flex-col lg:flex-row flex-1 min-h-0">
        {/* LEFT PANEL — editorial title + CTA */}
        <div className="flex flex-col justify-center px-10 py-12 lg:w-1/2 lg:px-16 lg:py-0 space-y-8">
          {/* Label */}
          <p
            className="font-mono text-[8px] uppercase tracking-[0.6em]"
            style={{
              color: 'oklch(60% 0.22 25)',
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,16px,0)',
              transition:
                'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s, transform 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s',
            }}
          >
            AI FRIENDSHIP ARCHIVE · SEASON 2026
          </p>

          {/* YAARLORE title — staggered char reveal */}
          <h1
            className="font-display font-black uppercase leading-[0.85] tracking-tighter"
            style={{ fontSize: 'clamp(64px, 10vw, 128px)' }}
          >
            {['YAAR', 'LORE'].map((word, wi) => (
              <div key={word} className="block overflow-hidden">
                {word.split('').map((char, ci) => {
                  const idx = wi === 0 ? ci : 4 + ci;
                  const shown = titleChars > idx;
                  return (
                    <span
                      key={ci}
                      style={{
                        display: 'inline-block',
                        color: wi === 1 ? 'oklch(60% 0.22 25)' : textMain,
                        fontStyle: wi === 1 ? 'italic' : 'normal',
                        opacity: shown ? 1 : 0,
                        transform: shown ? 'translate3d(0,0,0)' : 'translate3d(0,80%,0)',
                        filter: shown ? 'blur(0)' : 'blur(3px)',
                        transition:
                          'transform 0.5s cubic-bezier(0.16,1,0.3,1), opacity 0.3s, filter 0.35s, color 0.55s',
                      }}
                    >
                      {char}
                    </span>
                  );
                })}
              </div>
            ))}
          </h1>

          {/* Tagline */}
          <p
            className="font-display italic text-xl max-w-sm leading-snug"
            style={{
              color: textMuted,
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,16px,0)',
              transition:
                'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.45s, transform 0.55s cubic-bezier(0.16,1,0.3,1) 0.45s, color 0.55s',
            }}
          >
            "Turn your chaotic trips into cinematic friendship lore."
          </p>

          {/* CTA stack */}
          <div
            className="flex flex-col sm:flex-row gap-3"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,16px,0)',
              transition:
                'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.6s, transform 0.55s cubic-bezier(0.16,1,0.3,1) 0.6s',
            }}
          >
            <button
              onClick={handleEnter}
              disabled={leaving}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-ui font-black text-[11px] uppercase tracking-[0.3em] disabled:opacity-50"
              style={{
                background: ctaBg,
                color: ctaText,
                transition:
                  'transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s, background 0.55s, color 0.55s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.transform = 'translate3d(0,-2px,0)';
                el.style.boxShadow = D
                  ? '0 10px 36px rgba(245,240,232,0.15)'
                  : '0 10px 36px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.transform = 'translate3d(0,0,0)';
                el.style.boxShadow = 'none';
              }}
            >
              {leaving ? 'ENTERING...' : 'ENTER THE LORE →'}
            </button>
            <a
              href="/trips/join"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-ui font-black text-[11px] uppercase tracking-[0.3em]"
              style={{
                background: 'transparent',
                border: `1.5px solid ${ghostBorder}`,
                color: ghostText,
                transition:
                  'transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s, color 0.3s, border-color 0.55s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = 'translate3d(0,-2px,0)';
                el.style.borderColor = 'oklch(60% 0.22 25)';
                el.style.color = 'oklch(60% 0.22 25)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = 'translate3d(0,0,0)';
                el.style.borderColor = ghostBorder;
                el.style.color = ghostText;
              }}
            >
              JOIN A SEASON
            </a>
          </div>

          {/* Meta line */}
          <p
            className="font-mono text-[7.5px] uppercase tracking-[0.45em]"
            style={{
              color: textFaint,
              opacity: revealed ? 1 : 0,
              transition: 'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.75s, color 0.55s',
            }}
          >
            UPLOAD PHOTOS · AI GENERATES LORE · SHARE WITH YOUR YAARS
          </p>
        </div>

        {/* RIGHT PANEL — floating archetype card collage (desktop only) */}
        <div
          className="hidden lg:block relative lg:w-1/2"
          style={{ borderLeft: `1px solid ${borderColor}`, transition: 'border-color 0.55s' }}
        >
          {/* Panel bg — dot grid in light, empty in dark (particles fill it) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: panelRadial,
              backgroundImage: panelDots,
              backgroundSize: '22px 22px',
              transition: 'opacity 0.55s',
            }}
          />

          {ARCHETYPES.map((a, i) => (
            <div
              key={a.label}
              ref={el => {
                cardDivRefs.current[i] = el;
              }}
              className="absolute select-none"
              style={{
                left: `${a.x - 58}%`,
                top: `${a.y}%`,
                opacity: revealed ? 1 : 0,
                animation: revealed
                  ? `card-emerge 0.8s cubic-bezier(0.16,1,0.3,1) ${a.delay + 0.5}s both`
                  : undefined,
              }}
            >
              <div
                className="rounded-2xl p-4"
                style={{
                  background: a.color,
                  boxShadow: `0 12px 40px ${a.color}40`,
                  minWidth: 120,
                }}
              >
                <div className="text-2xl mb-2">{a.emoji}</div>
                <div
                  className="font-mono text-[7px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  {a.label}
                </div>
                <div
                  className="font-display font-black text-2xl"
                  style={{ color: 'rgba(255,255,255,0.95)' }}
                >
                  {a.score}
                </div>
              </div>
            </div>
          ))}

          {/* Ghost cooked score */}
          <div
            className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none select-none"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(120px, 16vw, 200px)',
              color: D ? 'rgba(255,77,77,0.06)' : 'oklch(60% 0.22 25 / 0.06)',
              lineHeight: 1,
              letterSpacing: '-0.03em',
              transition: 'color 0.55s',
            }}
          >
            84
          </div>

          {/* Bottom label */}
          <div className="absolute bottom-8 left-6 right-6">
            <p
              className="font-mono text-[7.5px] uppercase tracking-[0.4em]"
              style={{ color: textFaint, transition: 'color 0.55s' }}
            >
              ARCHETYPES DETECTED IN YOUR GROUP
            </p>
          </div>
        </div>
      </div>

      {/* ── BOTTOM TICKER ── */}
      <div
        className="relative z-10 overflow-hidden py-2.5"
        style={{ borderTop: `1px solid ${borderColor}`, transition: 'border-color 0.55s' }}
      >
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(3)].map((_, ri) => (
            <div key={ri} className="flex items-center">
              {TICKER_ITEMS.map(item => (
                <span key={item} className="inline-flex items-center gap-4 px-6">
                  <span
                    className="font-mono text-[8px] uppercase tracking-[0.3em]"
                    style={{ color: tickerText, transition: 'color 0.55s' }}
                  >
                    {item}
                  </span>
                  <span
                    className="w-1 h-1 rounded-full flex-shrink-0"
                    style={{ background: 'oklch(60% 0.22 25 / 0.35)' }}
                  />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Fade-out overlay when leaving */}
      <div
        className="absolute inset-0 z-30 pointer-events-none"
        style={{
          background: bg,
          opacity: leaving ? 1 : 0,
          transition: 'opacity 0.6s cubic-bezier(0.4,0,1,1)',
        }}
      />

      <style jsx>{`
        @keyframes card-emerge {
          from {
            opacity: 0;
            transform: translate3d(0, 28px, 0) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
