'use client';
import { useState, useRef, useEffect } from 'react';
import type { LoreJson } from '@/lib/types';
import { MoodSoundtrack } from '@/components/experience/MoodSoundtrack';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { analytics } from '@/lib/analytics';

type Slide =
  | { type: 'title'; lore: LoreJson }
  | { type: 'cooked'; lore: LoreJson }
  | { type: 'recap'; lore: LoreJson }
  | { type: 'era'; lore: LoreJson; idx: number }
  | { type: 'character'; member: DemoMember }
  | { type: 'superlative'; sup: any; idx: number; lore: LoreJson }
  | { type: 'verdict'; lore: LoreJson }
  | { type: 'cta' };

export interface DemoMember {
  user_id: string;
  role_title: string;
  role_description: string;
  role_chaos_rating: number;
  display_name: string;
}

function buildSlides(lore: LoreJson, members: DemoMember[]): Slide[] {
  const slides: Slide[] = [];
  slides.push({ type: 'title', lore });
  slides.push({ type: 'cooked', lore });
  if (lore.season_recap?.full_narrative) slides.push({ type: 'recap', lore });
  (lore.trip_eras || []).slice(0, 3).forEach((_, i) => slides.push({ type: 'era', lore, idx: i }));
  members.filter(m => m.role_title).forEach(m => slides.push({ type: 'character', member: m }));
  (lore.superlatives || [])
    .slice(0, 3)
    .forEach((sup, i) => slides.push({ type: 'superlative', sup, idx: i, lore }));
  slides.push({ type: 'verdict', lore });
  slides.push({ type: 'cta' });
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

interface Props {
  lore: LoreJson;
  members: DemoMember[];
}

export default function DemoStoryClient({ lore, members }: Props) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<'forward' | 'backward'>('forward');
  const [animKey, setAnimKey] = useState(0);
  const [slamActive, setSlamActive] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const touchStart = useRef<number | null>(null);

  const slides = buildSlides(lore, members);
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
      const t = setTimeout(() => setSlamActive(true), 200);
      return () => clearTimeout(t);
    }
    setSlamActive(false);
  }, [current.type, animKey]);

  const cookedScore = lore.cooked_level ?? 60;
  const cookedLevel = lore.cooked_level ?? 84;
  const countedScore = useCountUp(cookedLevel, slamActive && current.type === 'cooked', 1100);

  const anim = dir === 'forward' ? 'demo-slide-right' : 'demo-slide-left';

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
      {/* Tap zones */}
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

      {/* Mood Soundtrack */}
      <div className="absolute top-6 right-28 z-50">
        <ErrorBoundary name="demo-mood-soundtrack">
          <MoodSoundtrack
            cookedScore={cookedScore}
            active={soundOn}
            onToggle={() => setSoundOn(p => !p)}
            activeSlideType={current?.type}
            slideIndex={idx}
          />
        </ErrorBoundary>
      </div>

      {/* DEMO badge */}
      <div
        className="absolute top-6 left-4 z-50 flex items-center gap-1.5 px-3 py-1 rounded-full text-[7.5px] font-mono uppercase tracking-wider"
        style={{
          background: 'rgba(255,165,0,0.12)',
          border: '1px solid rgba(255,165,0,0.3)',
          color: 'rgba(255,165,0,0.85)',
        }}
      >
        ◎ DEMO ARCHIVE
      </div>

      {/* Back to landing */}
      <a
        href="/"
        className="absolute top-6 right-4 z-50 text-white/40 text-xs font-vibe uppercase tracking-wider hover:text-white/65 transition-colors"
        onClick={e => e.stopPropagation()}
      >
        ← Home
      </a>

      {/* Slide */}
      <div
        key={animKey}
        className="absolute inset-0 flex items-center justify-center px-8 py-20"
        style={{ animation: `${anim} 0.35s cubic-bezier(0.16,1,0.3,1) both` }}
      >
        <ErrorBoundary name="demo-story-player">
          <SlideContent slide={current} slamActive={slamActive} countedScore={countedScore} />
        </ErrorBoundary>
      </div>

      {idx === 0 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-between px-8 pointer-events-none">
          <span className="text-white/55 text-xs font-vibe uppercase tracking-wider">← tap</span>
          <span className="text-white/55 text-xs font-vibe uppercase tracking-wider">tap →</span>
        </div>
      )}

      <style jsx>{`
        @keyframes demo-slide-right {
          from {
            opacity: 0.4;
            transform: translateX(60px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes demo-slide-left {
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
      `}</style>
    </div>
  );
}

function SlideContent({
  slide,
  slamActive,
  countedScore,
}: {
  slide: Slide;
  slamActive: boolean;
  countedScore: number;
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
            {slide.lore.trip_title}
          </h1>
          <p className="text-xl font-cinematic italic text-chill-accent leading-relaxed">
            &ldquo;{slide.lore.tagline}&rdquo;
          </p>
          {slide.lore.opening_line && (
            <p className="text-sm text-white/35 font-data font-light">{slide.lore.opening_line}</p>
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
          <div
            aria-live="polite"
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
          {slide.lore.cooked_explanation && (
            <p
              className="text-base font-data font-light text-white/45 italic leading-relaxed"
              style={{
                animation: slamActive ? 'fade-in 0.6s ease 1.2s both' : 'none',
                opacity: slamActive ? undefined : 0,
              }}
            >
              {slide.lore.cooked_explanation}
            </p>
          )}
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
        <div className="text-center space-y-10 max-w-sm">
          <div
            className="w-12 h-0.5 bg-chill-accent mx-auto rounded-full"
            style={{ animation: 'fade-in 0.4s ease both' }}
          />
          <p
            className="text-2xl font-cinematic italic text-white/80 leading-relaxed"
            style={{ animation: 'rise 0.7s cubic-bezier(0.16,1,0.3,1) 0.15s both', opacity: 0 }}
          >
            &ldquo;{slide.lore.closing_line || slide.lore.cooked_verdict}&rdquo;
          </p>
          <div
            className="w-12 h-0.5 bg-chill-accent mx-auto rounded-full"
            style={{ animation: 'fade-in 0.4s ease 0.4s both', opacity: 0 }}
          />
        </div>
      );

    case 'cta':
      return (
        <div
          className="text-center space-y-5 max-w-sm w-full"
          style={{ animation: 'rise 0.6s cubic-bezier(0.16,1,0.3,1) both' }}
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-vibe">
            That was Manali 2024
          </p>
          <h2 className="text-4xl font-cinematic font-medium text-white leading-tight">
            Generate lore for YOUR trip →
          </h2>
          <p className="text-sm font-data font-light text-white/50 leading-relaxed">
            Upload your photos. Get your chaos score, character cards, and a cinematic documentary
            of your group's collective unraveling.
          </p>
          <a
            href="/login"
            className="block w-full py-5 bg-white text-[#060604] rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl text-center"
          >
            Start your friendship archive →
          </a>
          <a
            href="/"
            className="block text-[10px] uppercase tracking-widest font-vibe text-white/40 hover:text-white/55 transition-colors"
          >
            ← Back to landing
          </a>
          <p
            className="font-mono text-[7.5px] uppercase tracking-[0.4em]"
            style={{ color: 'rgba(245,240,232,0.18)' }}
          >
            This is a pre-generated demo · No auth required to view
          </p>
        </div>
      );
  }
}
