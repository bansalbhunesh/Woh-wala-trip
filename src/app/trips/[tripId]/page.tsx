'use client';

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
  ArchiveFooter
} from '@/components/cinematic/ArchiveRoom';
import { Act } from '@/components/cinematic/Orchestrator';

export default function TripRoomPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  const { data: tripData, isLoading } = trpc.trips.getFull.useQuery({ tripId });

  if (isLoading) return <LoadingState />;
  if (!tripData) return <NotFoundState />;

  const trip = (tripData as any).trip;
  const cast = (tripData as any).cast || [];
  
  // Find Villain and MVP for the reveals
  const villain = cast.find((m: any) => m.role?.toLowerCase().includes('villain')) || cast[1];
  const mvp = cast.find((m: any) => m.role?.toLowerCase().includes('mvp')) || cast[0];

  return (
    <div className="min-h-screen bg-black text-[#F5F0E8] selection:bg-cooked-accent selection:text-white font-cinematic">
      <FilmGrain />
      
      <ArchiveNavbar trip={trip} />

      <main className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Main Content Column */}
          <div className="lg:col-span-9 space-y-12">
            
            {/* HERO SECTION */}
            <ArchiveHero trip={trip} />

            {/* EMOTIONAL REVEALS SECTION */}
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black italic tracking-tighter">Emotional Reveals – Moments You Can't Unsee</h2>
                <div className="h-px flex-1 bg-white/5 ml-8" />
              </div>

              <div className="space-y-8">
                <ArchiveReveal 
                  category="Trip MVP"
                  name={mvp?.full_name || "Zara"}
                  description="Carried the group, the snacks, and three contradictory philosophies. Caused 2 lore triangles, inadvertently."
                  revealTitle="REVEAL: secretly paid for the bus truck at 2AM"
                  revealBody="She had the emergency contact, the backup plan, and the bus number. Said nothing until 3AM to 'test our character'."
                  image="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1964"
                  color="#00C896"
                />

                <ArchiveReveal 
                  category="Trip Villain"
                  name={villain?.full_name || "Kev"}
                  description="Blamed for the tent collapse, the missing GPS, and the heartbreak. Has an alibi that is suspiciously theatrical."
                  revealTitle="PLOT TWIST: accidentally fixed the generator but preferred the candles."
                  revealBody="He convinced the group the bus operator was 'emotionally unavailable'. The operator was actually just eating a sandwich."
                  image="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974"
                  color="#FF3B2F"
                />

                <ArchiveReveal 
                  category="Top Inside Joke"
                  name="The Mixtape"
                  description="A poorly curated playlist that caused a fight and then a truce played over marshmallows."
                  revealTitle="EASTER EGG: track 7 plays during every reconciliation scene"
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
          <aside className="lg:col-span-3 space-y-12">
            <ProducerWidget cast={cast} />
            <ChaosChartWidget />
            <SchematicWidget />
          </aside>
        </div>
      </main>

      <ArchiveFooter />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
       <div className="animate-pulse text-[10px] uppercase tracking-[0.5em] text-white/20 font-vibe">Syncing Archive...</div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
       <div className="text-[10px] uppercase tracking-[0.5em] text-white/20 font-vibe">Archive Expunged</div>
    </div>
  );
}
