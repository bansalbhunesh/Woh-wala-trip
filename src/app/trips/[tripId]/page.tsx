'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { FilmGrain } from '@/components/ui/atoms';
import { 
  ArchiveNavbar, 
  ArchiveHero, 
  ArchiveReveal, 
  ProducerWidget, 
  ChaosChartWidget, 
  SchematicWidget,
  ArchiveFooter,
  LoreWrapped
} from '@/components/cinematic/ArchiveRoom';
import { AnimatePresence } from 'framer-motion';

export default function TripRoomPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const [showWrapped, setShowWrapped] = useState(true);

  const { data: tripData, isLoading } = trpc.trips.getFull.useQuery({ tripId });

  // Auto-hide Wrapped if user has already seen it (using localStorage or just session)
  useEffect(() => {
    const hasSeen = localStorage.getItem(`wrapped_${tripId}`);
    if (hasSeen) {
      setShowWrapped(false);
    }
  }, [tripId]);

  const handleFinishWrapped = () => {
    setShowWrapped(false);
    localStorage.setItem(`wrapped_${tripId}`, 'true');
  };

  if (isLoading) return <LoadingState />;
  if (!tripData) return <NotFoundState />;

  const trip = (tripData as any).trip;
  const cast = (tripData as any).cast || [];
  
  // Find Villain and MVP for the reveals
  const villain = cast.find((m: any) => m.role?.toLowerCase().includes('villain')) || cast[1];
  const mvp = cast.find((m: any) => m.role?.toLowerCase().includes('mvp')) || cast[0];

  return (
    <div className="min-h-screen bg-black text-[#F5F0E8] selection:bg-cooked-accent selection:text-white font-cinematic overflow-x-hidden">
      <AnimatePresence>
        {showWrapped && (
          <LoreWrapped trip={trip} onFinish={handleFinishWrapped} />
        )}
      </AnimatePresence>

      <FilmGrain />
      
      <ArchiveNavbar trip={trip} />

      <main className="max-w-[1600px] mx-auto px-6 py-12 space-y-12">
        {/* DASHBOARD HERO SECTION */}
        <ArchiveHero trip={trip} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-12">
            {/* EMOTIONAL REVEALS SECTION */}
            <section className="space-y-12">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                   <h2 className="text-3xl font-black italic tracking-tighter text-[#F5F0E8] uppercase">Emotional Reveals</h2>
                   <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-black">Moments You Can't Unsee</p>
                </div>
                <div className="h-px flex-1 bg-white/5 ml-12" />
              </div>

              <div className="space-y-8">
                <ArchiveReveal 
                  category="Trip MVP"
                  name={mvp?.full_name || "Zara"}
                  description="Carried the group, the snacks, and three contradictory philosophies. Caused 2 lore triangles, inadvertently."
                  revealTitle="REVEAL: secretly paid for the bus truck at 2AM"
                  revealBody="She had the emergency contact, the backup plan, and the bus number. Said nothing until 3AM to 'test our character'."
                  image="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1964"
                  color="#1FA882"
                />

                <ArchiveReveal 
                  category="Trip Villain"
                  name={villain?.full_name || "Kev"}
                  description="Blamed for the tent collapse, the missing GPS, and the heartbreak. Has an alibi that is suspiciously theatrical."
                  revealTitle="PLOT TWIST: fixed the generator but preferred candles."
                  revealBody="He convinced the group the bus operator was 'emotionally unavailable'. The operator was actually just eating a sandwich."
                  image="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974"
                  color="#FF3B2F"
                />

                <ArchiveReveal 
                  category="Top Inside Joke"
                  name="The Mixtape"
                  description="A poorly curated playlist that caused a fight and then a truce played over marshmallows."
                  revealTitle="EASTER EGG: track 7 plays during reconciliation"
                  revealBody="Nobody knew the lyrics, but everyone sang the 'ah-ah-ah' part with religious fervor at 4AM."
                  image="https://images.unsplash.com/photo-1544620347-c4fd403d5957?q=80&w=2069"
                  color="#D49E2D"
                  actions={[
                    { label: "Show Clip" },
                    { label: "Save Snippet" }
                  ]}
                />
              </div>
            </section>
          </div>

          {/* Sidebar Column */}
          <aside className="lg:col-span-4 space-y-12">
            <ProducerWidget cast={cast} />
            <ChaosChartWidget />
            <SchematicWidget />
            
            {/* Additional Interaction Card */}
            <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 space-y-6 text-center">
               <span className="text-[10px] uppercase tracking-[0.4em] text-white/20 font-black">Archive Defense</span>
               <h3 className="text-xl font-black text-[#F5F0E8] uppercase leading-tight italic">Drag stickers into the ring to join lore battle.</h3>
               <div className="flex flex-col gap-3">
                 <button className="py-4 bg-cooked-accent text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">Run Battle</button>
                 <button className="py-4 bg-white/5 text-white/40 rounded-full text-[10px] font-black uppercase tracking-widest">Preview Score</button>
               </div>
               <p className="text-[9px] text-white/10 italic">Pre-tip journaling increases your group's viral score.</p>
            </div>
          </aside>
        </div>
      </main>

      <ArchiveFooter />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
       <div className="w-12 h-12 border-4 border-cooked-accent/20 border-t-cooked-accent rounded-full animate-spin" />
       <div className="animate-pulse text-[10px] uppercase tracking-[0.5em] text-white/20 font-black">Syncing Archive...</div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
       <div className="text-[10px] uppercase tracking-[0.5em] text-white/20 font-black">Archive Expunged</div>
    </div>
  );
}
