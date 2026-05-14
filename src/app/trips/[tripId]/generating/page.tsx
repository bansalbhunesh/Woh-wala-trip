'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

export default function GeneratingPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    "Scanning 247 photos...",
    "Identifying chaos sources...",
    "Cross-referencing incident reports...",
    "Assigning archetypes...",
    "Writing the verdict...",
    "Sealing the lore..."
  ];

  const { data: tripData } = trpc.trips.getFull.useQuery({ tripId });
  const trip = (tripData as any)?.trip;

  useEffect(() => {
    // Simulate progress while background worker runs
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 2;
        if (next >= 100) {
          clearInterval(interval);
          return 100;
        }
        return next;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Map progress to steps
    const stepIndex = Math.min(Math.floor((progress / 100) * steps.length), steps.length - 1);
    setCurrentStep(stepIndex);
    
    if (progress >= 100 && trip?.lore_status === 'ready') {
       setTimeout(() => router.push(`/trips/${tripId}/story`), 1500);
    }
  }, [progress, trip?.lore_status, router, tripId, steps.length]);

  return (
    <div className="min-h-screen bg-[#060604] flex flex-col items-center justify-center p-6 text-center overflow-hidden selection:bg-cooked-accent/30">
      <div className="font-cinematic italic text-xs text-white/10 tracking-[0.1em] mb-20 animate-fade-in">
        woh wala trip
      </div>

      {/* Progress Ring */}
      <div className="relative w-32 h-32 mb-16 animate-fade-in">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle 
            className="text-white/[0.05] stroke-current" 
            strokeWidth="2" 
            fill="transparent" 
            r="45" 
            cx="50" 
            cy="50" 
          />
          <circle 
            className="text-cooked-accent stroke-current transition-all duration-300 ease-out" 
            strokeWidth="2" 
            strokeDasharray={283}
            strokeDashoffset={283 - (283 * progress) / 100}
            strokeLinecap="round"
            fill="transparent" 
            r="45" 
            cx="50" 
            cy="50" 
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-vibe font-black text-2xl text-cooked-accent">
          {Math.floor(progress)}%
        </div>
      </div>

      {/* Steps List */}
      <div className="w-full max-w-sm space-y-3 animate-fade-in delay-200">
        {steps.map((step, i) => {
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          return (
            <div 
              key={i} 
              className={`flex items-center gap-4 px-5 py-3 rounded-2xl transition-all duration-700 ${
                isActive ? 'bg-cooked-accent/10 text-white/70' : isDone ? 'text-white/30' : 'text-white/10'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full transition-all ${
                isActive ? 'bg-cooked-accent animate-pulse' : isDone ? 'bg-chill-accent' : 'bg-white/10'
              }`} />
              <span className="text-[10px] font-vibe font-bold uppercase tracking-widest text-left">{step}</span>
            </div>
          );
        })}
      </div>

      {/* Final Reveal */}
      <div className={`mt-16 transition-all duration-1000 ${progress >= 90 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h2 className="font-cinematic font-black text-3xl mb-2 text-[#F5F0E8] tracking-tighter uppercase">{trip?.title || 'Trip Lore'}</h2>
        <p className="text-[10px] text-white/30 font-vibe uppercase tracking-widest">
          Your chaos has been documented. <span className="text-cooked-accent font-black">Historically Cooked.</span>
        </p>
      </div>
    </div>
  );
}
