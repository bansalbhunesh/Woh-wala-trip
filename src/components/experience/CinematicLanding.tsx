// Vercel build trigger stub
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import dynamic from 'next/dynamic';

const MemoryConstellationHero = dynamic(() => import('./MemoryConstellationHero'), {
  ssr: false,
  loading: () => <div style={{ height: '100dvh', background: '#060604' }} />,
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
  const [leaving, setLeaving] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const { data: showcaseTrips } = trpc.trips.getPublicShowcase.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  // Capture referral code from URL params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref) localStorage.setItem('yaarlore_referrer', ref);
    }
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
      {/* ─── HERO SECTION — cinematic memory constellation ─── */}
      <MemoryConstellationHero />

      {/* ─── HOW IT WORKS — cinematic editorial spread ─── */}
      <section
        className="relative px-6 lg:px-16 py-24 md:py-32"
        style={{
          background: D ? '#0A0806' : '#FFF8F2',
          borderTop: `1px solid ${borderColor}`,
          transition: `background 0.65s cubic-bezier(0.16,1,0.3,1)`,
          overflow: 'hidden',
        }}
      >
        {/* atmospheric edge fade — connects to hero darkness */}
        {D && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(20,8,4,0.6) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
        )}

        <div className="relative max-w-5xl mx-auto">
          {/* Section header — editorial style */}
          <div className="mb-20 reveal">
            <p
              className="font-mono text-[9px] uppercase tracking-[0.5em] mb-4"
              style={{ color: labelRed }}
            >
              ● 03 STAGES OF DOCUMENTATION
            </p>
            <h2
              className="font-display font-black uppercase leading-[0.88] tracking-tighter"
              style={{
                fontSize: 'clamp(40px, 6vw, 76px)',
                color: textMain,
              }}
            >
              You upload chaos.
              <br />
              <em style={{ color: loreAccentColor, fontStyle: 'italic' }}>
                The AI writes mythology.
              </em>
            </h2>
          </div>

          {/* Three stages — vertical timeline, not grid */}
          <div className="space-y-20 md:space-y-24">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.step}
                className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-start reveal"
              >
                {/* Step number — massive, editorial */}
                <div className="md:col-span-3 md:sticky md:top-24">
                  <div
                    className="font-display font-black uppercase leading-none"
                    style={{
                      fontSize: 'clamp(80px, 11vw, 160px)',
                      color: D ? 'rgba(255,77,77,0.10)' : 'rgba(255,77,77,0.12)',
                      letterSpacing: '-0.04em',
                      lineHeight: 0.8,
                    }}
                  >
                    {step.step}
                  </div>
                </div>

                {/* Content — story-driven, not card */}
                <div className="md:col-span-9 space-y-5">
                  <div className="flex items-baseline gap-3">
                    <span
                      className="font-mono text-[10px] uppercase tracking-[0.4em]"
                      style={{ color: labelRed }}
                    >
                      STAGE {step.step}
                    </span>
                    <span style={{ color: textFaint }}>·</span>
                    <span
                      className="font-mono text-[10px] uppercase tracking-[0.3em]"
                      style={{ color: textFaint }}
                    >
                      {i === 0 ? '~ 2 MINUTES' : i === 1 ? '~ 90 SECONDS' : 'INSTANT'}
                    </span>
                  </div>
                  <h3
                    className="font-display font-black uppercase tracking-tight leading-[0.95]"
                    style={{
                      fontSize: 'clamp(28px, 4vw, 48px)',
                      color: textMain,
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="font-display italic leading-relaxed max-w-xl"
                    style={{
                      fontSize: 'clamp(15px, 1.4vw, 18px)',
                      color: textMuted,
                    }}
                  >
                    {step.body}
                  </p>
                  {/* Step-specific micro-detail */}
                  <div className="inline-flex items-center gap-2 pt-2" style={{ color: textFaint }}>
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: D ? '#FF4D4D' : '#B02525' }}
                    />
                    <span className="font-mono text-[9px] uppercase tracking-[0.3em]">
                      {i === 0 && 'Drag-drop or pick from camera roll'}
                      {i === 1 && 'Claude Sonnet 4.6 + custom signal pipeline'}
                      {i === 2 && 'Shareable on WhatsApp · Print available'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Closing kicker */}
          <div className="mt-24 pt-12 reveal" style={{ borderTop: `1px solid ${borderColor}` }}>
            <p
              className="font-display italic text-center mx-auto max-w-xl"
              style={{
                fontSize: 'clamp(16px, 1.5vw, 20px)',
                color: textMuted,
                lineHeight: 1.5,
              }}
            >
              "The AI doesn't describe what happened. It names{' '}
              <em style={{ color: loreAccentColor, fontStyle: 'normal' }}>who's responsible</em> for
              what happened."
            </p>
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

      {/* ─── FINAL CTA — cinematic closer ────────────────── */}
      <section
        className="relative py-32 md:py-40 px-6 text-center overflow-hidden"
        style={{ background: bg, borderTop: `1px solid ${borderColor}` }}
      >
        {/* Atmospheric glow — pulls the eye toward CTA */}
        {D && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(255,77,77,0.06) 0%, transparent 65%)',
              pointerEvents: 'none',
            }}
          />
        )}

        <div className="relative max-w-2xl mx-auto space-y-8 reveal">
          <p
            className="font-mono text-[9px] uppercase tracking-[0.6em]"
            style={{ color: loreAccentColor }}
          >
            ● YOUR GROUP DESERVES A DOCUMENTARY
          </p>
          <h2
            className="font-display font-black uppercase leading-[0.88] tracking-tighter"
            style={{ fontSize: 'clamp(40px, 7.5vw, 88px)', color: textMain }}
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
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={handleEnter}
              disabled={leaving}
              className="inline-flex items-center justify-center gap-2 px-10 py-[18px] rounded-full font-ui font-black text-[11px] uppercase tracking-[0.3em] disabled:opacity-50 transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: ctaBg,
                color: ctaText,
                boxShadow: D ? '0 4px 24px rgba(245,240,232,0.06)' : '0 4px 24px rgba(0,0,0,0.08)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.boxShadow = D
                  ? '0 12px 40px rgba(245,240,232,0.18)'
                  : '0 12px 40px rgba(0,0,0,0.22)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.boxShadow = D
                  ? '0 4px 24px rgba(245,240,232,0.06)'
                  : '0 4px 24px rgba(0,0,0,0.08)';
              }}
            >
              <span>{leaving ? 'ENTERING…' : 'START FOR FREE →'}</span>
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

      {/* ─── Site Footer — branded close-out ───────────── */}
      <footer
        className="py-16 px-6 lg:px-16 relative"
        style={{
          borderTop: `1px solid ${borderColor}`,
          background: D ? 'rgba(6,6,4,0.85)' : 'rgba(250,245,237,0.95)',
          backdropFilter: 'blur(12px)',
          transition: 'background 0.65s',
        }}
      >
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Brand block — large wordmark + tagline */}
          <div className="text-center space-y-3">
            <p
              className="font-display font-black tracking-tighter leading-none"
              style={{
                fontSize: 'clamp(40px, 6vw, 64px)',
                color: textMain,
              }}
            >
              YAAR
              <em style={{ color: loreAccentColor, fontStyle: 'italic' }}>LORE</em>
            </p>
            <p
              className="font-display italic text-sm md:text-base mx-auto max-w-xl"
              style={{ color: textMuted }}
            >
              India&apos;s first AI friendship mythology engine. Every chaotic trip becomes
              documented.
            </p>
          </div>

          {/* Link grid + meta */}
          <div
            className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6"
            style={{ borderTop: `1px solid ${borderColor}` }}
          >
            <p
              className="font-mono text-[8px] uppercase tracking-[0.3em]"
              style={{ color: textFaint }}
            >
              © {new Date().getFullYear()} YAARLORE · MADE WITH CHAOS IN INDIA
            </p>
            <nav
              className="flex items-center gap-5 flex-wrap justify-center"
              aria-label="Footer navigation"
            >
              {[
                { href: '/demo', label: 'Demo' },
                { href: '/leaderboard', label: 'Hall of Chaos' },
                { href: '/privacy', label: 'Privacy' },
                { href: '/terms', label: 'Terms' },
                { href: '/contact', label: 'Contact' },
                { href: '/status', label: 'Status' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="font-mono text-[9px] uppercase tracking-[0.3em] hover:opacity-90 transition-opacity"
                  style={{ color: textMuted }}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <span
              className="font-mono text-[8px] uppercase tracking-[0.3em] flex items-center gap-2"
              style={{ color: textFaint }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#FF4D4D' }}
              />
              SEASON {new Date().getFullYear()}
            </span>
          </div>
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
