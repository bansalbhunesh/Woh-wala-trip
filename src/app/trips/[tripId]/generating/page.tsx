'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

const PHASES = [
  { label: 'Reviewing the evidence', sub: 'Reading your photo dump...', duration: 4000 },
  { label: 'Identifying the chaos source', sub: 'Someone is responsible for 37% of this.', duration: 5000 },
  { label: 'Calculating delusion index', sub: 'How cooked were you, really?', duration: 4000 },
  { label: 'Assigning character roles', sub: 'The Golden Retriever has been identified.', duration: 5000 },
  { label: 'Writing the season recap', sub: 'An AI historian is taking notes.', duration: 6000 },
  { label: 'Generating the receipt', sub: 'Itemizing every bad decision.', duration: 4000 },
  { label: 'Finalising the lore', sub: 'Almost ready to expose everything.', duration: 5000 },
];

export default function GeneratingPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [dots, setDots] = useState('');

  const { data: tripData } = trpc.trips.getFull.useQuery(
    { tripId },
    { refetchInterval: 4000 }
  );

  const loreStatus = (tripData as any)?.trip?.lore_status;

  useEffect(() => {
    if (loreStatus === 'ready') router.push(`/trips/${tripId}/story`);
    else if (loreStatus === 'failed') router.push(`/trips/${tripId}`);
  }, [loreStatus, router, tripId]);

  useEffect(() => {
    if (phaseIdx >= PHASES.length - 1) return;
    const t = setTimeout(() => setPhaseIdx((i) => i + 1), PHASES[phaseIdx].duration);
    return () => clearTimeout(t);
  }, [phaseIdx]);

  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 500);
    return () => clearInterval(t);
  }, []);

  const phase = PHASES[phaseIdx];
  const progress = Math.round(((phaseIdx + 1) / PHASES.length) * 100);

  return (
    <div className="min-h-screen bg-cooked-bg text-white flex flex-col items-center justify-center px-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] rounded-full opacity-20 blur-[200px] bg-cooked-accent animate-pulse" />
        <div className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] rounded-full opacity-10 blur-[200px] bg-chill-accent animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 text-center space-y-16 max-w-lg w-full">
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-vibe">
            Season {new Date().getFullYear()} Archive
          </p>
          <h1 className="text-5xl font-cinematic font-medium text-white/90 leading-none">
            Writing the lore
          </h1>
        </div>

        <div className="space-y-4 min-h-[80px]">
          <p className="text-2xl font-vibe font-medium text-white/90 transition-all duration-700">
            {phase.label}{dots}
          </p>
          <p className="text-sm font-data font-light text-white/40 italic transition-all duration-700">
            {phase.sub}
          </p>
        </div>

        <div className="space-y-3">
          <div className="w-full h-px bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-cooked-accent rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-white/20 font-vibe">
            <span>Processing</span>
            <span>{progress}%</span>
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          {PHASES.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-500 ${
                i < phaseIdx ? 'w-2 h-2 bg-chill-accent'
                  : i === phaseIdx ? 'w-6 h-2 bg-cooked-accent animate-pulse-soft'
                  : 'w-2 h-2 bg-white/10'
              }`}
            />
          ))}
        </div>

        <p className="text-[10px] uppercase tracking-[0.2em] text-white/15 font-vibe">
          Usually takes 2–5 minutes
        </p>
      </div>
    </div>
  );
}
