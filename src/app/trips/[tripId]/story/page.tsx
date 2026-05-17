'use client';

import { use, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import type { LoreJson } from '@/lib/types';
import ReactionBar from '@/components/experience/ReactionBar';
import { SlidePhotoBackground } from '@/components/experience/SlidePhotoBackground';
import { MoodSoundtrack } from '@/components/experience/MoodSoundtrack';
import { ScratchReveal } from '@/components/experience/ScratchReveal';
import { formatName } from '@/lib/utils';

type Slide =
  | { type: 'title'; lore: LoreJson }
  | { type: 'cooked'; lore: LoreJson }
  | { type: 'villain'; lore: LoreJson; members: any[] }
  | { type: 'recap'; lore: LoreJson }
  | { type: 'era'; lore: LoreJson; idx: number }
  | { type: 'character'; member: any }
  | { type: 'superlative'; sup: any; idx: number; lore: LoreJson }
  | { type: 'verdict'; lore: LoreJson }
  | { type: 'share'; tripId: string };

function buildSlides(tripId: string, lore: LoreJson, members: any[]): Slide[] {
  const slides: Slide[] = [];
  slides.push({ type: 'title', lore });
  slides.push({ type: 'cooked', lore });
  // Villain reveal — only if villain data exists
  const hasVillain =
    lore.trip_lore_awards?.trip_villain || members.some((m: any) => m.role_chaos_rating >= 8);
  if (hasVillain) slides.push({ type: 'villain', lore, members });
  if (lore.season_recap?.full_narrative) slides.push({ type: 'recap', lore });
  (lore.trip_eras || []).slice(0, 3).forEach((_, i) => slides.push({ type: 'era', lore, idx: i }));
  members.filter(m => m.role_title).forEach(m => slides.push({ type: 'character', member: m }));
  (lore.superlatives || [])
    .slice(0, 3)
    .forEach((sup, i) => slides.push({ type: 'superlative', sup, idx: i, lore }));
  slides.push({ type: 'verdict', lore });
  slides.push({ type: 'share', tripId });
  return slides;
}

// Count-up hook for the cooked score slam
function useCountUp(target: number, active: boolean, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    let raf: number;
    const tick = (now: number) => {
      const elapsed = Math.min((now - start) / duration, 1);
      setValue(Math.round(easeOut(elapsed) * target));
      if (elapsed < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
}

export default function StoryPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<'forward' | 'backward'>('forward');
  const [animKey, setAnimKey] = useState(0);
  const [slamActive, setSlamActive] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [villainRevealed, setVillainRevealed] = useState(false);
  const touchStart = useRef<number | null>(null);

  const { data: tripData } = trpc.trips.getFull.useQuery({ tripId });
  const lore = (tripData as any)?.trip?.lore_json as LoreJson | null;
  const loreStatus = (tripData as any)?.trip?.lore_status as string | undefined;
  const members = (tripData as any)?.members || [];

  const { data: photoList } = trpc.photos.list.useQuery({ tripId });
  const photos = photoList?.photos ?? [];

  // Redirect if data loaded but lore not ready
  useEffect(() => {
    if (tripData && loreStatus && loreStatus !== 'ready') router.push(`/trips/${tripId}`);
  }, [tripData, loreStatus, tripId, router]);

  if (!lore) {
    return (
      <div className="min-h-screen bg-[#060604] flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 rounded-full border border-cooked-accent/30 border-t-cooked-accent animate-spin" />
        <p className="text-white/30 font-vibe text-xs uppercase tracking-widest">
          Opening archive...
        </p>
        <button
          onClick={() => router.push(`/trips/${tripId}`)}
          className="mt-6 text-[9px] uppercase tracking-widest text-white/40 font-vibe hover:text-white/30 transition-colors"
        >
          ← Return to archive
        </button>
      </div>
    );
  }

  const cookedScore = (lore as any)?.cooked_level ?? 60;
  const slides = buildSlides(tripId, lore, members);
  const current = slides[idx];
  const isFirst = idx === 0;

  const isVillainSlide = current?.type === 'villain';
  const tapBlocked = isVillainSlide && !villainRevealed;

  const advance = () => {
    if (tapBlocked || idx >= slides.length - 1) return;
    if ('vibrate' in navigator) navigator.vibrate(8);
    setDir('forward');
    setAnimKey(k => k + 1);
    setIdx(i => i + 1);
    setSlamActive(false);
  };
  const retreat = () => {
    if (tapBlocked || idx <= 0) return;
    if ('vibrate' in navigator) navigator.vibrate(4);
    setDir('backward');
    setAnimKey(k => k + 1);
    setIdx(i => i - 1);
    setSlamActive(false);
  };

  // Trigger slam on cooked slide
  useEffect(() => {
    if (current.type === 'cooked') {
      const t = setTimeout(() => setSlamActive(true), 200);
      return () => clearTimeout(t);
    }
    setSlamActive(false);
  }, [current.type, animKey]);

  const handleTap = (e: React.MouseEvent) => {
    if (e.clientX < window.innerWidth * 0.33) retreat();
    else advance();
  };
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 80) dx < 0 ? advance() : retreat();
    touchStart.current = null;
  };

  const slideAnim = dir === 'forward' ? 'story-slide-in-right' : 'story-slide-in-left';

  return (
    <div
      className="min-h-screen bg-[#060604] overflow-hidden relative select-none"
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 px-4 pt-3">
        {slides.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 bg-white/12 rounded-full overflow-hidden"
            style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
          >
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

      {/* Mood Soundtrack */}
      <div className="absolute top-6 right-16 z-50">
        <MoodSoundtrack
          cookedScore={cookedScore}
          active={soundOn}
          onToggle={() => setSoundOn(p => !p)}
        />
      </div>

      {/* Exit */}
      <button
        onClick={e => {
          e.stopPropagation();
          router.push(`/trips/${tripId}`);
        }}
        className="absolute top-6 right-4 z-50 text-white/40 text-xs font-vibe uppercase tracking-wider hover:text-white/65 transition-colors duration-200"
      >
        Exit
      </button>

      {/* Directional slide — key remounts on every nav, direction drives the enter animation */}
      <div
        key={animKey}
        className="min-h-screen flex flex-col items-center justify-center px-8 py-20 relative"
        style={{ animation: `${slideAnim} 0.35s cubic-bezier(0.16,1,0.3,1) both` }}
      >
        <SlidePhotoBackground photos={photos} slideIdx={idx} visible={current.type !== 'title'} />
        <SlideRenderer
          slide={current}
          router={router}
          tripId={tripId}
          onShare={() => router.push(`/trips/${tripId}/share`)}
          slamActive={slamActive}
          onVillainReveal={() => setVillainRevealed(true)}
          villainRevealed={villainRevealed}
        />
      </div>

      {isFirst && !tapBlocked && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-between px-8 pointer-events-none">
          <span className="text-white/55 text-xs font-vibe uppercase tracking-wider">← tap</span>
          <span className="text-white/55 text-xs font-vibe uppercase tracking-wider">tap →</span>
        </div>
      )}

      {tapBlocked && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center px-8 pointer-events-none">
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/30 animate-pulse">
            scratch to continue
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes story-slide-in-right {
          from {
            opacity: 0.4;
            transform: translateX(60px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes story-slide-in-left {
          from {
            opacity: 0.4;
            transform: translateX(-60px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes score-slam {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          60% {
            transform: scale(1.12);
            opacity: 1;
          }
          80% {
            transform: scale(0.97);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes slam-glow {
          0% {
            text-shadow: 0 0 0px rgba(255, 77, 77, 0);
          }
          50% {
            text-shadow:
              0 0 60px rgba(255, 77, 77, 0.6),
              0 0 100px rgba(255, 77, 77, 0.3);
          }
          100% {
            text-shadow: 0 0 20px rgba(255, 77, 77, 0.2);
          }
        }
        @keyframes card-flip {
          from {
            transform: perspective(800px) rotateY(-90deg) scale(0.8);
            opacity: 0;
          }
          to {
            transform: perspective(800px) rotateY(0deg) scale(1);
            opacity: 1;
          }
        }
        @keyframes verdict-rise {
          from {
            opacity: 0;
            transform: translateY(30px);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
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

function SlideRenderer({
  slide,
  router,
  tripId,
  onShare,
  slamActive,
  onVillainReveal,
  villainRevealed,
}: {
  slide: Slide;
  router: any;
  tripId: string;
  onShare: () => void;
  slamActive: boolean;
  onVillainReveal?: () => void;
  villainRevealed?: boolean;
}) {
  const cookedLevel =
    slide.type === 'cooked'
      ? (slide.lore.cooked_level ?? (slide.lore as any).chaos_score ?? 84)
      : 0;
  const countedScore = useCountUp(cookedLevel, slamActive, 1100);

  switch (slide.type) {
    case 'title':
      return (
        <div
          className="text-center space-y-8 max-w-sm"
          style={{ animation: 'verdict-rise 0.6s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-vibe">
            The Official Archive
          </p>
          <h1 className="text-5xl font-cinematic font-medium text-white leading-[0.9]">
            {(slide.lore as any).trip_title || (slide.lore as any).name}
          </h1>
          <p className="text-xl font-cinematic italic text-chill-accent leading-relaxed">
            &ldquo;{slide.lore.tagline || 'Your friendship, documented.'}&rdquo;
          </p>
          {(slide.lore as any).opening_line && (
            <p
              className="text-sm text-white/35 font-data font-light"
              style={{ animationDelay: '0.3s' }}
            >
              {(slide.lore as any).opening_line}
            </p>
          )}
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
          {/* The SLAM — big number counts up then slams */}
          <div
            style={{
              fontSize: 'clamp(100px, 22vw, 200px)',
              fontFamily: 'var(--font-ui)',
              fontWeight: 900,
              lineHeight: 1,
              color: '#FF4D4D',
              letterSpacing: '-0.04em',
              animation: slamActive
                ? 'score-slam 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both, slam-glow 1.2s ease 0.7s both'
                : 'none',
            }}
          >
            {slamActive ? countedScore : ''}
          </div>
          <p
            className="text-2xl font-vibe font-bold uppercase tracking-tight text-white/90"
            style={{
              animation: slamActive ? 'verdict-rise 0.5s ease 0.8s both' : 'none',
              opacity: slamActive ? undefined : 0,
            }}
          >
            {slide.lore.cooked_verdict || 'Historically Cooked'}
          </p>
          {(slide.lore as any).cooked_explanation && (
            <p
              className="text-base font-data font-light text-white/45 italic leading-relaxed"
              style={{
                animation: slamActive ? 'fade-in 0.6s ease 1.2s both' : 'none',
                opacity: slamActive ? undefined : 0,
              }}
            >
              {(slide.lore as any).cooked_explanation}
            </p>
          )}
        </div>
      );

    case 'villain': {
      // Find the highest-chaos member or use the lore-named villain
      const villainName = slide.lore.trip_lore_awards?.trip_villain;
      const villainMember = villainName
        ? slide.members.find(
            (m: any) =>
              m.display_name?.toLowerCase().includes(villainName.toLowerCase()) ||
              m.role_title?.toLowerCase().includes('villain') ||
              m.role_title?.toLowerCase().includes('chaos')
          )
        : slide.members
            .slice()
            .sort((a: any, b: any) => (b.role_chaos_rating ?? 0) - (a.role_chaos_rating ?? 0))[0];

      const rawDisplayName =
        villainName || villainMember?.display_name || villainMember?.role_title || 'Unknown';
      const displayName = formatName(rawDisplayName);
      const chaosRating = villainMember?.role_chaos_rating ?? null;
      // Approximate: chaos_rating/10 * cooked_level gives an emotional "percent"
      const chaosPercent =
        chaosRating != null
          ? Math.min(99, Math.round((chaosRating / 10) * (slide.lore.cooked_level ?? 75)))
          : null;
      const roleTitle = villainMember?.role_title || 'Primary Chaos Source';
      const initial = displayName[0]?.toUpperCase() ?? '?';

      return (
        <div
          className="text-center space-y-6 max-w-sm w-full"
          style={{ animation: 'verdict-rise 0.5s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          <div className="space-y-1">
            <p
              className="text-[9px] uppercase tracking-[0.5em] font-mono"
              style={{ color: 'rgba(255,77,77,0.5)' }}
            >
              ● CORRUPTED MEMORY RECOVERED
            </p>
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 font-mono">
              Identity Classified — Level 5 Restricted
            </p>
          </div>

          <ScratchReveal
            width={280}
            height={168}
            brushSize={36}
            threshold={0.52}
            label="CLASSIFIED"
            onReveal={onVillainReveal}
          >
            {/* Revealed content — dark cinematic, NOT casino */}
            <div
              className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-3 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255,77,77,0.14), rgba(255,77,77,0.04))',
                border: villainRevealed
                  ? '1px solid rgba(255,77,77,0.45)'
                  : '1px solid rgba(255,77,77,0.12)',
                boxShadow: villainRevealed
                  ? '0 0 60px rgba(255,77,77,0.2), inset 0 0 40px rgba(255,77,77,0.06)'
                  : 'none',
                transition: 'box-shadow 0.8s ease, border-color 0.8s ease',
              }}
            >
              {/* Ghosted initial behind */}
              <span
                className="absolute font-cinematic font-black leading-none select-none pointer-events-none"
                style={{ fontSize: 140, color: 'rgba(255,77,77,0.07)', top: '-10%', right: '-5%' }}
              >
                {initial}
              </span>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(255,77,77,0.12)',
                  border: '1.5px solid rgba(255,77,77,0.3)',
                  boxShadow: '0 0 20px rgba(255,77,77,0.15)',
                }}
              >
                <span className="font-cinematic font-black text-2xl text-[#FF4D4D]">{initial}</span>
              </div>
              <div className="text-center space-y-1 z-10 px-4">
                <p className="font-cinematic font-black text-2xl text-white/95 uppercase tracking-tight leading-none">
                  {displayName}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">
                  {roleTitle}
                </p>
              </div>
              {chaosPercent != null && (
                <div
                  className="px-3 py-1 rounded-full z-10"
                  style={{
                    background: 'rgba(255,77,77,0.12)',
                    border: '1px solid rgba(255,77,77,0.25)',
                  }}
                >
                  <span
                    className="font-mono text-[10px] font-bold uppercase tracking-[0.25em]"
                    style={{ color: 'rgba(255,77,77,0.85)' }}
                  >
                    {chaosPercent}% of the chaos originated here
                  </span>
                </div>
              )}
            </div>
          </ScratchReveal>

          {villainRevealed && (
            <div
              className="space-y-1"
              style={{ animation: 'verdict-rise 0.5s cubic-bezier(0.16,1,0.3,1) both' }}
            >
              <p
                className="font-mono text-[9px] uppercase tracking-[0.45em]"
                style={{ color: 'rgba(255,77,77,0.6)' }}
              >
                ● ORIGIN CONFIRMED
              </p>
              <p className="font-cinematic italic text-sm text-white/30">
                {slide.lore.friendship_dynamics?.chaos_source
                  ? `"${slide.lore.friendship_dynamics.chaos_source}"`
                  : 'The archive has spoken.'}
              </p>
            </div>
          )}

          {!villainRevealed && (
            <p className="font-mono text-[8px] uppercase tracking-[0.5em] text-white/20">
              Who caused the collapse?
            </p>
          )}
        </div>
      );
    }

    case 'recap':
      return (
        <div
          className="space-y-8 max-w-sm"
          style={{ animation: 'verdict-rise 0.6s cubic-bezier(0.16,1,0.3,1) both' }}
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
          className="space-y-8 max-w-sm"
          style={{ animation: 'verdict-rise 0.6s cubic-bezier(0.16,1,0.3,1) both' }}
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
          {era.defining_moment && (
            <p className="text-base font-cinematic italic text-white/35 border-l-2 border-chill-accent/25 pl-4">
              &ldquo;{era.defining_moment}&rdquo;
            </p>
          )}
        </div>
      );
    }

    case 'character': {
      const m = slide.member;
      const name = m.display_name || m.role_archetype_tag || '?';
      return (
        // Card flip reveal on character slides
        <div
          className="text-center space-y-8 max-w-sm"
          style={{ animation: 'card-flip 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s both' }}
        >
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
            style={{
              background: 'linear-gradient(135deg, rgba(255,77,77,0.18), rgba(255,77,77,0.04))',
              border: '1.5px solid rgba(255,77,77,0.35)',
              boxShadow: '0 0 28px rgba(255,77,77,0.15), inset 0 0 20px rgba(255,77,77,0.07)',
            }}
          >
            <span className="text-3xl font-vibe font-bold text-cooked-accent">
              {name[0].toUpperCase()}
            </span>
          </div>
          <div className="space-y-2">
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
          {m.role_most_likely_said && (
            <p className="text-sm font-cinematic italic text-white/35">
              &ldquo;{m.role_most_likely_said}&rdquo;
            </p>
          )}
        </div>
      );
    }

    case 'superlative': {
      const s = slide.sup;
      return (
        <div
          className="space-y-8 max-w-sm"
          style={{ animation: 'verdict-rise 0.6s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-vibe">
            Award #{slide.idx + 1}
          </p>
          <div className="space-y-3">
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
              animation: 'score-slam 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both',
            }}
          >
            {s.winner_name}
          </p>
          {s.reason && (
            <p
              className="text-sm font-data font-light text-white/45 italic leading-relaxed"
              style={{ animation: 'fade-in 0.5s ease 0.5s both', opacity: 0 }}
            >
              {s.reason}
            </p>
          )}
        </div>
      );
    }

    case 'verdict':
      return (
        <div className="text-center space-y-8 max-w-sm">
          <div
            className="w-12 h-0.5 bg-chill-accent mx-auto rounded-full"
            style={{
              boxShadow: '0 0 8px rgba(45,158,139,0.4)',
              animation: 'fade-in 0.4s ease both',
            }}
          />
          <p
            className="text-2xl font-cinematic italic text-white/80 leading-relaxed"
            style={{
              animation: 'verdict-rise 0.7s cubic-bezier(0.16,1,0.3,1) 0.15s both',
              opacity: 0,
            }}
          >
            &ldquo;{(slide.lore as any).closing_line || slide.lore.cooked_verdict}&rdquo;
          </p>
          <div
            className="w-12 h-0.5 bg-chill-accent mx-auto rounded-full"
            style={{
              boxShadow: '0 0 8px rgba(45,158,139,0.4)',
              animation: 'fade-in 0.4s ease 0.4s both',
              opacity: 0,
            }}
          />
          <div style={{ animation: 'fade-in 0.4s ease 0.8s both', opacity: 0 }}>
            <ReactionBar tripId={tripId} slideType="verdict" />
          </div>
        </div>
      );

    case 'share':
      return (
        <div
          className="text-center space-y-10 max-w-sm"
          style={{ animation: 'verdict-rise 0.6s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-vibe">
            Your Lore is Ready
          </p>
          <h2 className="text-4xl font-cinematic font-medium text-white">Export your identity</h2>
          <p className="text-sm font-data font-light text-white/35">
            Pick your card and expose your friend group.
          </p>
          <button
            onClick={e => {
              e.stopPropagation();
              onShare();
            }}
            className="w-full py-5 bg-white text-[#060604] rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl"
          >
            Pick Your Card
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              router.push(`/trips/${slide.tripId}`);
            }}
            className="text-[10px] uppercase tracking-widest font-vibe text-white/40 hover:text-white/35 transition-colors"
          >
            View full archive →
          </button>
        </div>
      );
  }
}
