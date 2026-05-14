'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';

export default function TripsPage() {
  const { data: trips, isLoading } = trpc.trips.list.useQuery();

  if (isLoading) return <LoadingState />;

  return (
    <div className="min-h-screen bg-black text-[#F5F0E8] font-vibe selection:bg-cooked-bg selection:text-white pb-32">
      {/* Archive Header */}
      <header className="px-6 pt-12 pb-8">
        <p className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-vibe mb-2">Your Archive</p>
        <h1 className="font-cinematic font-black text-6xl tracking-tighter leading-none">The<br/>Seasons</h1>
      </header>

      {/* Trip List */}
      <div className="px-6 space-y-4">
        {trips?.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
        {trips?.length === 0 && (
          <div className="py-20 text-center border border-dashed border-white/10 rounded-[32px]">
             <p className="text-white/20 text-sm italic font-cinematic">Your archive is currently empty.</p>
          </div>
        )}
      </div>

      {/* FABs */}
      <div className="fixed bottom-8 right-6 flex flex-col gap-3 z-50">
        <Link 
          href="/trips/new"
          className="w-14 h-14 bg-[#F5F0E8] text-black rounded-full flex items-center justify-center text-2xl shadow-3xl hover:scale-110 active:scale-95 transition-all"
        >
          +
        </Link>
      </div>
    </div>
  );
}

function TripCard({ trip }: { trip: any }) {
  const isCooked = trip.chaos_score >= 80;
  const isUnstable = trip.chaos_score >= 50 && trip.chaos_score < 80;
  
  const bgGradient = isCooked 
    ? 'bg-gradient-to-br from-[#14181C] to-[#1A0505] border-cooked-accent/20' 
    : isUnstable 
    ? 'bg-gradient-to-br from-[#1A1508] to-[#1E1200] border-amber-500/20'
    : 'bg-gradient-to-br from-[#0A130F] to-[#0E1A14] border-chill-accent/15';

  const badgeColor = isCooked ? 'bg-cooked-accent/15 text-cooked-accent border-cooked-accent/30' : isUnstable ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' : 'bg-chill-accent/15 text-chill-accent border-chill-accent/30';
  const scoreColor = isCooked ? 'text-cooked-accent' : isUnstable ? 'text-amber-500' : 'text-chill-accent';

  return (
    <Link 
      href={`/trips/${trip.id}`}
      className={`block relative overflow-hidden rounded-[2.5rem] border ${bgGradient} transition-all hover:scale-[1.01] active:scale-[0.99] group`}
    >
      {/* Ghost Number */}
      <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 font-vibe font-black text-[35vw] md:text-[20vw] text-white opacity-[0.04] leading-none select-none pointer-events-none">
        {trip.chaos_score}
      </div>

      <div className="relative z-10 p-8 space-y-6">
        <div>
          <div className="text-[8px] uppercase tracking-[0.35em] text-white/20 mb-3">
             Season {new Date(trip.created_at).getMonth() + 1} · {trip.location || 'Unknown'}
          </div>
          <h3 className="font-cinematic font-black text-3xl md:text-4xl text-[#F5F0E8] tracking-tighter leading-tight">
            {trip.title}
          </h3>
        </div>

        <div className={`inline-block px-4 py-1 rounded-full border text-[8px] font-vibe font-bold uppercase tracking-[0.2em] ${badgeColor}`}>
           {isCooked ? 'Historically Cooked' : isUnstable ? 'Peak Delusion' : 'Mildly Simmering'}
        </div>

        <p className="text-[11px] text-white/35 italic font-cinematic leading-relaxed max-w-xs">
          "{trip.tagline || 'Analyzing trip dynamics...'}"
        </p>

        <div className="flex justify-between items-end pt-4 border-t border-white/[0.06]">
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-vibe font-black leading-none ${scoreColor}`}>{trip.chaos_score}</span>
            <span className="text-[8px] uppercase tracking-[0.2em] text-white/20">Chaos</span>
          </div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-white/25 group-hover:text-white transition-colors">
            Open Archive →
          </div>
        </div>
      </div>
    </Link>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-12">
       <div className="animate-pulse text-[10px] uppercase tracking-[0.5em] text-white/20 font-vibe">Opening Archives...</div>
    </div>
  );
}
