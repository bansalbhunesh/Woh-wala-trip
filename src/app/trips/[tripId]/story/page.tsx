'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import Link from 'next/link';

export default function StoryPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;
  const [index, setIndex] = useState(0);

  const { data: tripData } = trpc.trips.getFull.useQuery({ tripId });
  const trip = (tripData as any)?.trip;
  // getFull returns `members`, not `cast`
  const members = (tripData as any)?.members || [];

  const lore = trip?.lore_json;

  const slides = [
    {
      type: 'title',
      eyebrow: 'The Official Archive',
      title: trip?.name || 'Loading...',
      italic: lore?.tagline || 'Analyzing your trip data...',
      body: `Season ${new Date().getFullYear()} · ${members.length} Cast Members · ${trip?.total_photos || 0} Photos`,
    },
    {
      type: 'chaos',
      eyebrow: 'How Cooked?',
      score: lore?.cooked_level ?? trip?.chaos_score ?? 0,
      verdict: lore?.cooked_verdict || 'Processing...',
      body: 'The algorithm has analyzed every incident. There is no appeal process.',
    },
    {
      type: 'recap',
      eyebrow: 'Season Recap',
      title: 'Act I → Act II → Act III',
      body: lore?.season_recap?.full_narrative || 'Generating narrative...',
    },
    ...members.slice(0, 3).map((m: any) => ({
      type: 'character',
      eyebrow: 'Character Role',
      name: m.display_name || 'Cast Member',
      avatar: (m.display_name || '??').split(' ').map((n: string) => n[0]).join('').slice(0, 2),
      role: m.role_archetype_tag || m.role_title || '??',
      tag: m.role_title || '??',
      body: m.role_description || 'The algorithm is still processing this persona.',
      score: m.role_chaos_rating ?? 0,
    })),
    {
      type: 'final',
      eyebrow: 'The Lore is Sealed',
      title: 'Share the Chaos',
      body: lore?.closing_line || 'Screenshot this. Tag your group. Let them defend themselves.',
    },
  ];

  const handleTap = (e: React.MouseEvent) => {
    const x = e.clientX;
    const w = window.innerWidth;
    if (x < w * 0.33) {
      setIndex((i) => Math.max(i - 1, 0));
    } else {
      if (index === slides.length - 1) {
        router.push(`/trips/${tripId}`);
      } else {
        setIndex((i) => i + 1);
      }
    }
  };

  const slide = slides[index];

  if (!trip) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-pulse text-[10px] uppercase tracking-[0.5em] text-white/20 font-vibe">Opening Archive...</div>
    </div>
  );

  return (
    <div className="h-screen bg-black text-[#F5F0E8] overflow-hidden select-none touch-none flex flex-col relative">
      {/* Progress Bars */}
      <div className="flex gap-1.5 p-4 pt-6 z-50">
        {slides.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full bg-[#F5F0E8] transition-all duration-300 ${i <= index ? 'w-full' : 'w-0'}`}
              style={{ opacity: i === index ? 1 : i < index ? 0.3 : 0 }}
            />
          </div>
        ))}
      </div>

      {/* Exit Button */}
      <button
        onClick={() => router.push(`/trips/${tripId}`)}
        className="absolute top-4 right-4 z-50 text-[10px] font-vibe font-bold uppercase tracking-[0.2em] text-white/20 hover:text-white"
      >
        Exit
      </button>

      {/* Tap Zones Overlay */}
      <div className="absolute inset-0 z-40 cursor-pointer" onClick={handleTap} />

      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative">
        <div key={index} className="animate-fade-in flex flex-col items-center max-w-sm">
          {slide.type === 'title' && (
            <>
              <div className="text-[9px] font-vibe font-bold uppercase tracking-[0.4em] text-white/20 mb-8">{slide.eyebrow}</div>
              <h1 className="text-6xl font-cinematic font-black tracking-tighter leading-[0.85] text-[#F5F0E8] mb-6 uppercase">
                {(slide.title as string).split(' ').map((w: string, i: number) =>
                  i === 1
                    ? <span key={i} className="italic text-chill-accent"><br />{w}</span>
                    : <span key={i}>{w} </span>
                )}
              </h1>
              <div className="text-xl font-cinematic italic text-chill-accent mb-6 leading-tight">{slide.italic as string}</div>
              <div className="text-[13px] font-vibe text-white/35 leading-relaxed">{slide.body as string}</div>
            </>
          )}

          {slide.type === 'chaos' && (
            <>
              <div className="text-[9px] font-vibe font-bold uppercase tracking-[0.4em] text-white/20 mb-8">{slide.eyebrow}</div>
              <div className="text-[28vw] font-vibe font-black tracking-tighter text-cooked-accent leading-none mb-4">
                {slide.score as number}
              </div>
              <div className="text-xl font-vibe font-black uppercase tracking-[0.05em] text-white/80 mb-4">
                {(slide.score as number) >= 76
                  ? 'Historically Cooked'
                  : (slide.score as number) >= 51
                  ? 'Peak Delusion'
                  : (slide.score as number) >= 26
                  ? 'Emotionally Unstable'
                  : 'Mildly Simmering'}
              </div>
              <div className="text-[13px] font-vibe text-white/35 leading-relaxed max-w-[280px]">{slide.body as string}</div>
            </>
          )}

          {slide.type === 'recap' && (
            <>
              <div className="text-[9px] font-vibe font-bold uppercase tracking-[0.4em] text-white/20 mb-8">{slide.eyebrow}</div>
              <div className="text-2xl font-cinematic font-black text-[#F5F0E8] mb-6 tracking-tight uppercase">{slide.title as string}</div>
              <div className="text-[15px] font-cinematic italic text-white/50 leading-relaxed text-center px-4">
                &ldquo;{slide.body as string}&rdquo;
              </div>
            </>
          )}

          {slide.type === 'character' && (
            <>
              <div className="text-[9px] font-vibe font-bold uppercase tracking-[0.4em] text-white/20 mb-8">{slide.eyebrow}</div>
              <div className="w-20 h-20 rounded-full bg-cooked-accent/15 border border-cooked-accent/30 flex items-center justify-center text-3xl font-vibe font-black text-cooked-accent mb-6">
                {slide.avatar as string}
              </div>
              <h2 className="text-5xl font-cinematic font-black tracking-tighter text-[#F5F0E8] mb-2 uppercase">{slide.name as string}</h2>
              <div className="text-lg font-cinematic italic text-chill-accent mb-6">&ldquo;{slide.role as string}&rdquo;</div>
              <div className="px-4 py-1.5 rounded-full bg-cooked-accent/10 border border-cooked-accent/30 text-[9px] font-vibe font-bold uppercase tracking-[0.2em] text-cooked-accent mb-6">
                ⚡ {slide.tag as string} · {slide.score as number}/10
              </div>
              <div className="text-[13px] font-vibe text-white/35 leading-relaxed">{slide.body as string}</div>
            </>
          )}

          {slide.type === 'final' && (
            <>
              <div className="text-[9px] font-vibe font-bold uppercase tracking-[0.4em] text-white/20 mb-8">{slide.eyebrow}</div>
              <h2 className="text-5xl font-cinematic font-black tracking-tighter text-chill-accent mb-6 uppercase">
                Share<br />the Chaos
              </h2>
              <div className="text-[13px] font-vibe text-white/35 leading-relaxed mb-10">{slide.body as string}</div>
              <div className="flex gap-3 z-50 pointer-events-auto">
                <Link
                  href={`/trips/${tripId}/share`}
                  className="px-8 py-4 bg-[#F5F0E8] text-black rounded-full text-[10px] font-vibe font-black uppercase tracking-[0.15em] hover:scale-[1.05] transition-all"
                >
                  Export Cards
                </Link>
                <button
                  onClick={() => router.push(`/trips/${tripId}`)}
                  className="px-8 py-4 border border-white/15 bg-transparent text-white/50 rounded-full text-[10px] font-vibe font-bold uppercase tracking-[0.15em] hover:bg-white/5"
                >
                  Back to Archive
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Nav Hints */}
      <div className="flex justify-between p-8 pt-0 z-30 pointer-events-none opacity-20">
        <span className="text-[9px] font-vibe uppercase tracking-[0.2em]">← tap</span>
        <span className="text-[9px] font-vibe uppercase tracking-[0.2em]">tap →</span>
      </div>
    </div>
  );
}
