// Vercel build trigger stub
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import dynamic from 'next/dynamic';

const ParticleUniverse = dynamic(() => import('./ParticleUniverse'), {
  ssr: false,
  loading: () => null,
});

// Behavioral descriptors that match the product's actual voice — no dead platform labels.
// Card colors are darkened versions of brand palette to pass WCAG 4.5:1 with white text.
// Full-saturation versions (#FF4D4D etc.) are used for glows/shadows only.
const ARCHETYPES = [
  {
    emoji: '🔥',
    label: 'Three Plans, None Executed',
    score: '9.2',
    color: '#A82929', // dark red — L≈0.12, passes 4.5:1 with white
    x: 62,
    y: 8,
    rot: -6,
    delay: 0,
  },
  {
    emoji: '🎞',
    label: 'Photographed Every Meal',
    score: '7.8',
    color: '#1B6B5E', // dark teal — L≈0.07
    x: 76,
    y: 38,
    rot: 4,
    delay: 0.12,
  },
  {
    emoji: '📍',
    label: 'Late to Everything, Present',
    score: '5.1',
    color: '#7A5B18', // dark amber — L≈0.09
    x: 58,
    y: 58,
    rot: -3,
    delay: 0.22,
  },
  {
    emoji: '🌀',
    label: 'Always Behind the Camera',
    score: '2.4',
    color: '#3D2FA8', // dark purple — L≈0.06
    x: 78,
    y: 68,
    rot: 5,
    delay: 0.32,
  },
  {
    emoji: '⚡',
    label: 'Emotional Anchor Who Needed Anchoring',
    score: '6.6',
    color: '#7D3B15', // dark orange — L≈0.08
    x: 66,
    y: 25,
    rot: -2,
    delay: 0.42,
  },
  {
    emoji: '🌙',
    label: '4 AM Was Always Their Idea',
    score: '8.3',
    color: '#7A2B60', // dark pink — L≈0.08
    x: 82,
    y: 52,
    rot: 6,
    delay: 0.5,
  },
];

const TICKER_ITEMS = [
  'Peak Delusion',
  'Chaos Score',
  'Trip Mythology',
  'Villain Arc',
  'Historically Cooked',
  'Character Roles',
  'Season Recap',
  'Lore Locked',
  'Evidence Archive',
  'Friendship Docs',
  'Trip Eras',
  'Cooked Verdict',
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: '📸',
    title: 'Upload your photo dump',
    body: 'Drop your raw trip photos — candid chaos, food documentation, 3 AM mistakes, everything.',
  },
  {
    step: '02',
    icon: '🧠',
    title: 'The AI becomes your historian',
    body: 'Claude reads the behavioral signals, assigns character roles, scores the chaos, writes the mythology.',
  },
  {
    step: '03',
    icon: '🎬',
    title: 'Get your trip documentary',
    body: 'A cinematic lore archive with character cards, eras, superlatives, and a story worth sending at 2 AM.',
  },
];

const OUTPUT_TEASER = [
  {
    label: 'COOKED SCORE',
    value: '84',
    unit: '/ 100',
    verdict: 'Historically Cooked',
    color: '#FF4D4D',
    desc: 'Four of five were awake at 4 AM. Nobody had suggested sleeping.',
  },
  {
    label: 'TRIP ERA',
    value: '"The 3 AM Ramen Phase"',
    unit: 'Day 2 · Night',
    verdict: null,
    color: '#2D9E8B',
    desc: 'Everyone agreed it was a mistake. Nobody left.',
  },
  {
    label: 'CHARACTER ROLE',
    value: '"Three Plans, None Executed"',
    unit: 'Chaos Rating: 9.2',
    verdict: null,
    color: '#7C6AFF',
    desc: 'Most likely to propose a better option at 11 PM when the hotel is already booked.',
  },
];

export default function CinematicLanding() {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [titleChars, setTitleChars] = useState(0);
  const [leaving, setLeaving] = useState(false);
  // Dark mode is the product's primary aesthetic — default to true.
  const [darkMode, setDarkMode] = useState(true);
  // Narrative insight reveals — emerge from the constellation over time
  const [insight1, setInsight1] = useState(false);
  const [insight2, setInsight2] = useState(false);
  const [ctaReady, setCtaReady] = useState(false);

  const { data: showcaseTrips } = trpc.trips.getPublicShowcase.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const mouseTargetRef = useRef({ x: 0.5, y: 0.5 });
  const mousePosRef = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef(0);

  useEffect(() => {
    const t1 = setTimeout(() => setRevealed(true), 80);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) localStorage.setItem('yaarlore_referrer', ref);
    }
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (!revealed) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTitleChars(i);
      if (i >= 8) clearInterval(id);
    }, 55);
    // Narrative timing — insights emerge from the constellation
    const t2 = setTimeout(() => setInsight1(true), 6000);
    const t3 = setTimeout(() => setInsight2(true), 11000);
    const t4 = setTimeout(() => setCtaReady(true), 4000);
    return () => {
      clearInterval(id);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [revealed]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    // Write to target only — the rAF loop smoothly lerps mousePosRef toward this
    mouseTargetRef.current = {
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    };
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [onMouseMove]);

  // Smooth mouse tracking for ParticleUniverse parallax
  useEffect(() => {
    const expLerp = (current: number, target: number, factor: number, dt: number) =>
      current + (target - current) * (1 - Math.exp(-factor * dt));
    let lastFrame: number | null = null;
    const loop = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const dt = lastFrame !== null ? Math.min((timestamp - lastFrame) / 1000, 0.05) : 1 / 60;
      lastFrame = timestamp;
      const mp = mousePosRef.current;
      const mt = mouseTargetRef.current;
      mp.x = expLerp(mp.x, mt.x, 5, dt);
      mp.y = expLerp(mp.y, mt.y, 5, dt);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleEnter = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => router.push('/login'), 600);
  };

  const D = darkMode;

  // ─── DARK MODE: cinematic film noir — deep black, grain, particle universe ─────
  // ─── LIGHT MODE: warm editorial — ivory paper, golden light, ink typography ────
  // Two genuinely different identities, not just color inversion.

  const bg = D ? '#060604' : '#FAF5ED'; // dark: film black | light: warm ivory
  const sectionAlt = D ? '#0A0806' : '#FFF8F2'; // subtle alternating for sections
  const sectionAccent = D ? '#0D0A07' : '#FFF0E0'; // slightly warmer for live lore strip

  // Label / accent colors — WCAG verified for each background
  const labelRed = D ? '#FF4D4D' : '#B02525';
  const labelTeal = D ? '#2D9E8B' : '#0B5C51';
  // LORE title: electric in dark, editorial warm in light
  const loreAccentColor = D ? '#FF4D4D' : 'oklch(50% 0.22 25)';

  const textMain = D ? 'rgba(245,240,232,0.93)' : '#1A1208'; // rich warm charcoal in light
  const textMuted = D ? 'rgba(245,240,232,0.62)' : '#4A3820'; // warm dark brown
  const textFaint = D ? 'rgba(245,240,232,0.50)' : '#7A6448'; // warm muted brown
  const borderColor = D ? 'rgba(245,240,232,0.07)' : 'rgba(90,58,22,0.12)'; // warm border in light
  const tickerText = D ? 'rgba(245,240,232,0.65)' : '#5A3A16'; // readable warm brown in light
  const ctaBg = D ? 'rgba(245,240,232,0.92)' : '#1A1208';
  const ctaText = D ? '#060604' : '#FAF5ED';
  const panelRadial = D ? 'none' : '#FFF8F2';
  const panelDots = D
    ? 'none'
    : 'radial-gradient(circle, rgba(90,58,22,0.18) 1.2px, transparent 1.2px)';

  // ─── Transition: slightly longer + a whisper of blur for a cinematic "scene change" feel
  const modeTransition =
    'background 0.65s cubic-bezier(0.16,1,0.3,1), color 0.65s cubic-bezier(0.16,1,0.3,1)';

  return (
    <main
      style={{
        background: bg,
        color: textMain,
        transition: modeTransition,
        minHeight: '100vh',
        overflowX: 'hidden',
      }}
    >
      {/* ─── HERO SECTION ─────────────────────────────────── */}
      <div className="relative flex flex-col" style={{ minHeight: '100dvh' }}>
        {D && typeof window !== 'undefined' && window.innerWidth >= 768 && (
          <ParticleUniverse phase={2} mouseX={0.5} mouseY={0.5} />
        )}
        <div className={D ? 'film-grain' : 'light-grain'} />

        {/* ─── DARK MODE: deep red atmospheric bleed from bottom ─────────────── */}
        {D && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 1,
              background:
                'radial-gradient(ellipse 80% 55% at 70% 110%, rgba(180,20,20,0.12) 0%, rgba(80,6,6,0.06) 50%, transparent 70%)',
              transition: 'opacity 0.65s cubic-bezier(0.16,1,0.3,1)',
            }}
          />
        )}

        {/* ─── LIGHT MODE: warm golden afternoon light + cool sage complement ── */}
        {!D && (
          <>
            {/* Warm golden light — top right, like afternoon sun through a window */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '-8%',
                right: '-4%',
                width: '55vw',
                height: '55vw',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(255,185,40,0.14) 0%, rgba(255,140,10,0.07) 40%, transparent 68%)',
                filter: 'blur(50px)',
                pointerEvents: 'none',
                zIndex: 1,
                transition: 'opacity 0.65s',
              }}
            />
            {/* Cool sage balance — bottom left */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: '-12%',
                left: '-6%',
                width: '42vw',
                height: '42vw',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(45,140,110,0.10) 0%, transparent 62%)',
                filter: 'blur(60px)',
                pointerEvents: 'none',
                zIndex: 1,
                transition: 'opacity 0.65s',
              }}
            />
            {/* Warm amber top-left accent */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '5%',
                left: '2%',
                width: '28vw',
                height: '28vw',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(200,100,30,0.07) 0%, transparent 60%)',
                filter: 'blur(40px)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
          </>
        )}

        {/* Navbar */}
        <header
          className="relative w-full z-20 flex justify-between items-center px-6 lg:px-12 py-5 flex-shrink-0"
          style={{
            borderBottom: `1px solid ${D ? 'rgba(245,240,232,0.05)' : 'oklch(82% 0.015 72 / 0.3)'}`,
            background: D ? 'rgba(6,6,4,0.3)' : 'rgba(250,245,237,0.75)',
            transition: 'background 0.65s, border-color 0.65s',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-4">
            <span className="font-display font-black text-base tracking-[0.1em] uppercase">
              YAARLORE
            </span>
            <span
              className="hidden md:inline-block font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded border"
              style={{
                borderColor: D ? 'rgba(255,77,77,0.3)' : 'rgba(255,77,77,0.15)',
                color: '#FF4D4D',
                background: 'rgba(255,77,77,0.04)',
              }}
            >
              ● SEASON {new Date().getFullYear()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Premium mode toggle — sliding pill track, like system settings */}
            <button
              onClick={() => setDarkMode(dm => !dm)}
              aria-label={D ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={D}
              className="no-min-h relative flex-shrink-0 hover:scale-[1.04] active:scale-95"
              style={{
                position: 'relative',
                width: 72,
                height: 34,
                borderRadius: 17,
                cursor: 'pointer',
                border: 'none',
                padding: 0,
                // Track background: subtle in both modes
                background: D ? 'rgba(245,240,232,0.08)' : 'rgba(26,18,8,0.07)',
                boxShadow: D
                  ? 'inset 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(245,240,232,0.12)'
                  : 'inset 0 1px 3px rgba(0,0,0,0.12), 0 0 0 1px rgba(90,58,22,0.18)',
                transition: 'background 0.4s, box-shadow 0.4s, transform 0.2s',
              }}
            >
              {/* Moon icon — left side */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 9,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12,
                  lineHeight: 1,
                  opacity: D ? 0.85 : 0.28,
                  transition: 'opacity 0.3s',
                  userSelect: 'none',
                }}
              >
                🌙
              </span>

              {/* Sun icon — right side */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12,
                  lineHeight: 1,
                  opacity: D ? 0.28 : 0.85,
                  transition: 'opacity 0.3s',
                  userSelect: 'none',
                }}
              >
                ☀️
              </span>

              {/* Sliding pill indicator */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  background: D ? 'rgba(245,240,232,0.92)' : '#1A1208',
                  transform: D ? 'translateX(0)' : 'translateX(34px)',
                  transition: 'transform 0.38s cubic-bezier(0.16,1,0.3,1), background 0.4s',
                  boxShadow: D
                    ? '0 1px 6px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,240,232,0.15)'
                    : '0 1px 6px rgba(0,0,0,0.2)',
                }}
              />
            </button>
            <a
              href="/trips/join"
              className="hidden sm:inline-flex items-center justify-center px-4 py-1.5 rounded-full font-mono text-[9px] uppercase tracking-[0.25em] border transition-all duration-300 hover:scale-[1.03]"
              style={{
                color: textMain,
                borderColor: D ? 'rgba(245,240,232,0.15)' : 'oklch(82% 0.015 72)',
              }}
            >
              JOIN TRIP
            </a>
          </div>
        </header>

        {/* Hero body — centered cinematic scene */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 min-h-0 px-6">
          {/* ── Centered cinematic content ── */}
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-8">
            {/* Observatory label */}
            <p
              className="font-mono text-[8px] uppercase tracking-[0.7em]"
              style={{
                color: D ? 'rgba(255, 200, 140, 0.4)' : labelRed,
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,12px,0)',
                transition:
                  'opacity 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s',
              }}
            >
              AI FRIENDSHIP MYTHOLOGY ENGINE
            </p>

            {/* Title — elegant, confident, not screaming */}
            <h1
              className="font-display uppercase leading-[0.88] tracking-tighter"
              style={{
                fontSize: 'clamp(48px, 7vw, 96px)',
                fontWeight: 200,
              }}
            >
              {['YAAR', 'LORE'].map((word, wi) => (
                <span key={word} className="block overflow-hidden">
                  {word.split('').map((char, ci) => {
                    const idx = wi === 0 ? ci : 4 + ci;
                    const shown = titleChars > idx;
                    return (
                      <span
                        key={ci}
                        style={{
                          display: 'inline-block',
                          color:
                            wi === 1
                              ? D
                                ? 'rgba(255, 200, 140, 0.85)'
                                : loreAccentColor
                              : textMain,
                          fontStyle: wi === 1 ? 'italic' : 'normal',
                          fontWeight: wi === 1 ? 300 : 200,
                          opacity: shown ? 1 : 0,
                          transform: shown ? 'translate3d(0,0,0)' : 'translate3d(0,60%,0)',
                          filter: shown ? 'blur(0)' : 'blur(4px)',
                          transition:
                            'transform 0.6s cubic-bezier(0.16,1,0.3,1), opacity 0.4s, filter 0.45s',
                        }}
                      >
                        {char}
                      </span>
                    );
                  })}
                </span>
              ))}
            </h1>

            {/* Poetic tagline — one calm sentence */}
            <p
              className="font-display italic text-lg md:text-xl leading-relaxed max-w-md"
              style={{
                color: D ? 'rgba(245, 240, 232, 0.4)' : textMuted,
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,10px,0)',
                transition:
                  'opacity 0.7s cubic-bezier(0.16,1,0.3,1) 0.6s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 0.6s',
              }}
            >
              Upload your memories. The AI discovers your mythology.
            </p>

            {/* ── Narrative insights — emerge from the constellation ── */}
            <div className="flex flex-col items-center gap-5 mt-8">
              {/* Insight 1 */}
              <div
                style={{
                  opacity: insight1 ? 1 : 0,
                  transform: insight1 ? 'translate3d(0,0,0)' : 'translate3d(0,8px,0)',
                  transition:
                    'opacity 1.5s cubic-bezier(0.16,1,0.3,1), transform 1.5s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                <div
                  className="flex items-center gap-4"
                  style={{
                    borderLeft: `1px solid ${D ? 'rgba(255, 200, 140, 0.2)' : 'rgba(90, 58, 22, 0.2)'}`,
                    paddingLeft: 14,
                  }}
                >
                  <div>
                    <p
                      className="font-display italic text-sm md:text-base"
                      style={{ color: D ? 'rgba(255, 200, 140, 0.7)' : textMain }}
                    >
                      &ldquo;Always behind the camera.&rdquo;
                    </p>
                    <p
                      className="font-mono text-[8px] uppercase tracking-[0.4em] mt-1"
                      style={{ color: D ? 'rgba(255, 200, 140, 0.3)' : textFaint }}
                    >
                      Confidence: 92%
                    </p>
                  </div>
                </div>
              </div>

              {/* Insight 2 */}
              <div
                style={{
                  opacity: insight2 ? 1 : 0,
                  transform: insight2 ? 'translate3d(0,0,0)' : 'translate3d(0,8px,0)',
                  transition:
                    'opacity 1.5s cubic-bezier(0.16,1,0.3,1), transform 1.5s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                <div
                  className="flex items-center gap-4"
                  style={{
                    borderLeft: `1px solid ${D ? 'rgba(255, 200, 140, 0.15)' : 'rgba(90, 58, 22, 0.15)'}`,
                    paddingLeft: 14,
                  }}
                >
                  <div>
                    <p
                      className="font-display italic text-sm md:text-base"
                      style={{ color: D ? 'rgba(255, 200, 140, 0.6)' : textMuted }}
                    >
                      &ldquo;Planned 3 trips. Executed none.&rdquo;
                    </p>
                    <p
                      className="font-mono text-[8px] uppercase tracking-[0.4em] mt-1"
                      style={{ color: D ? 'rgba(255, 200, 140, 0.25)' : textFaint }}
                    >
                      Confidence: 87%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CTA — appears after the scene breathes ── */}
            <div
              className="flex flex-col sm:flex-row items-center gap-4 mt-6"
              style={{
                opacity: ctaReady ? 1 : 0,
                transform: ctaReady ? 'translate3d(0,0,0)' : 'translate3d(0,8px,0)',
                transition:
                  'opacity 1s cubic-bezier(0.16,1,0.3,1), transform 1s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              <button
                onClick={handleEnter}
                disabled={leaving}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-mono text-[10px] uppercase tracking-[0.35em] disabled:opacity-50 transition-all duration-300 hover:translate-y-[-2px]"
                style={{
                  background: D ? 'rgba(255, 200, 140, 0.08)' : ctaBg,
                  color: D ? 'rgba(255, 200, 140, 0.8)' : ctaText,
                  border: `1px solid ${D ? 'rgba(255, 200, 140, 0.15)' : 'rgba(26, 18, 8, 0.15)'}`,
                }}
              >
                {leaving ? 'Entering...' : 'Begin Analysis →'}
              </button>

              {showcaseTrips && showcaseTrips.length > 0 && (
                <span
                  className="font-mono text-[8px] uppercase tracking-[0.3em]"
                  style={{ color: D ? 'rgba(255, 200, 140, 0.25)' : textFaint }}
                >
                  {showcaseTrips.length} groups analyzed
                </span>
              )}
            </div>

            {/* Quiet footnote */}
            <p
              className="font-mono text-[7px] uppercase tracking-[0.5em] mt-4"
              style={{
                color: D ? 'rgba(245, 240, 232, 0.15)' : textFaint,
                opacity: ctaReady ? 1 : 0,
                transition: 'opacity 1s cubic-bezier(0.16,1,0.3,1) 0.5s',
              }}
            >
              Free for your first trip · India-first · Works on WhatsApp photo dumps
            </p>
          </div>

          {/* Screen-reader context */}
          <p className="sr-only">
            YaarLore analyzes group photos to generate friendship mythology, character roles, and
            behavioral patterns. Example insights: {ARCHETYPES.map(a => a.label).join(', ')}.
          </p>
        </div>

        {/* Ticker — aria-hidden: content is decorative; repeated 3× for visual loop.
            A hidden list below gives screen readers the same info once. */}
        <div
          className="relative z-10 overflow-hidden py-2.5 flex-shrink-0 marquee-container"
          style={{ borderTop: `1px solid ${borderColor}`, transition: 'border-color 0.55s' }}
          aria-hidden="true"
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
        {/* Screen-reader equivalent — announced once, not 3× */}
        <p className="sr-only">Yaarlore features: {TICKER_ITEMS.join(', ')}</p>
      </div>

      {/* ─── HOW IT WORKS ─────────────────────────────────── */}
      <section
        className="py-20 px-6 lg:px-20"
        style={{
          background: D ? '#0A0806' : '#FFF8F2',
          borderTop: `1px solid ${borderColor}`,
          transition: `background 0.65s cubic-bezier(0.16,1,0.3,1)`,
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 reveal">
            <p
              className="font-mono text-[9px] uppercase tracking-[0.5em] mb-3"
              style={{ color: labelRed }}
            >
              ● HOW IT WORKS
            </p>
            <h2
              className="font-display font-black text-3xl md:text-5xl uppercase leading-tight"
              style={{ color: textMain }}
            >
              Three steps.
              <br />
              One friendship documentary.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.step}
                className="relative p-8 rounded-3xl space-y-4 reveal"
                style={{
                  background: D ? 'rgba(245,240,232,0.025)' : '#FFFFFF',
                  border: `1px solid ${borderColor}`,
                  backdropFilter: D ? 'blur(8px)' : 'none',
                  boxShadow: D
                    ? 'none'
                    : '0 4px 24px rgba(90,58,22,0.08), 0 1px 4px rgba(90,58,22,0.04)',
                  transition: 'background 0.65s, box-shadow 0.65s',
                }}
              >
                {/* Step connector line */}
                {i < 2 && (
                  <div
                    className="hidden md:block absolute top-1/2 -right-4 w-8 h-px"
                    style={{ background: `linear-gradient(90deg, ${borderColor}, transparent)` }}
                  />
                )}
                <div className="text-4xl">{step.icon}</div>
                <div
                  className="font-mono text-[9px] uppercase tracking-[0.4em]"
                  style={{ color: labelRed }}
                >
                  STEP {step.step}
                </div>
                <h3
                  className="font-display font-black text-xl uppercase leading-tight"
                  style={{ color: textMain }}
                >
                  {step.title}
                </h3>
                <p
                  className="font-display italic text-sm leading-relaxed"
                  style={{ color: textMuted }}
                >
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── OUTPUT TEASER ────────────────────────────────── */}
      <section
        className="py-20 px-6 lg:px-20"
        style={{
          background: bg,
          borderTop: `1px solid ${borderColor}`,
          transition: 'background 0.65s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="mb-12 reveal">
            <p
              className="font-mono text-[9px] uppercase tracking-[0.5em] mb-3"
              style={{ color: labelTeal }}
            >
              ● EXAMPLE OUTPUT
            </p>
            <h2
              className="font-display font-black text-3xl md:text-5xl uppercase leading-tight"
              style={{ color: textMain }}
            >
              Real output.
              <br />
              <span style={{ color: loreAccentColor, fontStyle: 'italic' }}>Not a summary.</span>
            </h2>
            <p className="font-display italic text-base mt-4 max-w-lg" style={{ color: textMuted }}>
              The AI doesn't describe your trip. It reconstructs what actually happened — and calls
              out the specific person responsible.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger">
            {OUTPUT_TEASER.map(item => (
              <div
                key={item.label}
                className="p-6 rounded-3xl space-y-3 group hover:scale-[1.02] transition-transform duration-300 reveal"
                style={{
                  background: D ? `${item.color}08` : `${item.color}06`,
                  border: `1px solid ${item.color}25`,
                }}
              >
                <div
                  className="font-mono text-[8px] uppercase tracking-[0.4em]"
                  style={{ color: `${item.color}99` }}
                >
                  {item.label}
                </div>
                <div
                  className="font-display font-black text-2xl leading-tight"
                  style={{ color: item.color }}
                >
                  {item.value}
                </div>
                <div
                  className="font-mono text-[8px] uppercase tracking-[0.3em]"
                  style={{ color: textFaint }}
                >
                  {item.unit}
                </div>
                {item.verdict && (
                  <div
                    className="inline-block font-mono text-[8px] uppercase tracking-[0.3em] px-2 py-1 rounded-full"
                    style={{ background: `${item.color}15`, color: item.color }}
                  >
                    {item.verdict}
                  </div>
                )}
                <p
                  className="font-display italic text-xs leading-relaxed pt-1"
                  style={{ color: textMuted }}
                >
                  "{item.desc}"
                </p>
              </div>
            ))}
          </div>

          {/* What else you get — inline list */}
          <div
            className="mt-10 p-6 rounded-3xl"
            style={{
              background: D ? 'rgba(45,158,139,0.06)' : 'rgba(11,92,81,0.05)',
              border: `1px solid ${D ? 'rgba(45,158,139,0.18)' : 'rgba(11,92,81,0.18)'}`,
              transition: 'background 0.65s',
            }}
          >
            <p
              className="font-mono text-[9px] uppercase tracking-[0.4em] mb-4"
              style={{ color: labelTeal }}
            >
              ✦ EVERY LORE ARCHIVE INCLUDES
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                'Trip documentary (6-8 sentences)',
                'Character roles for every member',
                'Chaos score & percentile',
                'Trip eras with defining moments',
                'Superlatives ("Most likely to...")',
                'Shareable tap-through story',
                'Group anthem recommendation',
                'Closingline for the group chat',
              ].map(item => (
                <div key={item} className="flex items-start gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0"
                    style={{ background: 'rgba(45,158,139,0.6)' }}
                  />
                  <span
                    className="font-display italic text-[12px] leading-snug"
                    style={{ color: textMuted }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── LIVE LORE STRIP ──────────────────────────────── */}
      {showcaseTrips && showcaseTrips.length > 0 && (
        <section
          className="py-16 px-6 lg:px-20"
          style={{
            background: D ? '#0A0806' : '#FFF8F2',
            borderTop: `1px solid ${borderColor}`,
            transition: `background 0.65s cubic-bezier(0.16,1,0.3,1)`,
          }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
              <div>
                <p
                  className="font-mono text-[9px] uppercase tracking-[0.5em] mb-1"
                  style={{ color: labelRed }}
                >
                  ● LIVE FROM THE ARCHIVE
                </p>
                <h2
                  className="font-display font-black text-2xl md:text-3xl uppercase"
                  style={{ color: textMain }}
                >
                  Real trips. Real chaos.
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D4D] animate-pulse" />
                <span
                  className="font-mono text-[8px] uppercase tracking-[0.3em]"
                  style={{ color: textFaint }}
                >
                  {showcaseTrips.length} public trips
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {showcaseTrips.map((trip, i) => (
                <div
                  key={trip.id}
                  className="rounded-2xl p-5 space-y-3 hover:scale-[1.02] transition-transform duration-300 reveal"
                  style={{
                    background: D ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
                    boxShadow: D ? 'none' : '0 2px 16px rgba(90,58,22,0.07)',
                    border: `1px solid ${borderColor}`,
                    transitionDelay: `${i * 60}ms`,
                  }}
                >
                  <div
                    className="font-mono text-[8px] uppercase tracking-[0.3em]"
                    style={{ color: textFaint }}
                  >
                    {trip.destination}
                  </div>
                  {trip.tagline && (
                    <p
                      className="font-display italic text-sm leading-snug line-clamp-2"
                      style={{ color: textMuted }}
                    >
                      &ldquo;{trip.tagline}&rdquo;
                    </p>
                  )}
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display font-black text-3xl" style={{ color: labelRed }}>
                      {trip.chaosScore}
                    </span>
                    <span
                      className="font-mono text-[7px] uppercase tracking-wider"
                      style={{ color: 'rgba(255,77,77,0.5)' }}
                    >
                      / 100 cooked
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── FINAL CTA ────────────────────────────────────── */}
      <section
        className="py-24 px-6 text-center"
        style={{ background: bg, borderTop: `1px solid ${borderColor}` }}
      >
        <div className="max-w-2xl mx-auto space-y-7 reveal">
          <p
            className="font-mono text-[9px] uppercase tracking-[0.5em]"
            style={{ color: loreAccentColor }}
          >
            ● YOUR GROUP DESERVES A DOCUMENTARY
          </p>
          <h2
            className="font-display font-black uppercase leading-[0.9] tracking-tighter"
            style={{ fontSize: 'clamp(40px, 7vw, 80px)', color: textMain }}
          >
            The photos are
            <br />
            <span style={{ color: loreAccentColor, fontStyle: 'italic' }}>
              already in the chat.
            </span>
          </h2>
          <p className="font-display italic text-lg max-w-md mx-auto" style={{ color: textMuted }}>
            Upload them here. The AI will write the mythology nobody in your group could put into
            words.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleEnter}
              disabled={leaving}
              className="inline-flex items-center justify-center gap-2 px-10 py-[18px] rounded-full font-ui font-black text-[11px] uppercase tracking-[0.3em] disabled:opacity-50 relative overflow-hidden group laser-btn"
              style={{
                background: ctaBg,
                color: ctaText,
                transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s',
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
              <span
                className="absolute inset-0 w-full h-full pointer-events-none laser-swipe"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  transform: 'translateX(-100%) skewX(-15deg)',
                }}
              />
              <span className="relative z-10">{leaving ? 'ENTERING...' : 'START FOR FREE →'}</span>
            </button>
            <a
              href="/trips/join"
              className="inline-flex items-center justify-center gap-2 px-10 py-[18px] rounded-full font-ui font-black text-[11px] uppercase tracking-[0.3em]"
              style={{
                border: `1.5px solid ${borderColor}`,
                color: textMuted,
                transition: 'border-color 0.3s, color 0.3s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.borderColor = textMuted;
                el.style.color = textMain;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.borderColor = borderColor;
                el.style.color = textMuted;
              }}
            >
              JOIN AN EXISTING TRIP
            </a>
          </div>
          <p
            className="font-mono text-[9px] uppercase tracking-[0.35em]"
            style={{ color: textFaint }}
          >
            FIRST TRIP FREE · NO CREDIT CARD · WORKS IN SECONDS
          </p>
        </div>
      </section>

      {/* ─── Site Footer ───────────────────────────────── */}
      <footer
        className="py-8 px-6"
        style={{
          borderTop: `1px solid ${borderColor}`,
          background: D ? 'rgba(6,6,4,0.7)' : 'rgba(250,245,237,0.9)',
          backdropFilter: 'blur(12px)',
          transition: 'background 0.65s',
        }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p
            className="font-display font-black text-sm tracking-[0.15em] uppercase"
            style={{ color: textMain }}
          >
            YAARLORE
          </p>
          <nav
            className="flex items-center gap-5 flex-wrap justify-center"
            aria-label="Footer navigation"
          >
            {[
              { href: '/privacy', label: 'Privacy' },
              { href: '/terms', label: 'Terms' },
              { href: '/contact', label: 'Contact' },
              { href: '/status', label: 'Status' },
              { href: '/leaderboard', label: 'Hall of Chaos' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="font-mono text-[8px] uppercase tracking-[0.35em] hover:opacity-80 transition-opacity"
                style={{ color: textFaint }}
              >
                {label}
              </Link>
            ))}
          </nav>
          <p
            className="font-mono text-[8px] uppercase tracking-[0.3em]"
            style={{ color: textFaint }}
          >
            © {new Date().getFullYear()} Yaarlore
          </p>
        </div>
      </footer>

      {/* Fade-out overlay */}
      <div
        className="fixed inset-0 z-30 pointer-events-none"
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
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </main>
  );
}
