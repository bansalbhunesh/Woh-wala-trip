'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { LoreJson } from '@/lib/types';
import ReactionBar from '@/components/experience/ReactionBar';
import { SlidePhotoBackground } from '@/components/experience/SlidePhotoBackground';
import { MoodSoundtrack } from '@/components/experience/MoodSoundtrack';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { trpc } from '@/lib/trpc/client';

type Slide =
  | { type: 'title'; lore: LoreJson }
  | { type: 'cooked'; lore: LoreJson }
  | { type: 'recap'; lore: LoreJson }
  | { type: 'era'; lore: LoreJson; idx: number }
  | { type: 'character'; member: any }
  | { type: 'superlative'; sup: any; idx: number; lore: LoreJson }
  | { type: 'verdict'; lore: LoreJson }
  | { type: 'join'; inviteCode: string };

function buildSlides(inviteCode: string, lore: LoreJson, members: any[]): Slide[] {
  const slides: Slide[] = [];
  // VIRAL-CRITICAL: Chaos score is the instant emotional payoff.
  // It must be slide 1 — users coming from WhatsApp forwards need the
  // punchline immediately. Title context comes after they're hooked.
  slides.push({ type: 'cooked', lore });
  slides.push({ type: 'title', lore });
  if (lore.season_recap?.full_narrative) slides.push({ type: 'recap', lore });
  (lore.trip_eras || []).slice(0, 3).forEach((_, i) => slides.push({ type: 'era', lore, idx: i }));
  members.filter(m => m.role_title).forEach(m => slides.push({ type: 'character', member: m }));
  (lore.superlatives || [])
    .slice(0, 3)
    .forEach((sup, i) => slides.push({ type: 'superlative', sup, idx: i, lore }));
  slides.push({ type: 'verdict', lore });
  slides.push({ type: 'join', inviteCode });
  return slides;
}

function useCountUp(target: number, active: boolean, duration = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round(ease(p) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
}

// ─────────────────────────────────────────────────────────────────────────────
// VIRAL-01: WhatsApp one-tap share + copy link at story climax
// ─────────────────────────────────────────────────────────────────────────────
function WhatsAppShareButton({
  tripName,
  storyUrl,
  chaosScore,
  whatsappCaption,
}: {
  tripName: string;
  storyUrl: string;
  chaosScore: number;
  whatsappCaption?: string | null;
}) {
  // Use AI-generated whatsapp_caption if available — it's specifically written
  // to create group chat chaos. Fall back to generic only if absent.
  const shareText = whatsappCaption
    ? `${whatsappCaption}\n\n${storyUrl}`
    : `"${tripName}" just got immortalized. Chaos Score: ${chaosScore}/100\n\n${storyUrl}`;
  const message = encodeURIComponent(shareText);
  const waUrl = `https://wa.me/?text=${message}`;

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 w-full py-4 rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] transition-all hover:opacity-90 active:scale-[0.98]"
      style={{ background: '#25D366', color: '#fff' }}
      aria-label="Share to WhatsApp"
      onClick={e => e.stopPropagation()}
    >
      <svg
        viewBox="0 0 24 24"
        style={{ width: 18, height: 18, fill: 'currentColor', flexShrink: 0 }}
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
      Share to WhatsApp
    </a>
  );
}

function CopyLinkButton({ storyUrl }: { storyUrl: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(storyUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] transition-all hover:opacity-80 active:scale-[0.98]"
      style={{
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: copied ? 'rgba(45,158,139,0.9)' : 'rgba(255,255,255,0.55)',
      }}
    >
      {copied ? '✓ Copied!' : 'Copy Link'}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOAT: "You Might Also Dig" — similar public trips using CLIP embeddings
// ─────────────────────────────────────────────────────────────────────────────
function SimilarTripsSection({ tripId }: { tripId: string }) {
  const { data: similar, isLoading } = trpc.trips.getSimilarPublicTrips.useQuery({ tripId });

  if (isLoading) return null;
  if (!similar || similar.length === 0) return null;

  return (
    <div className="w-full space-y-3" onClick={e => e.stopPropagation()}>
      <p
        className="text-[8px] uppercase tracking-[0.45em] font-mono text-center"
        style={{ color: 'rgba(255,77,77,0.6)' }}
      >
        ● YOU MIGHT ALSO DIG
      </p>
      <div className="space-y-2">
        {similar.map(trip => (
          <a
            key={trip.tripId}
            href={`/t/${trip.tripId}`}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:opacity-90"
            style={{
              background: 'rgba(245,240,232,0.04)',
              border: '1px solid rgba(245,240,232,0.10)',
              textDecoration: 'none',
            }}
          >
            {/* Thumbnail */}
            <div
              className="flex-shrink-0 rounded-xl overflow-hidden"
              style={{ width: 44, height: 44 }}
            >
              {trip.thumbnailUrl ? (
                <img
                  src={trip.thumbnailUrl}
                  alt={trip.destination}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'rgba(255,77,77,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ color: 'rgba(255,77,77,0.4)', fontSize: 16 }}>◎</span>
                </div>
              )}
            </div>
            {/* Meta */}
            <div className="flex-1 min-w-0">
              <p
                className="font-mono text-[9px] font-bold uppercase tracking-wide truncate"
                style={{ color: 'rgba(245,240,232,0.8)' }}
              >
                {trip.destination}
              </p>
              {trip.tagline && (
                <p
                  className="font-display italic text-[10px] truncate mt-0.5"
                  style={{ color: 'rgba(245,240,232,0.35)' }}
                >
                  &ldquo;{trip.tagline}&rdquo;
                </p>
              )}
            </div>
            {/* Chaos badge */}
            <div
              className="flex-shrink-0 px-2 py-1 rounded-full font-mono text-[8px] font-bold"
              style={{
                background: 'rgba(255,77,77,0.10)',
                border: '1px solid rgba(255,77,77,0.2)',
                color: 'rgba(255,77,77,0.8)',
              }}
            >
              {trip.chaosScore}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

interface Props {
  tripId: string;
  inviteCode: string;
  lore: LoreJson;
  members: any[];
  tier?: string;
  photos: { url?: string | null; thumbnailUrl?: string | null }[];
}

export default function PublicStoryClient({
  tripId,
  inviteCode,
  lore,
  members,
  tier = 'free',
  photos,
}: Props) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<'forward' | 'backward'>('forward');
  const [animKey, setAnimKey] = useState(0);
  const [slamActive, setSlamActive] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const touchStart = useRef<number | null>(null);

  const slides = buildSlides(inviteCode, lore, members);
  const current = slides[idx];

  const advance = () => {
    if (idx >= slides.length - 1) return;
    setDir('forward');
    setAnimKey(k => k + 1);
    setIdx(i => i + 1);
    setSlamActive(false);
  };
  const retreat = () => {
    if (idx <= 0) return;
    setDir('backward');
    setAnimKey(k => k + 1);
    setIdx(i => i - 1);
    setSlamActive(false);
  };

  useEffect(() => {
    if (current.type === 'cooked') {
      // Cooked is now slide 0 — fire slam immediately on mount for instant impact
      const t = setTimeout(() => setSlamActive(true), idx === 0 ? 400 : 200);
      return () => clearTimeout(t);
    }
    setSlamActive(false);
  }, [current.type, animKey, idx]);

  const cookedScore = (lore.cooked_level ?? (lore as any).chaos_score ?? 60) as number;
  const cookedLevel = slides.find(s => s.type === 'cooked')
    ? ((lore.cooked_level ?? (lore as any).chaos_score ?? 84) as number)
    : 0;
  const countedScore = useCountUp(cookedLevel, slamActive && current.type === 'cooked', 1100);

  const anim = dir === 'forward' ? 'public-slide-right' : 'public-slide-left';

  return (
    <div
      className="fixed inset-0 bg-[#060604] overflow-hidden select-none"
      onTouchStart={e => {
        touchStart.current = e.touches[0].clientX;
      }}
      onTouchEnd={e => {
        if (!touchStart.current) return;
        const dx = e.changedTouches[0].clientX - touchStart.current;
        if (Math.abs(dx) > 80) dx < 0 ? advance() : retreat();
        touchStart.current = null;
      }}
    >
      {/* Blurred background photo */}
      <SlidePhotoBackground photos={photos} slideIdx={idx} />

      {/* Accessible tap zones — hidden on slides with interactive content (verdict/join)
          so their links and buttons receive clicks instead of the zone intercepting them. */}
      {current.type !== 'join' && current.type !== 'verdict' && (
        <>
          <button
            aria-label="Previous slide"
            tabIndex={0}
            onClick={retreat}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowLeft') retreat();
            }}
            className="absolute left-0 top-0 bottom-0 w-1/3 z-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          />
          <button
            aria-label="Next slide"
            tabIndex={0}
            onClick={advance}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') advance();
            }}
            className="absolute right-0 top-0 bottom-0 w-2/3 z-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          />
        </>
      )}
      {/* On interactive slides keep only a narrow left-edge back zone */}
      {(current.type === 'join' || current.type === 'verdict') && (
        <button
          aria-label="Previous slide"
          tabIndex={0}
          onClick={retreat}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowLeft') retreat();
          }}
          className="absolute left-0 top-16 bottom-16 w-12 z-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        />
      )}
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 px-4 pt-3">
        {slides.map((_, i) => (
          <div key={i} className="flex-1 h-1 bg-white/12 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/65 rounded-full transition-all duration-400"
              style={{
                width: i < idx ? '100%' : i === idx ? '50%' : '0%',
                boxShadow: i === idx ? '0 0 6px rgba(255,255,255,0.35)' : 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Mood Soundtrack — removed from default flow.
          Audio in mobile browsers is blocked by default on iOS/Android.
          Adds a visible UI element for <1% of users who can actually use it.
          Preserving the component but not rendering it in the default experience. */}
      {false && soundOn && (
        <div className="absolute top-6 right-24 z-50">
          <ErrorBoundary name="mood-soundtrack">
            <MoodSoundtrack
              cookedScore={cookedScore}
              active={soundOn}
              onToggle={() => setSoundOn(p => !p)}
              activeSlideType={current?.type}
              slideIndex={idx}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Back to overview */}
      <button
        onClick={e => {
          e.stopPropagation();
          router.push(`/t/${inviteCode}`);
        }}
        className="absolute top-6 right-4 z-50 text-white/40 text-xs font-vibe uppercase tracking-wider hover:text-white/65 transition-colors"
      >
        Overview
      </button>

      {/* "No login needed" pill */}
      <div
        className="absolute top-6 left-4 z-50 flex items-center gap-1.5 px-3 py-1 rounded-full text-[7.5px] font-mono uppercase tracking-wider"
        style={{
          background: 'rgba(45,158,139,0.12)',
          border: '1px solid rgba(45,158,139,0.25)',
          color: 'rgba(45,158,139,0.8)',
        }}
      >
        ✓ PUBLIC STORY
      </div>

      {/* Slide */}
      <div
        key={animKey}
        className="absolute inset-0 flex items-center justify-center px-8 py-20"
        style={{ animation: `${anim} 0.35s cubic-bezier(0.16,1,0.3,1) both` }}
      >
        <ErrorBoundary name="story-player">
          <SlideContent
            slide={current}
            slamActive={slamActive}
            countedScore={countedScore}
            inviteCode={inviteCode}
            tripId={tripId}
            tier={tier}
            tripName={(lore as any).trip_title || 'This Trip'}
            chaosScore={cookedScore}
            whatsappCaption={(lore as any).whatsapp_caption ?? null}
          />
        </ErrorBoundary>
      </div>

      {idx === 0 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-between px-8 pointer-events-none">
          <span className="text-white/55 text-xs font-vibe uppercase tracking-wider">← tap</span>
          <span className="text-white/55 text-xs font-vibe uppercase tracking-wider">tap →</span>
        </div>
      )}

      <style jsx>{`
        @keyframes public-slide-right {
          from {
            opacity: 0.4;
            transform: translateX(60px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes public-slide-left {
          from {
            opacity: 0.4;
            transform: translateX(-60px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes slam {
          0% {
            transform: scale(0.4);
            opacity: 0;
          }
          60% {
            transform: scale(1.1);
            opacity: 1;
          }
          80% {
            transform: scale(0.97);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(20px);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes flip {
          from {
            opacity: 0;
            transform: perspective(800px) rotateY(-90deg) scale(0.8);
          }
          to {
            opacity: 1;
            transform: perspective(800px) rotateY(0) scale(1);
          }
        }
        @keyframes sound-bar-1 {
          from {
            height: 4px;
          }
          to {
            height: 10px;
          }
        }
        @keyframes sound-bar-2 {
          from {
            height: 10px;
          }
          to {
            height: 4px;
          }
        }
        @keyframes sound-bar-3 {
          from {
            height: 6px;
          }
          to {
            height: 12px;
          }
        }
      `}</style>
    </div>
  );
}

function SlideContent({
  slide,
  slamActive,
  countedScore,
  inviteCode,
  tripId,
  tier,
  tripName,
  chaosScore,
  whatsappCaption,
}: {
  slide: Slide;
  slamActive: boolean;
  countedScore: number;
  inviteCode: string;
  tripId: string;
  tier: string;
  tripName: string;
  chaosScore: number;
  whatsappCaption?: string | null;
}) {
  switch (slide.type) {
    case 'title':
      return (
        <div
          className="text-center space-y-6 max-w-sm"
          style={{ animation: 'rise 0.6s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-vibe">
            The Official Archive
          </p>
          <h1 className="text-5xl font-cinematic font-medium text-white leading-[0.9]">
            {(slide.lore as any).trip_title}
          </h1>
          <p className="text-xl font-cinematic italic text-chill-accent leading-relaxed">
            &ldquo;{slide.lore.tagline}&rdquo;
          </p>
        </div>
      );

    case 'cooked':
      return (
        <div className="text-center space-y-6 max-w-sm">
          <p
            className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-vibe"
            style={{ animation: 'fade-in 0.4s ease both' }}
          >
            How Cooked?
          </p>
          <div
            aria-live="polite"
            aria-label={slamActive ? `Chaos score: ${countedScore} out of 100` : undefined}
            style={{
              fontSize: 'clamp(100px, 20vw, 180px)',
              fontFamily: 'var(--font-ui)',
              fontWeight: 900,
              lineHeight: 1,
              color: '#FF4D4D',
              letterSpacing: '-0.04em',
              animation: slamActive ? 'slam 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both' : 'none',
            }}
          >
            {slamActive ? countedScore : ''}
          </div>
          <p
            className="text-2xl font-vibe font-bold uppercase tracking-tight text-white/90"
            style={{
              animation: slamActive ? 'rise 0.5s ease 0.8s both' : 'none',
              opacity: slamActive ? undefined : 0,
            }}
          >
            {slide.lore.cooked_verdict}
          </p>
        </div>
      );

    case 'recap':
      return (
        <div
          className="space-y-6 max-w-sm"
          style={{ animation: 'rise 0.6s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-vibe">
            The Season Recap
          </p>
          <p className="text-xl font-data font-light text-white/75 leading-relaxed">
            {slide.lore.season_recap?.full_narrative}
          </p>
        </div>
      );

    case 'era': {
      const era = slide.lore.trip_eras![slide.idx];
      return (
        <div
          className="space-y-6 max-w-sm"
          style={{ animation: 'rise 0.6s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-vibe">
            Era {slide.idx + 1}
          </p>
          <h2 className="text-4xl font-cinematic font-medium text-white leading-tight">
            {era.era_name}
          </h2>
          {era.timeframe && (
            <p className="text-[10px] uppercase tracking-wider text-chill-accent font-vibe">
              {era.timeframe}
            </p>
          )}
          <p className="text-lg font-data font-light text-white/65 leading-relaxed">
            {era.description}
          </p>
        </div>
      );
    }

    case 'character': {
      const m = slide.member;
      const name = m.display_name || '?';
      return (
        <div
          className="text-center space-y-6 max-w-sm"
          style={{ animation: 'flip 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s both' }}
        >
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
            style={{
              background: 'linear-gradient(135deg, rgba(255,77,77,0.18), rgba(255,77,77,0.04))',
              border: '1.5px solid rgba(255,77,77,0.35)',
              boxShadow: '0 0 28px rgba(255,77,77,0.15)',
            }}
          >
            <span className="text-3xl font-vibe font-bold text-cooked-accent">
              {name[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40 font-vibe">{name}</p>
            <h2 className="text-3xl font-cinematic font-medium text-white leading-tight">
              {m.role_title}
            </h2>
          </div>
          <p className="text-base font-data font-light text-white/55 leading-relaxed">
            {m.role_description}
          </p>
          {m.role_chaos_rating != null && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cooked-accent/10 border border-cooked-accent/18">
              <span className="text-cooked-accent font-vibe font-bold text-sm">
                Chaos {m.role_chaos_rating}/10
              </span>
            </div>
          )}
        </div>
      );
    }

    case 'superlative': {
      const s = slide.sup;
      return (
        <div
          className="space-y-6 max-w-sm"
          style={{ animation: 'rise 0.6s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-vibe">
            Award #{slide.idx + 1}
          </p>
          <div className="space-y-2">
            <p className="text-lg font-cinematic italic text-white/45">most likely to</p>
            <h2 className="text-3xl font-cinematic font-medium text-white leading-tight">
              {s.question}
            </h2>
          </div>
          <div
            className="w-12 h-0.5 bg-chill-accent rounded-full"
            style={{ boxShadow: '0 0 8px rgba(45,158,139,0.4)' }}
          />
          <p
            className="text-5xl font-vibe font-bold text-cooked-accent"
            style={{
              textShadow: '0 0 20px rgba(255,77,77,0.25)',
              animation: 'slam 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both',
            }}
          >
            {s.winner_name}
          </p>
        </div>
      );
    }

    case 'verdict':
      return (
        <div className="text-center space-y-10 max-w-sm">
          <div
            className="w-12 h-0.5 bg-chill-accent mx-auto rounded-full"
            style={{ animation: 'fade-in 0.4s ease both' }}
          />
          <p
            className="text-2xl font-cinematic italic text-white/80 leading-relaxed"
            style={{ animation: 'rise 0.7s cubic-bezier(0.16,1,0.3,1) 0.15s both', opacity: 0 }}
          >
            &ldquo;{(slide.lore as any).closing_line || slide.lore.cooked_verdict}&rdquo;
          </p>
          <div
            className="w-12 h-0.5 bg-chill-accent mx-auto rounded-full"
            style={{ animation: 'fade-in 0.4s ease 0.4s both', opacity: 0 }}
          />
          <div
            style={{ animation: 'fade-in 0.5s ease 0.7s both', opacity: 0 }}
            onClick={e => e.stopPropagation()}
          >
            <ReactionBar tripId={tripId} slideType="verdict" isPublic />
          </div>
        </div>
      );

    case 'join': {
      const storyUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/t/${slide.inviteCode}/story`
          : `/t/${slide.inviteCode}/story`;
      return (
        <div
          className="text-center space-y-5 max-w-sm w-full"
          style={{ animation: 'rise 0.6s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-vibe">
            You've seen the lore
          </p>
          <h2 className="text-4xl font-cinematic font-medium text-white">
            Want to join the archive?
          </h2>
          <p className="text-sm font-data font-light text-white/50">
            Add your photos and get your own character card.
          </p>
          <a
            href={`/trips/join?code=${slide.inviteCode}`}
            onClick={e => e.stopPropagation()}
            className="block w-full py-5 bg-white text-[#060604] rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl text-center"
          >
            Join This Season →
          </a>
          {/* VIRAL-01: WhatsApp one-tap share + copy link */}
          <div className="space-y-2 w-full">
            <WhatsAppShareButton
              tripName={tripName}
              storyUrl={storyUrl}
              chaosScore={chaosScore}
              whatsappCaption={whatsappCaption}
            />
            <CopyLinkButton storyUrl={storyUrl} />
          </div>
          <a
            href={`/t/${slide.inviteCode}`}
            onClick={e => e.stopPropagation()}
            className="block text-[10px] uppercase tracking-widest font-vibe text-white/40 hover:text-white/35 transition-colors"
          >
            ← Back to overview
          </a>
          {/* MOAT: Similar trips discovery */}
          <ErrorBoundary name="similar-trips">
            <SimilarTripsSection tripId={tripId} />
          </ErrorBoundary>
          {tier === 'free' && (
            <a
              href={`/trips/${tripId}/upgrade`}
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[8px] font-vibe uppercase tracking-widest transition-colors hover:border-white/25"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cooked-accent/60 inline-block" />
              Free archive · Upgrade to seal it →
            </a>
          )}
        </div>
      );
    }
  }
}
