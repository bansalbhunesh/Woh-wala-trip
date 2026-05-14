'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { FilmGrain, AtmosphericBlob, CinematicText } from '@/components/ui/atoms';
import { CinematicGalleryCard, ArchiveFooter } from '@/components/cinematic/ArchiveRoom';
import { Plus, Search, Filter } from 'lucide-react';

export default function TripsPage() {
  const { data: trips, isLoading } = trpc.trips.listMine.useQuery();

  if (isLoading) return <LoadingState />;

  return (
    <div className="min-h-screen bg-black text-[#F5F0E8] font-cinematic selection:bg-cooked-accent selection:text-white pb-32 overflow-hidden relative">
      <FilmGrain />
      <AtmosphericBlob color="#FF3B2F" className="top-[-10%] right-[-10%] w-[500px] h-[500px] opacity-20" />
      <AtmosphericBlob color="#D49E2D" className="bottom-[10%] left-[-10%] w-[400px] h-[400px] opacity-10" />

      {/* Archive Room Header */}
      <header className="max-w-[1600px] mx-auto px-6 pt-24 pb-16 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <CinematicText variant="eyebrow" className="text-white/40">The Dossier</CinematicText>
          <h1 className="text-7xl md:text-[10vw] font-black tracking-tighter leading-[0.8] font-cinematic">
            The<br />
            <span className="italic text-cooked-accent">Seasons</span>
          </h1>
        </div>

        <div className="flex flex-col gap-6 md:text-right">
          <p className="text-lg text-white/40 italic max-w-xs md:ml-auto">
            "A collection of questionable decisions, missed buses, and historically cooked hotels."
          </p>
          <div className="flex gap-3 md:justify-end">
             <button className="p-4 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <Search size={20} />
             </button>
             <button className="p-4 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <Filter size={20} />
             </button>
             <Link 
                href="/trips/new"
                className="flex items-center gap-3 px-8 py-4 bg-cooked-accent text-white rounded-full text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,59,47,0.2)]"
              >
                <Plus size={16} /> New Season
              </Link>
          </div>
        </div>
      </header>

      {/* Archive Grid */}
      <section className="max-w-[1600px] mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {trips?.map((trip) => (
            <CinematicGalleryCard key={trip.id} trip={trip} />
          ))}
          
          {trips?.length === 0 && (
            <div className="col-span-full py-40 text-center rounded-[3rem] border border-dashed border-white/5 bg-white/[0.02]">
               <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Plus size={32} className="text-white/20" />
               </div>
               <p className="text-white/20 text-sm italic font-cinematic">Your archive is currently empty. No lore detected.</p>
               <Link href="/trips/new" className="inline-block mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-cooked-accent hover:underline">Start First Season</Link>
            </div>
          )}
        </div>
      </section>

      <ArchiveFooter />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-12 gap-6">
       <div className="w-12 h-12 border-2 border-cooked-accent/20 border-t-cooked-accent rounded-full animate-spin" />
       <div className="animate-pulse text-[10px] uppercase tracking-[0.5em] text-white/20 font-vibe">Opening Archives...</div>
    </div>
  );
}
