'use client';

import { use, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import type { LoreJson } from '@/lib/types';

type Slide =
  | { type: 'title'; lore: LoreJson }
  | { type: 'cooked'; lore: LoreJson }
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
  if (lore.season_recap?.full_narrative) slides.push({ type: 'recap', lore });
  (lore.trip_eras || []).slice(0, 3).forEach((_, i) => slides.push({ type: 'era', lore, idx: i }));
  members.filter(m => m.role_title).forEach(m => slides.push({ type: 'character', member: m }));
  (lore.superlatives || []).slice(0, 3).forEach((sup, i) => slides.push({ type: 'superlative', sup, idx: i, lore }));
  slides.push({ type: 'verdict', lore });
  slides.push({ type: 'share', tripId });
  return slides;
}

export default function StoryPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const touchStart = useRef<number | null>(null);

  const { data: tripData } = trpc.trips.getFull.useQuery({ tripId });
  const lore = (tripData as any)?.trip?.lore_json as LoreJson | null;
  const members = (tripData as any)?.members || [];

  if (!lore) {
    return (
      <div className="min-h-screen bg-[#060604] flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 rounded-full border border-cooked-accent/30 border-t-cooked-accent animate-spin" />
        <p className="text-white/30 font-vibe text-xs uppercase tracking-widest">Opening archive...</p>
        <button onClick={() => router.push(`/trips/${tripId}`)}
                className="mt-6 text-[9px] uppercase tracking-widest text-white/15 font-vibe hover:text-white/30 transition-colors">
          ← Return to archive
        </button>
      </div>
    );
  }

  const slides = buildSlides(tripId, lore, members);
  const current = slides[idx];
  const isFirst = idx === 0;

  const advance = () => setIdx(i => Math.min(i + 1, slides.length - 1));
  const retreat = () => setIdx(i => Math.max(i - 1, 0));

  const handleTap = (e: React.MouseEvent) => {
    const x = e.clientX;
    const w = window.innerWidth;
    if (x < w * 0.33) retreat();
    else advance();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 50) dx < 0 ? advance() : retreat();
    touchStart.current = null;
  };

  return (
    <div
      className="min-h-screen bg-[#060604] overflow-hidden relative select-none"
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bars — thicker, with active glow */}
      <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 px-4 pt-3">
        {slides.map((_, i) => (
          <div key={i} className="flex-1 h-1 bg-white/12 rounded-full overflow-hidden"
               style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}>
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

      {/* Exit — more visible */}
      <button
        onClick={e => { e.stopPropagation(); router.push(`/trips/${tripId}`); }}
        className="absolute top-6 right-4 z-50 text-white/40 text-xs font-vibe uppercase tracking-wider hover:text-white/65 active:text-white/80 transition-colors duration-200"
      >
        Exit
      </button>

      {/* Slide content — key forces animation remount on every slide change */}
      <div key={idx} className="min-h-screen flex flex-col items-center justify-center px-8 py-20">
        <SlideRenderer
          slide={current}
          router={router}
          tripId={tripId}
          onShare={() => router.push(`/trips/${tripId}/share`)}
        />
      </div>

      {isFirst && (
        <div className="absolute bottom-10 left-0 right-0 flex justify-between px-8 pointer-events-none">
          <span className="text-white/12 text-xs font-vibe uppercase tracking-wider">← tap</span>
          <span className="text-white/12 text-xs font-vibe uppercase tracking-wider">tap →</span>
        </div>
      )}
    </div>
  );
}

function SlideRenderer({ slide, router, tripId, onShare }: {
  slide: Slide; router: any; tripId: string; onShare: () => void;
}) {
  switch (slide.type) {
    case 'title':
      return (
        <div className="text-center space-y-8 max-w-sm animate-fade-in">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/25 font-vibe">The Official Archive</p>
          <h1 className="text-5xl font-cinematic font-medium text-white leading-[0.9]">
            {slide.lore.trip_title || (slide.lore as any).name}
          </h1>
          <p className="text-xl font-cinematic italic text-chill-accent leading-relaxed">
            &ldquo;{slide.lore.tagline || 'Your friendship, documented.'}&rdquo;
          </p>
          {(slide.lore as any).opening_line && (
            <p className="text-sm text-white/35 font-data font-light">{(slide.lore as any).opening_line}</p>
          )}
        </div>
      );

    case 'cooked':
      return (
        <div className="text-center space-y-8 max-w-sm animate-fade-in">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/25 font-vibe">How Cooked?</p>
          <div className="space-y-2">
            <div className="text-[20vw] font-vibe font-bold tracking-tighter text-cooked-accent leading-none">
              {slide.lore.cooked_level ?? (slide.lore as any).chaos_score ?? 84}
            </div>
            <p className="text-2xl font-vibe font-bold uppercase tracking-tight text-white/90">
              {slide.lore.cooked_verdict || 'Historically Cooked'}
            </p>
          </div>
          {(slide.lore as any).cooked_explanation && (
            <p className="text-base font-data font-light text-white/45 italic leading-relaxed">
              {(slide.lore as any).cooked_explanation}
            </p>
          )}
        </div>
      );

    case 'recap':
      return (
        <div className="space-y-8 max-w-sm animate-fade-in">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/25 font-vibe">The Season Recap</p>
          <p className="text-xl font-data font-light text-white/75 leading-relaxed">
            {slide.lore.season_recap?.full_narrative}
          </p>
        </div>
      );

    case 'era': {
      const era = slide.lore.trip_eras![slide.idx];
      return (
        <div className="space-y-8 max-w-sm animate-fade-in">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/25 font-vibe">Era {slide.idx + 1}</p>
          <h2 className="text-4xl font-cinematic font-medium text-white leading-tight">{era.era_name}</h2>
          {era.timeframe && <p className="text-[10px] uppercase tracking-wider text-chill-accent font-vibe">{era.timeframe}</p>}
          <p className="text-lg font-data font-light text-white/65 leading-relaxed">{era.description}</p>
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
        <div className="text-center space-y-8 max-w-sm animate-fade-in">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto animate-fade-in"
               style={{
                 background: 'linear-gradient(135deg, rgba(255,77,77,0.15), rgba(255,77,77,0.04))',
                 border: '1.5px solid rgba(255,77,77,0.3)',
                 boxShadow: '0 0 24px rgba(255,77,77,0.12), inset 0 0 20px rgba(255,77,77,0.06)',
               }}>
            <span className="text-3xl font-vibe font-bold text-cooked-accent">{name[0].toUpperCase()}</span>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/25 font-vibe">{name}</p>
            <h2 className="text-3xl font-cinematic font-medium text-white leading-tight">
              {m.role_title}
            </h2>
          </div>
          <p className="text-base font-data font-light text-white/55 leading-relaxed">
            {m.role_description}
          </p>
          {(m.role_chaos_rating != null) && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cooked-accent/10 border border-cooked-accent/15">
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
        <div className="space-y-8 max-w-sm animate-fade-in">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/25 font-vibe">Award #{slide.idx + 1}</p>
          <div className="space-y-3">
            <p className="text-lg font-cinematic italic text-white/45">most likely to</p>
            <h2 className="text-3xl font-cinematic font-medium text-white leading-tight">{s.question}</h2>
          </div>
          <div className="w-12 h-0.5 bg-chill-accent" />
          <p className="text-5xl font-vibe font-bold text-cooked-accent"
             style={{ textShadow: '0 0 20px rgba(255,77,77,0.25)' }}>
            {s.winner_name}
          </p>
          {s.reason && (
            <p className="text-sm font-data font-light text-white/45 italic leading-relaxed">{s.reason}</p>
          )}
        </div>
      );
    }

    case 'verdict':
      return (
        <div className="text-center space-y-12 max-w-sm animate-fade-in">
          <div className="w-12 h-0.5 bg-chill-accent mx-auto" />
          <p className="text-2xl font-cinematic italic text-white/75 leading-relaxed">
            &ldquo;{(slide.lore as any).closing_line || slide.lore.cooked_verdict}&rdquo;
          </p>
          <div className="w-12 h-0.5 bg-chill-accent mx-auto" />
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/15 font-vibe">The Final Verdict</p>
        </div>
      );

    case 'share':
      return (
        <div className="text-center space-y-10 max-w-sm animate-fade-in">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/25 font-vibe">Your Lore is Ready</p>
          <h2 className="text-4xl font-cinematic font-medium text-white">Export your identity</h2>
          <p className="text-sm font-data font-light text-white/35">Pick your card and expose your friend group.</p>
          <button
            onClick={e => { e.stopPropagation(); onShare(); }}
            className="w-full py-5 bg-white text-[#060604] rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-transform shadow-2xl"
          >
            Pick Your Card
          </button>
          <button
            onClick={e => { e.stopPropagation(); router.push(`/trips/${slide.tripId}`); }}
            className="text-[10px] uppercase tracking-widest font-vibe text-white/15 hover:text-white/35 transition-colors"
          >
            View full archive →
          </button>
        </div>
      );
  }
}
