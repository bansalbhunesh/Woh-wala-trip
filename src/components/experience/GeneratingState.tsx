'use client';

import { useState, useEffect } from 'react';

interface Props {
  tripId: string;
}

export function GeneratingState({ tripId }: Props) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [dots, setDots] = useState('');

  const PHASES = [
    { label: 'Reviewing the evidence', sub: 'Reading your photo dump...' },
    { label: 'Identifying the chaos source', sub: 'Someone is responsible for 37% of this.' },
    { label: 'Calculating delusion index', sub: 'How cooked were you, really?' },
    { label: 'Assigning character roles', sub: 'The Golden Retriever has been identified.' },
    { label: 'Writing the season recap', sub: 'The AI historian is taking notes.' },
    { label: 'Finalising the lore', sub: 'Almost ready to expose everything.' },
  ];

  useEffect(() => {
    if (phaseIdx >= PHASES.length - 1) return;
    const t = setTimeout(() => setPhaseIdx(i => i + 1), 5000);
    return () => clearTimeout(t);
  }, [phaseIdx]);

  useEffect(() => {
    const t = setInterval(() => setDots(d => (d.length >= 3 ? '' : d + '.')), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-16 py-20">
      <div className="text-center space-y-8 max-w-md">
        <p className="text-[9px] uppercase tracking-[0.5em] text-white/20 font-vibe font-black">
          Season {new Date().getFullYear()} Archive
        </p>
        <h2 className="text-5xl font-cinematic font-black text-[#F5F0E8] uppercase leading-tight">
          Writing the lore
        </h2>
        <div className="space-y-2 min-h-[60px]">
          <p className="text-xl font-vibe font-medium text-white/80 transition-all duration-700">
            {PHASES[phaseIdx].label}
            {dots}
          </p>
          <p className="text-sm font-data font-light text-white/30 italic">
            {PHASES[phaseIdx].sub}
          </p>
        </div>
      </div>

      {/* Phase dots */}
      <div className="flex gap-2">
        {PHASES.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-500 ${
              i < phaseIdx
                ? 'w-2 h-2 bg-chill-accent'
                : i === phaseIdx
                  ? 'w-8 h-2 bg-cooked-accent animate-pulse-soft'
                  : 'w-2 h-2 bg-white/10'
            }`}
          />
        ))}
      </div>

      <p className="text-[9px] uppercase tracking-widest text-white/35 font-vibe">
        Usually 2–5 minutes
      </p>
    </div>
  );
}
