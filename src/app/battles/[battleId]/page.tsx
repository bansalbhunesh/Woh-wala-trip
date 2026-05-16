'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import Link from 'next/link';

export default function BattlePage() {
  const params = useParams();
  const battleId = params.battleId as string;
  const { data: battle, isLoading } = trpc.battles.get.useQuery({ battleId });
  const vote = trpc.battles.vote.useMutation();

  if (isLoading) return <LoadingState />;
  if (!battle) return <NotFound />;

  const tripA = battle.trip_a;
  const tripB = battle.trip_b;

  const totalVotes = battle.trip_a_votes + battle.trip_b_votes;
  const percentA = totalVotes > 0 ? Math.round((battle.trip_a_votes / totalVotes) * 100) : 50;
  const percentB = 100 - percentA;

  return (
    <div className="min-h-screen bg-black text-[#F5F0E8] font-vibe selection:bg-cooked-accent selection:text-white overflow-hidden flex flex-col">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#301010_0%,transparent_70%)] opacity-40" />
         <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-cooked-accent opacity-[0.03] blur-[150px] animate-floatA" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-chill-accent opacity-[0.03] blur-[150px] animate-floatB" />
      </div>

      <header className="relative z-10 px-6 pt-12 pb-6 text-center">
        <p className="text-[9px] uppercase tracking-[0.5em] text-white/20 font-vibe mb-2">The Colosseum</p>
        <h1 className="text-4xl font-cinematic font-black tracking-tighter uppercase italic text-cooked-accent">Chaos Clash</h1>
      </header>

      <main className="relative z-10 flex-1 flex flex-col md:flex-row">
        {/* Challenger A */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-8 overflow-hidden group border-b md:border-b-0 md:border-r border-white/[0.03]">
           <div className="absolute left-[-20px] top-1/2 -translate-y-1/2 font-vibe font-black text-[30vw] md:text-[18vw] text-white opacity-[0.02] leading-none select-none group-hover:opacity-[0.04] transition-opacity">
              {tripA.chaos_score}
           </div>
           
           <div className="relative z-10 text-center space-y-6">
              <div className="text-[8px] uppercase tracking-[0.4em] text-white/20 font-bold mb-4">Challenger A</div>
              <h2 className="text-5xl md:text-7xl font-cinematic font-black tracking-tighter leading-none text-[#F5F0E8] group-hover:scale-[1.03] transition-transform duration-700">
                 {tripA.name}
              </h2>
              <div className="font-cinematic italic text-sm text-white/40">{tripA.destination || tripA.location || ''}</div>
              
              <div className="flex items-center justify-center gap-3">
                 <div className="px-4 py-2 bg-white/[0.03] border border-white/10 rounded-full text-xs font-vibe font-bold text-white/60">
                    {percentA}% Lore Approval
                 </div>
              </div>

              <button 
                onClick={() => vote.mutate({ battleId, votedForTripId: tripA.id })}
                className="relative mt-12 px-12 py-5 bg-[#F5F0E8] text-black rounded-full font-vibe font-black uppercase tracking-[0.2em] text-[10px] hover:scale-110 active:scale-95 transition-all shadow-2xl hover:bg-cooked-accent hover:text-white"
              >
                Validate Chaos
              </button>
           </div>
        </div>

        {/* VS Divider */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center">
           <div className="w-20 h-20 rounded-full bg-black border-2 border-white/5 flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-cooked-accent opacity-0 group-hover:opacity-20 transition-opacity" />
              <div className="font-cinematic italic text-3xl font-black text-white group-hover:scale-125 transition-transform">vs</div>
              <div className="absolute inset-0 border border-cooked-accent rounded-full animate-ping opacity-20" />
           </div>
        </div>

        {/* Challenger B */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-8 overflow-hidden group">
           <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 font-vibe font-black text-[30vw] md:text-[18vw] text-white opacity-[0.02] leading-none select-none group-hover:opacity-[0.04] transition-opacity">
              {tripB.chaos_score}
           </div>

           <div className="relative z-10 text-center space-y-6">
              <div className="text-[8px] uppercase tracking-[0.4em] text-white/20 font-bold mb-4">Challenger B</div>
              <h2 className="text-5xl md:text-7xl font-cinematic font-black tracking-tighter leading-none text-[#F5F0E8] group-hover:scale-[1.03] transition-transform duration-700">
                 {tripB.name}
              </h2>
              <div className="font-cinematic italic text-sm text-white/40">{tripB.destination || tripB.location || ''}</div>

              <div className="flex items-center justify-center gap-3">
                 <div className="px-4 py-2 bg-white/[0.03] border border-white/10 rounded-full text-xs font-vibe font-bold text-white/60">
                    {percentB}% Lore Approval
                 </div>
              </div>

              <button 
                onClick={() => vote.mutate({ battleId, votedForTripId: tripB.id })}
                className="relative mt-12 px-12 py-5 bg-[#F5F0E8] text-black rounded-full font-vibe font-black uppercase tracking-[0.2em] text-[10px] hover:scale-110 active:scale-95 transition-all shadow-2xl hover:bg-cooked-accent hover:text-white"
              >
                Validate Chaos
              </button>
           </div>
        </div>
      </main>

      <footer className="relative z-20 p-8 flex flex-col items-center gap-6 bg-gradient-to-t from-black to-transparent">
         <div className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-vibe">
            {totalVotes} total votes cast in this archive
         </div>
         <div className="w-full max-w-lg h-1 bg-white/[0.03] rounded-full overflow-hidden flex">
            <div className="h-full bg-cooked-accent transition-all duration-1000" style={{ width: `${percentA}%` }} />
            <div className="h-full bg-chill-accent transition-all duration-1000" style={{ width: `${percentB}%` }} />
         </div>
         <Link href="/trips" className="text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors border-b border-white/5 pb-1">
            Back to All Archive
         </Link>
      </footer>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
       <div className="animate-pulse text-[10px] uppercase tracking-[0.5em] text-white/20 font-vibe">Entering Arena...</div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-12 text-center space-y-6">
       <h1 className="font-cinematic font-black text-4xl">Archive Corrupted</h1>
       <p className="text-white/30 font-vibe">This battle has been sealed or does not exist.</p>
       <Link href="/trips" className="px-8 py-4 bg-white text-black rounded-full text-[10px] font-vibe font-black uppercase tracking-widest">Back to Gallery</Link>
    </div>
  );
}
