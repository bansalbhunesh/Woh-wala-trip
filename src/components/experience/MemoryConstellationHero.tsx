'use client';

/**
 * MemoryConstellationHero
 *
 * A single cinematic system — not a landing page.
 * Real trip photos drift as one field governed by a shared motion vector.
 * A Canvas layer draws the relationship threads between memories.
 * AI insights emerge from the field, not from UI cards.
 *
 * Motion architecture:
 *   ONE rAF loop → shared sinusoidal drift vector → per-depth parallax scaling
 *   Mouse position → additional parallax layer via expLerp
 *   All photo transforms computed in JS, applied to DOM via style.transform
 *   Canvas redrawn each frame for thread lines
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ── Memory dataset ──────────────────────────────────────────────────────────
// cx/cy: percent of viewport (center of photo)
// depth: 0→1 (determines parallax amplitude + z-ordering)
// baseOp: resting opacity
// blur: CSS blur in px (distant memories are less focused)
const MEMORIES = [
  {
    id: 'm01',
    src: '/memories/m01.png',
    cx: 16,
    cy: 26,
    w: 220,
    rot: -5.2,
    depth: 0.6,
    baseOp: 0.55,
    blur: 1.0,
    revealAt: 1800,
  },
  {
    id: 'm02',
    src: '/memories/m02.png',
    cx: 12,
    cy: 64,
    w: 195,
    rot: 8.1,
    depth: 0.38,
    baseOp: 0.4,
    blur: 2.4,
    revealAt: 3100,
  },
  {
    id: 'm03',
    src: '/memories/m03.png',
    cx: 48,
    cy: 21,
    w: 290,
    rot: -2.8,
    depth: 0.94,
    baseOp: 0.82,
    blur: 0.0,
    revealAt: 800,
  }, // ANCHOR — sunset jump
  {
    id: 'm04',
    src: '/memories/m04.png',
    cx: 76,
    cy: 29,
    w: 228,
    rot: 5.4,
    depth: 0.68,
    baseOp: 0.6,
    blur: 0.8,
    revealAt: 2300,
  },
  {
    id: 'm05',
    src: '/memories/m05.png',
    cx: 70,
    cy: 61,
    w: 255,
    rot: -3.9,
    depth: 0.84,
    baseOp: 0.7,
    blur: 0.3,
    revealAt: 1200,
  }, // ANCHOR — restaurant
  {
    id: 'm06',
    src: '/memories/m06.png',
    cx: 22,
    cy: 50,
    w: 210,
    rot: 6.7,
    depth: 0.5,
    baseOp: 0.46,
    blur: 1.8,
    revealAt: 2700,
  },
  {
    id: 'm07',
    src: '/memories/m07.png',
    cx: 86,
    cy: 75,
    w: 190,
    rot: -7.3,
    depth: 0.3,
    baseOp: 0.36,
    blur: 3.0,
    revealAt: 4200,
  },
  {
    id: 'm08',
    src: '/memories/m08.png',
    cx: 24,
    cy: 82,
    w: 210,
    rot: 2.9,
    depth: 0.48,
    baseOp: 0.32,
    blur: 2.2,
    revealAt: 1900,
  }, // moved bottom-left — was blocking insight/CTA center
  {
    id: 'm09',
    src: '/memories/m09.png',
    cx: 10,
    cy: 80,
    w: 190,
    rot: -5.8,
    depth: 0.26,
    baseOp: 0.3,
    blur: 3.6,
    revealAt: 3800,
  },
  {
    id: 'm10',
    src: '/memories/m10.png',
    cx: 82,
    cy: 13,
    w: 210,
    rot: 5.9,
    depth: 0.44,
    baseOp: 0.44,
    blur: 2.1,
    revealAt: 3500,
  },
  {
    id: 'm11',
    src: '/memories/m11.png',
    cx: 87,
    cy: 50,
    w: 205,
    rot: -8.1,
    depth: 0.48,
    baseOp: 0.42,
    blur: 1.8,
    revealAt: 4100,
  }, // pulled in from cx:92 edge
  {
    id: 'm12',
    src: '/memories/m12.png',
    cx: 65,
    cy: 92,
    w: 200,
    rot: 3.6,
    depth: 0.36,
    baseOp: 0.22,
    blur: 3.0,
    revealAt: 2900,
  }, // very low opacity — was behind CTA wordmark
] as const;

// Thread connections between emotionally related memories
const THREAD_PAIRS: [string, string, number][] = [
  ['m03', 'm05', 0.28], // two hero anchors — core mythology
  ['m01', 'm08', 0.12], // nature group shots — m08 now bottom-left
  ['m04', 'm05', 0.16], // eating / gathering
  ['m01', 'm06', 0.14], // mountain landscapes
  ['m11', 'm12', 0.2], // night / travel
  ['m02', 'm09', 0.12], // forest treks
  ['m07', 'm10', 0.1], // adventure moments
  ['m05', 'm12', 0.1], // human warmth thread
];

// AI insights that emerge from the constellation
const INSIGHTS = [
  'Always behind the camera.',
  'Planned 3 trips. Executed none.',
  'Photographed every meal.',
  'Emotionally available after 2am.',
  'Group therapist without consent.',
  'The one who remembered everything exactly.',
  'Still waiting on the refund from the third hotel.',
];

// Stagger order: emotional weight determines when each fragment appears
const REVEAL_ORDER = [
  'm03',
  'm05',
  'm08',
  'm04',
  'm01',
  'm06',
  'm12',
  'm02',
  'm10',
  'm11',
  'm07',
  'm09',
];

function expLerp(current: number, target: number, factor: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-factor * dt));
}

export default function MemoryConstellationHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const phaseRef = useRef(0); // seconds since start
  const rafRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const targetRef = useRef({ x: 0.5, y: 0.5 });

  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [threadsOpacity, setThreadsOpacity] = useState(0);
  const [insightIdx, setInsightIdx] = useState(-1);
  const [insightVisible, setInsightVisible] = useState(false);
  const [insightChars, setInsightChars] = useState(0);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [completePulse, setCompletePulse] = useState(false);
  const [scrollHintVisible, setScrollHintVisible] = useState(false);

  // ── Mount ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Mouse tracking ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      targetRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // ── Staged reveals ──────────────────────────────────────────────────────────
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    MEMORIES.forEach(m => {
      timers.push(
        setTimeout(() => {
          setRevealed(prev => ({ ...prev, [m.id]: true }));
        }, m.revealAt)
      );
    });

    // Threads appear once the two anchors have materialised
    timers.push(setTimeout(() => setThreadsOpacity(1), 3400));

    // CTA appears early so users always have a clear action
    timers.push(setTimeout(() => setCtaVisible(true), 4000));

    // First insight emerges sooner — keeps the user engaged
    timers.push(
      setTimeout(() => {
        setInsightIdx(0);
        setInsightVisible(true);
        setInsightChars(0);
      }, 5000)
    );

    // Brief peak intensity when the constellation completes — the "moment"
    timers.push(setTimeout(() => setCompletePulse(true), 4500));
    timers.push(setTimeout(() => setCompletePulse(false), 5400));

    // Scroll hint appears after the user has had time to read the first insight
    timers.push(setTimeout(() => setScrollHintVisible(true), 8500));

    return () => timers.forEach(clearTimeout);
  }, []);

  // Hide scroll hint once user starts scrolling
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 40) setScrollHintVisible(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Insight typewriter + cycling ────────────────────────────────────────────
  useEffect(() => {
    if (insightIdx < 0) return;
    const text = INSIGHTS[insightIdx % INSIGHTS.length];
    setInsightChars(0);
    let charCount = 0;
    const typeInterval = setInterval(() => {
      charCount++;
      setInsightChars(charCount);
      if (charCount >= text.length) clearInterval(typeInterval);
    }, 48);

    // After showing for 7 seconds, transition to next insight
    const cycleTimer = setTimeout(() => {
      setInsightVisible(false);
      setTimeout(() => {
        setInsightIdx(prev => prev + 1);
        setInsightVisible(true);
        setInsightChars(0);
      }, 1200);
    }, 9000);

    return () => {
      clearInterval(typeInterval);
      clearTimeout(cycleTimer);
    };
  }, [insightIdx]);

  // ── Main rAF loop — ONE motion system ──────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    let lastTime: number | null = null;

    // Honour reduced-motion: render once, then skip all animation
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = (timestamp: number) => {
      if (!reduceMotion) {
        rafRef.current = requestAnimationFrame(draw);
      }
      const dt = lastTime !== null ? Math.min((timestamp - lastTime) / 1000, 0.05) : 1 / 60;
      lastTime = timestamp;

      phaseRef.current += dt;
      const t = phaseRef.current;

      // Smooth mouse
      const m = mouseRef.current;
      m.x = expLerp(m.x, targetRef.current.x, 3.5, dt);
      m.y = expLerp(m.y, targetRef.current.y, 3.5, dt);

      // ONE shared drift vector — all photos live in this same gravitational field
      // Reduced motion: zero out the drift; keep mouse parallax only
      const sharedDriftX = reduceMotion ? 0 : Math.sin(t * 0.038) * 10 + Math.sin(t * 0.017) * 5;
      const sharedDriftY = reduceMotion ? 0 : Math.cos(t * 0.031) * 7 + Math.cos(t * 0.022) * 4;

      // Apply transforms to each photo
      MEMORIES.forEach(mem => {
        const el = photoRefs.current[mem.id];
        if (!el) return;

        // Mouse parallax scales with depth (deeper photos react more)
        const px = (m.x - 0.5) * 28 * mem.depth;
        const py = (m.y - 0.5) * 18 * mem.depth;

        // Total transform = shared drift × depth + mouse parallax
        const tx = sharedDriftX * mem.depth + px;
        const ty = sharedDriftY * mem.depth + py;

        el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) rotate(${mem.rot}deg)`;
      });

      // Redraw canvas threads
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Build position map for thread drawing
      const centers: Record<string, { x: number; y: number }> = {};
      MEMORIES.forEach(mem => {
        const el = photoRefs.current[mem.id];
        if (!el) return;
        // Photo center in viewport coords
        const cx = (mem.cx / 100) * W;
        const cy = (mem.cy / 100) * H;
        // Include current drift
        const sharedX = Math.sin(t * 0.038) * 10 + Math.sin(t * 0.017) * 5;
        const sharedY = Math.cos(t * 0.031) * 7 + Math.cos(t * 0.022) * 4;
        const px2 = (mouseRef.current.x - 0.5) * 28 * mem.depth;
        const py2 = (mouseRef.current.y - 0.5) * 18 * mem.depth;
        centers[mem.id] = {
          x: cx + sharedX * mem.depth + px2,
          y: cy + sharedY * mem.depth + py2,
        };
      });

      // Draw threads between related memories
      const threadPulse = 0.5 + Math.sin(t * 0.4) * 0.5; // 0–1 slow pulse
      THREAD_PAIRS.forEach(([a, b, baseAlpha]) => {
        const p1 = centers[a];
        const p2 = centers[b];
        if (!p1 || !p2) return;
        const alpha = baseAlpha * threadPulse * (threadsOpacity > 0 ? 1 : 0);
        if (alpha < 0.005) return;

        const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        grad.addColorStop(0, `rgba(255,190,100,${alpha * 0.8})`);
        grad.addColorStop(0.5, `rgba(255,210,140,${alpha})`);
        grad.addColorStop(1, `rgba(255,190,100,${alpha * 0.8})`);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.7;
        ctx.stroke();

        // Tiny node dots at connection points
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,200,100,${alpha * 1.4})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mounted, threadsOpacity]);

  // ── Canvas resize ────────────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const currentInsight = insightIdx >= 0 ? INSIGHTS[insightIdx % INSIGHTS.length] : '';
  const visibleText = currentInsight.slice(0, insightChars);

  return (
    <div
      className="relative"
      style={{ width: '100%', height: '100dvh', overflow: 'hidden', background: '#060604' }}
    >
      {/* ── Atmospheric depth gradient ───────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          background: [
            // Deep vignette — pulls edges into darkness
            'radial-gradient(ellipse 90% 85% at 50% 50%, transparent 35%, rgba(4,3,2,0.65) 75%, rgba(2,2,1,0.92) 100%)',
            // Warm breathing glow from center — memory's warmth
            'radial-gradient(ellipse 55% 55% at 48% 45%, rgba(120,60,20,0.07) 0%, transparent 70%)',
          ].join(', '),
        }}
      />

      {/* ── Dark pocket for insight + CTA — clears readability zone ─ */}
      {/* Not a box — an atmospheric absence of light in the center-bottom */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '62%',
          height: '52%',
          pointerEvents: 'none',
          zIndex: 2,
          background: [
            'radial-gradient(ellipse 75% 85% at 50% 80%, rgba(3,2,2,0.72) 0%, rgba(4,3,2,0.45) 50%, transparent 100%)',
          ].join(', '),
        }}
      />

      {/* ── Memory fragment photos — positioned as constellation ─────── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        {MEMORIES.map(mem => {
          const isVisible = !!revealed[mem.id];
          return (
            <div
              key={mem.id}
              ref={el => {
                photoRefs.current[mem.id] = el;
              }}
              style={{
                position: 'absolute',
                left: `calc(${mem.cx}% - ${mem.w / 2}px)`,
                top: `calc(${mem.cy}% - ${(mem.w * 0.67) / 2}px)`,
                width: mem.w,
                // Preserve aspect ratio — most photos are roughly 3:2
                height: Math.round(mem.w * 0.67),
                opacity: isVisible ? mem.baseOp : 0,
                filter: `blur(${mem.blur}px)`,
                // Soft edge fade — memories dissolve at their boundaries
                WebkitMaskImage:
                  'radial-gradient(ellipse 72% 72% at 50% 50%, black 15%, rgba(0,0,0,0.7) 45%, transparent 100%)',
                maskImage:
                  'radial-gradient(ellipse 72% 72% at 50% 50%, black 15%, rgba(0,0,0,0.7) 45%, transparent 100%)',
                transition: `opacity ${isVisible ? 2.2 : 0}s cubic-bezier(0.16,1,0.3,1)`,
                zIndex: Math.round(mem.depth * 10),
                willChange: 'transform, opacity',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mem.src}
                alt=""
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 4,
                  display: 'block',
                  // Subtle desaturation — memories are slightly drained of color
                  filter: `saturate(${0.55 + mem.depth * 0.45}) contrast(0.92)`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* ── Canvas — thread network between memories ──────────────────── */}
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 4,
          pointerEvents: 'none',
          opacity: threadsOpacity,
          transition: 'opacity 3s cubic-bezier(0.16,1,0.3,1)',
        }}
      />

      {/* ── Film grain ────────────────────────────────────────────────── */}
      <div className="film-grain" aria-hidden />

      {/* ── Foreground content ────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 'clamp(20px, 3vw, 40px)',
          paddingBottom: 'clamp(32px, 5vh, 56px)',
          pointerEvents: 'none',
        }}
      >
        {/* ── Top bar ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color: 'rgba(245,240,232,0.25)',
              pointerEvents: 'auto',
            }}
          >
            ● AI MEMORY SYSTEM / ACTIVE
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color: 'rgba(245,240,232,0.18)',
            }}
          >
            {Object.keys(revealed).length} / {MEMORIES.length} FRAGMENTS RECOVERED
          </span>
        </div>

        {/* ── Center region — spacer so insight is vertically centered ── */}
        <div style={{ flex: 1 }} />

        {/* ── AI Insight — emerges from the field ──────────────────── */}
        <div
          style={{
            alignSelf: 'center',
            textAlign: 'center',
            marginBottom: 'clamp(40px, 6vh, 80px)',
            maxWidth: 520,
            pointerEvents: 'none',
          }}
        >
          {insightIdx >= 0 && (
            <div
              style={{
                opacity: insightVisible ? 1 : 0,
                transform: insightVisible ? 'translateY(0)' : 'translateY(8px)',
                transition:
                  'opacity 1.4s cubic-bezier(0.16,1,0.3,1), transform 1.4s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              {/* Discovery label — feels like the AI is narrating */}
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8,
                  letterSpacing: '0.55em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,150,80,0.65)',
                  marginBottom: 14,
                  textShadow: '0 1px 12px rgba(0,0,0,0.9)',
                }}
              >
                ● PATTERN IDENTIFIED
              </p>

              {/* The insight itself — typewritten from the constellation */}
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontWeight: 900,
                  fontSize: 'clamp(22px, 3.5vw, 38px)',
                  color: 'rgba(245,240,232,0.92)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.15,
                  minHeight: '1.15em',
                  textShadow: '0 2px 24px rgba(0,0,0,0.95), 0 0 60px rgba(0,0,0,0.6)',
                }}
              >
                {visibleText}
                {insightChars < currentInsight.length && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 2,
                      height: '0.75em',
                      background: 'rgba(255,150,80,0.7)',
                      marginLeft: 3,
                      verticalAlign: 'middle',
                      animation: 'cursor-blink 0.8s step-end infinite',
                    }}
                  />
                )}
              </p>
            </div>
          )}
        </div>

        {/* ── Bottom — CTA ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            opacity: ctaVisible ? 1 : 0,
            transform: ctaVisible ? 'none' : 'translateY(16px)',
            transition:
              'opacity 1.6s cubic-bezier(0.16,1,0.3,1), transform 1.6s cubic-bezier(0.16,1,0.3,1)',
            pointerEvents: ctaVisible ? 'auto' : 'none',
          }}
        >
          {/* Wordmark */}
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 'clamp(14px, 2vw, 18px)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(245,240,232,0.70)',
                textShadow: '0 2px 16px rgba(0,0,0,0.9)',
              }}
            >
              YAAR
              <em style={{ color: '#FF4D4D', fontStyle: 'italic' }}>LORE</em>
            </p>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 'clamp(11px, 1.2vw, 13px)',
                color: 'rgba(245,240,232,0.35)',
                marginTop: 4,
                letterSpacing: '0.01em',
                textShadow: '0 1px 8px rgba(0,0,0,0.8)',
              }}
            >
              Upload your memories. The AI discovers your mythology.
            </p>
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <a
              href="/login"
              style={{
                padding: '12px 32px',
                borderRadius: 100,
                background: 'rgba(245,240,232,0.92)',
                color: '#060604',
                fontFamily: 'var(--font-ui)',
                fontWeight: 900,
                fontSize: 11,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                backdropFilter: 'blur(10px)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = '#fff';
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                  '0 8px 40px rgba(245,240,232,0.15)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(245,240,232,0.92)';
                (e.currentTarget as HTMLAnchorElement).style.transform = 'none';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
              }}
            >
              BEGIN ANALYSIS →
            </a>
            <a
              href="/demo"
              style={{
                padding: '12px 24px',
                borderRadius: 100,
                border: '1px solid rgba(245,240,232,0.14)',
                background: 'rgba(245,240,232,0.04)',
                color: 'rgba(245,240,232,0.55)',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                backdropFilter: 'blur(10px)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.borderColor = 'rgba(245,240,232,0.28)';
                el.style.color = 'rgba(245,240,232,0.85)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.borderColor = 'rgba(245,240,232,0.14)';
                el.style.color = 'rgba(245,240,232,0.55)';
              }}
            >
              SEE A DEMO
            </a>
          </div>
        </div>
      </div>

      {/* ── Constellation completion pulse — peaks for ~900ms when threads ignite ── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 5,
          background:
            'radial-gradient(ellipse 50% 50% at 50% 45%, rgba(255,160,40,0.10) 0%, rgba(255,100,40,0.04) 40%, transparent 70%)',
          opacity: completePulse ? 1 : 0,
          transition: 'opacity 0.9s cubic-bezier(0.16,1,0.3,1)',
          mixBlendMode: 'screen',
        }}
      />

      {/* ── Subtle scroll-down indicator ──────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 11,
          opacity: scrollHintVisible ? 0.55 : 0,
          transition: 'opacity 1.4s cubic-bezier(0.16,1,0.3,1)',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            letterSpacing: '0.45em',
            textTransform: 'uppercase',
            color: 'rgba(245,240,232,0.45)',
          }}
        >
          KEEP SCROLLING
        </span>
        <span
          style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            borderRight: '1.5px solid rgba(245,240,232,0.45)',
            borderBottom: '1.5px solid rgba(245,240,232,0.45)',
            transform: 'rotate(45deg) translate(-2px, -2px)',
            animation: 'scroll-hint-bob 2.4s ease-in-out infinite',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes cursor-blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
        @keyframes scroll-hint-bob {
          0%,
          100% {
            transform: rotate(45deg) translate(-2px, -2px);
            opacity: 0.8;
          }
          50% {
            transform: rotate(45deg) translate(2px, 2px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
