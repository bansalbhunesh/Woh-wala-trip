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

  const { data: trip } = trpc.trips.getFull.useQuery({ tripId });

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
    
    if (progress >= 100 && (trip as any)?.trip?.lore_status === 'ready') {
       setTimeout(() => router.push(`/trips/${tripId}/story`), 1500);
    }
  }, [progress, (trip as any)?.trip?.lore_status, router, tripId, steps.length]);

  return (
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
