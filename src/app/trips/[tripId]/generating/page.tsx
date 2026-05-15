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
    'Scanning your photo dump...',
    'Identifying chaos sources...',
    'Cross-referencing incident reports...',
    'Assigning archetypes...',
    'Writing the verdict...',
    'Sealing the lore...',
  ];

  // Poll every 4s for real lore_status updates
  const { data: tripData, refetch } = trpc.trips.getFull.useQuery({ tripId }, {
    refetchInterval: 4000,
  });
  const trip = (tripData as any)?.trip;
  const loreStatus = trip?.lore_status;

  // Redirect as soon as the worker signals ready — regardless of fake progress
  useEffect(() => {
    if (loreStatus === 'ready') {
      router.push(`/trips/${tripId}/story`);
    } else if (loreStatus === 'failed') {
      router.push(`/trips/${tripId}`);
    }
  }, [loreStatus, router, tripId]);

  // Fake progress bar — runs independently so the screen always feels alive
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        // Slow down near 95% so it doesn't hit 100 before the worker finishes
        const increment = prev < 70 ? Math.random() * 2.5 : prev < 90 ? Math.random() * 0.8 : Math.random() * 0.2;
        return Math.min(prev + increment, 95);
      });
    }, 150);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const stepIndex = Math.min(Math.floor((progress / 95) * steps.length), steps.length - 1);
    setCurrentStep(stepIndex);
  }, [progress]);

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
      <div className="w-full max-w-sm space-y-3 animate-fade-in">
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
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${
                isActive ? 'bg-cooked-accent animate-pulse' : isDone ? 'bg-chill-accent' : 'bg-white/10'
              }`} />
              <span className="text-[10px] font-vibe font-bold uppercase tracking-widest text-left">{step}</span>
            </div>
          );
        })}
      </div>

      {/* Final Reveal — appears near the end */}
      <div className={`mt-16 transition-all duration-1000 ${progress >= 80 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h2 className="font-cinematic font-black text-3xl mb-2 text-[#F5F0E8] tracking-tighter uppercase">
          {trip?.name || 'Trip Lore'}
        </h2>
        <p className="text-[10px] text-white/30 font-vibe uppercase tracking-widest">
          Your chaos has been documented.{' '}
          <span className="text-cooked-accent font-black">Historically Cooked.</span>
        </p>
      </div>

      <p className="mt-12 text-[9px] uppercase tracking-widest text-white/10 font-vibe">
        Usually 2–5 minutes
      </p>
    </div>
  );
}
