// Vercel build trigger stub
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import dynamic from 'next/dynamic';

// PERF: Three.js (ParticleUniverse) is ~600KB. Lazy-load it after the page
// is interactive — never block first paint on a 3D particle system.
// Low-end Android devices (Redmi Note series, most India traffic) would
// spend 2-3s just parsing Three.js on the critical path.
const ParticleUniverse = dynamic(() => import('./ParticleUniverse'), {
  ssr: false,
  loading: () => null, // silence while loading — background is sufficient
});

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
  const [showFeatures, setShowFeatures] = useState(false);
  const [showLiveLore, setShowLiveLore] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // VIRAL-03: Public showcase feed
  const { data: showcaseTrips } = trpc.trips.getPublicShowcase.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5-minute client-side cache
  });

  // Animation refs — never trigger React re-renders
  const tickRef = useRef(0);
  const mousePosRef = useRef({ x: 0.5, y: 0.5 });
  const parallaxRef = useRef(ARCHETYPES.map(() => ({ x: 0, y: 0 })));
  const cardDivRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hoveredIndexRef = useRef<number | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const t1 = setTimeout(() => setRevealed(true), 80);

    // VIRAL-02: Capture referral code
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        localStorage.setItem('yaarlore_referrer', ref);
      }
    }

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

        const isHovered = hoveredIndexRef.current === i;
        const tiltX = (my - 0.5) * -22 + (isHovered ? Math.sin(t / 20) * 4 : 0);
        const tiltY = (mx - 0.5) * 22 + (isHovered ? Math.cos(t / 20) * 4 : 0);

        const el = cardDivRefs.current[i];
        if (el) {
          el.style.transform = `perspective(600px) translate3d(${par[i].x + floatX}px, ${par[i].y + floatY}px, ${isHovered ? '40px' : '0px'}) rotateX(${tiltX}deg) rotateY(${tiltY}deg) rotateZ(${a.rot}deg) scale(${isHovered ? 1.08 : 1})`;
          el.style.zIndex = isHovered ? '50' : '10';

          const cardInner = el.firstElementChild as HTMLElement;
          if (cardInner) {
            if (isHovered) {
              const shX = (mx - 0.5) * -12;
              const shY = (my - 0.5) * -12;
              cardInner.style.boxShadow = `${shX}px ${shY}px 30px ${a.color}90, 0 0 15px ${a.color}60`;
              cardInner.style.borderColor = 'rgba(255,255,255,0.4)';
            } else {
              cardInner.style.boxShadow = `0 12px 40px ${a.color}40`;
              cardInner.style.borderColor = 'transparent';
            }
          }
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
      {/* Particle universe — desktop only. Three.js renders messily on mobile
          screens (small viewports + GPU constraints). Disabled below 768px. */}
      {D && typeof window !== 'undefined' && window.innerWidth >= 768 && (
        <ParticleUniverse phase={2} mouseX={0.5} mouseY={0.5} />
      )}

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
              aria-label="Enter Yaarlore — go to login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-ui font-black text-[11px] uppercase tracking-[0.3em] disabled:opacity-50 relative overflow-hidden group laser-btn"
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
              {/* Scanning Grid Overlay */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
                  backgroundSize: '8px 8px',
                  animation: 'grid-scroll 4s linear infinite',
                }}
              />
              {/* Laser swipe */}
              <span
                className="absolute inset-0 w-full h-full pointer-events-none laser-swipe"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  transform: 'translateX(-100%) skewX(-15deg)',
                }}
              />
              <span className="relative z-10">{leaving ? 'ENTERING...' : 'ENTER THE LORE →'}</span>
            </button>
            {/* Demo CTA — shows value before sign-up */}
            <a
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-ui font-black text-[11px] uppercase tracking-[0.3em] relative overflow-hidden group laser-btn"
              style={{
                background: 'transparent',
                border: `1.5px solid rgba(255,165,0,0.35)`,
                color: `rgba(255,165,0,0.75)`,
                transition:
                  'transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s, color 0.3s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = 'translate3d(0,-2px,0)';
                el.style.borderColor = 'rgba(255,165,0,0.65)';
                el.style.color = 'rgba(255,165,0,1)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = 'translate3d(0,0,0)';
                el.style.borderColor = 'rgba(255,165,0,0.35)';
                el.style.color = 'rgba(255,165,0,0.75)';
              }}
            >
              {/* Laser swipe */}
              <span
                className="absolute inset-0 w-full h-full pointer-events-none laser-swipe"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,165,0,0.15), transparent)',
                  transform: 'translateX(-100%) skewX(-15deg)',
                }}
              />
              <span className="relative z-10">◎ SEE A DEMO</span>
            </a>
            <a
              href="/trips/join"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-ui font-black text-[11px] uppercase tracking-[0.3em] relative overflow-hidden group laser-btn"
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
              {/* Scanning Grid Overlay */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
                style={{
                  backgroundImage: D
                    ? 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)'
                    : 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
                  backgroundSize: '8px 8px',
                  animation: 'grid-scroll 4s linear infinite',
                }}
              />
              {/* Laser swipe */}
              <span
                className="absolute inset-0 w-full h-full pointer-events-none laser-swipe"
                style={{
                  background: D
                    ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(0,0,0,0.08), transparent)',
                  transform: 'translateX(-100%) skewX(-15deg)',
                }}
              />
              <span className="relative z-10">JOIN A SEASON</span>
            </a>
            <button
              onClick={() => setShowFeatures(true)}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-ui font-black text-[11px] uppercase tracking-[0.3em] relative overflow-hidden group laser-btn"
              style={{
                background: 'transparent',
                border: `1.5px solid ${ghostBorder}`,
                color: ghostText,
                transition:
                  'transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s, color 0.3s, border-color 0.55s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.transform = 'translate3d(0,-2px,0)';
                el.style.borderColor = 'oklch(60% 0.22 25)';
                el.style.color = 'oklch(60% 0.22 25)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.transform = 'translate3d(0,0,0)';
                el.style.borderColor = ghostBorder;
                el.style.color = ghostText;
              }}
            >
              {/* Scanning Grid Overlay */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
                style={{
                  backgroundImage: D
                    ? 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)'
                    : 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
                  backgroundSize: '8px 8px',
                  animation: 'grid-scroll 4s linear infinite',
                }}
              />
              {/* Laser swipe */}
              <span
                className="absolute inset-0 w-full h-full pointer-events-none laser-swipe"
                style={{
                  background: D
                    ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(0,0,0,0.08), transparent)',
                  transform: 'translateX(-100%) skewX(-15deg)',
                }}
              />
              <span className="relative z-10">FEATURES</span>
            </button>
            {/* VIRAL-03: Live Lore CTA */}
            <button
              onClick={() => setShowLiveLore(true)}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-ui font-black text-[11px] uppercase tracking-[0.3em] relative overflow-hidden group laser-btn"
              style={{
                background: 'transparent',
                border: `1.5px solid ${ghostBorder}`,
                color: ghostText,
                transition:
                  'transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s, color 0.3s, border-color 0.55s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.transform = 'translate3d(0,-2px,0)';
                el.style.borderColor = '#FF4D4D';
                el.style.color = '#FF4D4D';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.transform = 'translate3d(0,0,0)';
                el.style.borderColor = ghostBorder;
                el.style.color = ghostText;
              }}
            >
              <span className="relative z-10">LIVE LORE</span>
            </button>
            {/* FEAT: Hall of Chaos leaderboard link */}
            <a
              href="/leaderboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-ui font-black text-[11px] uppercase tracking-[0.3em] relative overflow-hidden group laser-btn"
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
                el.style.borderColor = '#D49E2D';
                el.style.color = '#D49E2D';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = 'translate3d(0,0,0)';
                el.style.borderColor = ghostBorder;
                el.style.color = ghostText;
              }}
            >
              <span className="relative z-10">HALL OF CHAOS</span>
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
            UPLOAD PHOTOS · AI GENERATES LORE · SHARE WITH YOUR YAARS · SEE DEMO
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
              onMouseEnter={() => {
                hoveredIndexRef.current = i;
              }}
              onMouseLeave={() => {
                hoveredIndexRef.current = null;
              }}
              className="absolute select-none cursor-pointer"
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
                className="rounded-2xl p-4 border border-transparent transition-all duration-300"
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

      {/* Features Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-12 pointer-events-none"
        style={{
          opacity: showFeatures ? 1 : 0,
          pointerEvents: showFeatures ? 'auto' : 'none',
          backdropFilter: 'blur(16px)',
          background: D ? 'rgba(6,6,4,0.85)' : 'rgba(245,240,232,0.85)',
          transition: 'opacity 0.4s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div
          className="relative max-w-4xl w-full p-10 md:p-14 rounded-[2rem]"
          style={{
            background: D ? '#0E0E0C' : '#fff',
            border: `1px solid ${borderColor}`,
            transform: showFeatures ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.98)',
            transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
            boxShadow: D ? '0 24px 64px rgba(0,0,0,0.5)' : '0 24px 64px rgba(0,0,0,0.1)',
          }}
        >
          <button
            onClick={() => setShowFeatures(false)}
            className="absolute top-8 right-8 p-2 text-[10px] font-mono uppercase tracking-widest hover:opacity-60 transition-opacity"
            style={{ color: textMuted }}
          >
            ✕ CLOSE
          </button>

          <p
            className="font-mono text-[9px] uppercase tracking-[0.5em]"
            style={{ color: 'oklch(60% 0.22 25)' }}
          >
            ● CORE CAPABILITIES
          </p>
          <h2
            className="font-display font-black text-3xl md:text-5xl uppercase mt-4 mb-10"
            style={{ color: textMain }}
          >
            System Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-3">
              <h3
                className="font-display font-black text-lg md:text-xl uppercase"
                style={{ color: textMain }}
              >
                Identity Extraction
              </h3>
              <p className="font-data text-sm leading-relaxed" style={{ color: textMuted }}>
                AI-driven analysis of your photo dumps to automatically assign cinematic archetypes,
                character roles, and a definitive "Villain" of the trip.
              </p>
            </div>
            <div className="space-y-3">
              <h3
                className="font-display font-black text-lg md:text-xl uppercase"
                style={{ color: textMain }}
              >
                Emotional Compression
              </h3>
              <p className="font-data text-sm leading-relaxed" style={{ color: textMuted }}>
                Transform raw metadata into a high-fidelity documentary narrative. Your chaotic
                weekend is repackaged into A24-style aesthetic storytelling.
              </p>
            </div>
            <div className="space-y-3">
              <h3
                className="font-display font-black text-lg md:text-xl uppercase"
                style={{ color: textMain }}
              >
                Cooked Indexing
              </h3>
              <p className="font-data text-sm leading-relaxed" style={{ color: textMuted }}>
                Every trip is rigorously scored on our proprietary 0-100 "Cooked" scale, measuring
                the exact level of unhinged energy present in the uploaded evidence.
              </p>
            </div>
            <div className="space-y-3">
              <h3
                className="font-display font-black text-lg md:text-xl uppercase"
                style={{ color: textMain }}
              >
                Dark Room Archives
              </h3>
              <p className="font-data text-sm leading-relaxed" style={{ color: textMuted }}>
                All generated lore is permanently etched into the Yaarlore visual dossier, featuring
                interactive widgets, metadata receipts, and legacy memory collages.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* VIRAL-03: Live Lore Overlay — real public trips feed */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-12 pointer-events-none"
        style={{
          opacity: showLiveLore ? 1 : 0,
          pointerEvents: showLiveLore ? 'auto' : 'none',
          backdropFilter: 'blur(16px)',
          background: D ? 'rgba(6,6,4,0.88)' : 'rgba(245,240,232,0.88)',
          transition: 'opacity 0.4s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div
          className="relative max-w-2xl w-full p-10 md:p-14 rounded-[2rem]"
          style={{
            background: D ? '#0E0E0C' : '#fff',
            border: `1px solid ${borderColor}`,
            transform: showLiveLore ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.98)',
            transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
            boxShadow: D ? '0 24px 64px rgba(0,0,0,0.5)' : '0 24px 64px rgba(0,0,0,0.1)',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}
        >
          <button
            onClick={() => setShowLiveLore(false)}
            className="absolute top-8 right-8 p-2 text-[10px] font-mono uppercase tracking-widest hover:opacity-60 transition-opacity"
            style={{ color: textMuted }}
          >
            ✕ CLOSE
          </button>

          <p
            className="font-mono text-[9px] uppercase tracking-[0.5em]"
            style={{ color: '#FF4D4D' }}
          >
            ● LIVE FEED
          </p>
          <h2
            className="font-display font-black text-3xl md:text-4xl uppercase mt-4 mb-2"
            style={{ color: textMain }}
          >
            Live from Yaarlore
          </h2>
          <p className="font-data text-sm mb-8" style={{ color: textMuted }}>
            Real trips. Real chaos. Real mythology.
          </p>

          {!showcaseTrips || showcaseTrips.length === 0 ? (
            <div
              className="text-center py-12 font-mono text-[10px] uppercase tracking-widest"
              style={{ color: textFaint }}
            >
              No public trips yet — be the first.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {showcaseTrips.map(trip => (
                <div
                  key={trip.id}
                  className="rounded-xl p-4 space-y-2 border transition-colors"
                  style={{
                    background: D ? 'rgba(255,255,255,0.03)' : 'oklch(95% 0.008 70)',
                    borderColor: D ? 'rgba(255,255,255,0.06)' : 'oklch(88% 0.015 72)',
                  }}
                >
                  <div
                    className="text-[8px] font-mono uppercase tracking-[0.3em] truncate"
                    style={{ color: textFaint }}
                  >
                    {trip.destination}
                  </div>
                  {trip.tagline && (
                    <div
                      className="text-[11px] font-cinematic leading-snug line-clamp-2"
                      style={{ color: textMuted }}
                    >
                      &ldquo;{trip.tagline}&rdquo;
                    </div>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-black text-xl" style={{ color: '#FF4D4D' }}>
                      {trip.chaosScore}
                    </span>
                    <span
                      className="font-mono text-[7px] uppercase tracking-wider"
                      style={{ color: 'rgba(255,77,77,0.5)' }}
                    >
                      /100 cooked
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                <span key={item} className="inline-flex items-center gap-4 px-6 group/ticker">
                  <span
                    className="font-mono text-[8px] uppercase tracking-[0.3em] cursor-pointer hover:text-[#FF4D4D] transition-colors relative hover:glitch-text"
                    data-text={item}
                    style={{ color: tickerText, transition: 'color 0.55s' }}
                  >
                    {item}
                  </span>
                  <span
                    className="w-1 h-1 rounded-full flex-shrink-0 group-hover/ticker:scale-125 transition-transform"
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
        @keyframes grid-scroll {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 40px;
          }
        }
        @keyframes laser-swipe {
          0% {
            transform: translateX(-100%) skewX(-15deg);
          }
          100% {
            transform: translateX(100%) skewX(-15deg);
          }
        }
        .laser-btn:hover .laser-swipe {
          animation: laser-swipe 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
