'use client';
import { use } from 'react';
import { trpc } from '@/lib/trpc/client';
import Link from 'next/link';

export default function BattlePage({ params }: { params: Promise<{ battleId: string }> }) {
  const { battleId } = use(params);
  const { data: battle, isLoading } = trpc.battles.get.useQuery({ battleId });
  const vote = trpc.battles.vote.useMutation();

  if (isLoading) return <LoadingState />;
  if (!battle) return <NotFound />;

  const tripA = battle.trip_a;
  const tripB = battle.trip_b;

  return (
    <div className="min-h-screen bg-black text-white font-data selection:bg-white selection:text-black overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#D85A30_0%,transparent_50%)]" />
      </div>

      <header className="relative z-10 px-6 pt-12 pb-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-vibe">The Colosseum</p>
        <h1 className="text-4xl font-cinematic font-medium mt-2">Chaos Clash</h1>
      </header>

      <main className="relative z-10 flex flex-col md:flex-row h-[calc(100vh-200px)]">
        {/* Trip A */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-white/10 group">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-vibe mb-8">Challenger A</p>
          <div className="text-center space-y-4">
             <h2 className="text-5xl font-cinematic font-medium group-hover:scale-105 transition-transform">{tripA.name}</h2>
             <p className="text-sm text-gray-400 font-data italic">{tripA.destination}</p>
             <div className="inline-block px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                <span className="text-2xl font-vibe font-bold text-cooked-accent">{tripA.chaos_score}</span>
                <span className="text-[8px] uppercase tracking-widest ml-2 opacity-50">Chaos</span>
             </div>
          </div>
          
          <button 
            onClick={() => vote.mutate({ battleId, votedForTripId: tripA.id })}
            className="mt-12 px-10 py-5 bg-white text-black rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] hover:bg-cooked-accent hover:text-white transition-all shadow-2xl shadow-white/5"
          >
            Vote for {tripA.name}
          </button>
        </div>

        {/* VS Divider */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
           <div className="w-16 h-16 rounded-full bg-cooked-bg border-4 border-black flex items-center justify-center font-cinematic italic text-2xl">vs</div>
        </div>

        {/* Trip B */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 group">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-vibe mb-8">Challenger B</p>
          <div className="text-center space-y-4">
             <h2 className="text-5xl font-cinematic font-medium group-hover:scale-105 transition-transform">{tripB.name}</h2>
             <p className="text-sm text-gray-400 font-data italic">{tripB.destination}</p>
             <div className="inline-block px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                <span className="text-2xl font-vibe font-bold text-cooked-accent">{tripB.chaos_score}</span>
                <span className="text-[8px] uppercase tracking-widest ml-2 opacity-50">Chaos</span>
             </div>
          </div>

          <button 
             onClick={() => vote.mutate({ battleId, votedForTripId: tripB.id })}
             className="mt-12 px-10 py-5 bg-white text-black rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] hover:bg-cooked-accent hover:text-white transition-all shadow-2xl shadow-white/5"
          >
            Vote for {tripB.name}
          </button>
        </div>
      </main>

      <footer className="fixed bottom-12 left-0 w-full px-6 flex justify-between items-center z-10">
         <div className="text-[10px] uppercase tracking-widest text-gray-500 font-vibe">
            {battle.trip_a_votes + battle.trip_b_votes} total votes cast
         </div>
         <Link href="/trips" className="text-[10px] uppercase tracking-widest text-white font-vibe border-b border-white/20 pb-1">
            Back to Archive
         </Link>
      </footer>
    </div>
  );
}

function LoadingState() {
  return <div className="min-h-screen bg-black flex items-center justify-center text-white font-vibe uppercase tracking-[0.5em] animate-pulse">Loading Arena...</div>;
}

function NotFound() {
  return <div className="min-h-screen bg-black flex items-center justify-center text-white font-cinematic italic">Battle not found in the archives.</div>;
}
