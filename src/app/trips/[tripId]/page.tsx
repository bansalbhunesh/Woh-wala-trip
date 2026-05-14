'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import Link from 'next/link';

export default function TripRoomPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const { data: tripData, isLoading } = trpc.trips.getFull.useQuery({ tripId });

  if (isLoading) return <LoadingState />;
  if (!tripData) return <NotFoundState />;

  const trip = (tripData as any).trip;
  const cast = (tripData as any).cast || [];

  return (
    <div className="min-h-screen bg-black text-[#F5F0E8] font-vibe selection:bg-cooked-bg selection:text-white pb-32 overflow-x-hidden">
      {/* Header Band */}
      <div className="bg-gradient-to-b from-[#1A0505] to-black px-6 pt-10 pb-6 border-b border-white/[0.03]">
        <Link href="/trips" className="text-[9px] uppercase tracking-[0.3em] text-white/20 hover:text-white transition-colors mb-6 block">
          ← All Archives
        </Link>
        <h1 className="font-cinematic font-black text-4xl md:text-6xl tracking-tighter leading-none mb-2 uppercase">
          {trip.title}
        </h1>
        <p className="text-[10px] text-white/30 uppercase tracking-[0.1em] font-vibe italic">
          {trip.location || 'Unknown'} · {cast.length} people · {trip.photo_count || 0} photos · Season {new Date(trip.created_at).getFullYear()}
        </p>
      </div>

      {/* Massive Chaos Reveal */}
      <div className="px-6 pt-12">
        <div className="text-[8px] uppercase tracking-[0.4em] text-white/20 mb-1 font-bold">Collective Chaos / 100</div>
        <div className="font-vibe font-black text-[28vw] md:text-[18vw] leading-none text-cooked-accent tracking-tighter animate-fade-in drop-shadow-[0_0_60px_rgba(255,59,47,0.35)]">
          {trip.chaos_score}
        </div>
        <div className="font-cinematic italic text-2xl md:text-4xl text-cooked-accent mt-2">
           "{trip.chaos_score >= 80 ? 'Historically Cooked' : trip.chaos_score >= 50 ? 'Peak Delusion' : 'Mildly Simmering'}"
        </div>
        <div className="mt-8 pl-6 border-l-2 border-cooked-accent/30 text-sm text-white/40 leading-relaxed max-w-sm italic">
           {trip.verdict || 'The algorithm has analyzed the data. No further notes required.'}
        </div>
      </div>

      {/* Season Recap */}
      <section className="px-6 mt-20">
         <div className="text-[8px] uppercase tracking-[0.4em] text-white/20 mb-6 font-bold">Season Recap</div>
         <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[32px] backdrop-blur-sm">
            <p className="font-cinematic italic text-lg md:text-xl text-white/70 leading-relaxed">
              "{trip.recap || 'The narrative is being finalized...'}"
            </p>
         </div>
      </section>

      {/* Trip Eras Timeline */}
      <section className="px-6 mt-20">
        <div className="text-[8px] uppercase tracking-[0.4em] text-white/20 mb-8 font-bold">Trip Eras</div>
        <div className="space-y-0">
           {(trip.eras || ['The Yoga Phase', 'The Beach Incident', 'The Ramen Phase']).map((era: string, i: number) => (
             <div key={i} className="pl-8 py-8 border-l-2 border-white/[0.06] relative group">
                <div className="absolute left-[-5px] top-10 w-2 h-2 rounded-full bg-black border-2 border-white/15 group-hover:border-chill-accent transition-colors" />
                <h3 className="font-cinematic font-black text-2xl mb-1 uppercase tracking-tighter">{era}</h3>
                <div className="text-[8px] uppercase tracking-[0.3em] text-chill-accent mb-3 font-bold">Day {i + 1} · {i === 0 ? 'Baseline Delusion' : i === 1 ? 'Peak Chaos' : 'The Realization'}</div>
                <p className="text-sm text-white/30 font-vibe leading-relaxed max-w-md italic">
                   {i === 0 ? 'Everyone convinced themselves this was a wellness trip. It was not.' : i === 1 ? 'The defining event. Six witnesses, six different stories. No consensus.' : 'Eight people, one open stall, the realization that everyone was performative.'}
                </p>
             </div>
           ))}
        </div>
      </section>

      {/* Character Roles - Sized by Chaos */}
      <section className="px-6 mt-20">
        <div className="text-[8px] uppercase tracking-[0.4em] text-white/20 mb-8 font-bold">Character Roles</div>
        <div className="flex flex-col gap-3">
           {cast.sort((a:any, b:any) => b.chaos_score - a.chaos_score).map((member: any, i: number) => {
             const isMain = i === 0;
             const isGhost = member.chaos_score < 30;
             
             return (
               <div 
                 key={member.id} 
                 className={`relative overflow-hidden transition-all hover:scale-[1.01] ${
                    isMain ? 'p-8 bg-gradient-to-br from-[#140A0A] to-black border border-cooked-accent/25 rounded-[32px]' : 
                    isGhost ? 'p-5 bg-transparent border border-white/[0.04] rounded-2xl opacity-40 hover:opacity-100' :
                    'p-6 bg-white/[0.03] border border-white/5 rounded-[28px]'
                 }`}
               >
                 <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-full bg-cooked-accent/15 flex items-center justify-center font-vibe font-black text-cooked-accent border border-cooked-accent/20">
                       {(member.full_name || '??').split(' ').map((n:string) => n[0]).join('')}
                    </div>
                    {isMain && (
                      <div className="px-3 py-1 rounded-full bg-cooked-accent/15 border border-cooked-accent/30 text-[8px] font-vibe font-bold uppercase tracking-[0.15em] text-cooked-accent">
                        ⚡ Chaos Source
                      </div>
                    )}
                 </div>
                 <h3 className={`font-cinematic font-black tracking-tighter uppercase ${isMain ? 'text-3xl' : 'text-xl'}`}>{member.full_name}</h3>
                 <p className="font-cinematic italic text-white/50 text-sm mb-3">"{member.archetype || 'The Cast Member'}"</p>
                 <p className="text-[11px] text-white/30 leading-relaxed max-w-sm mb-6 italic">
                    {member.roast || 'The algorithm is still processing the full extent of this persona.'}
                 </p>
                 <div className="space-y-2">
                    <div className="h-0.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                       <div className="h-full bg-cooked-accent" style={{ width: `${member.chaos_score * 10}%` }} />
                    </div>
                    <div className="flex justify-between text-[8px] font-vibe font-bold uppercase tracking-widest text-white/20">
                       <span>Chaos Rating</span>
                       <span className="text-cooked-accent">{member.chaos_score}/10</span>
                    </div>
                 </div>
               </div>
             )
           })}
        </div>
      </section>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-2xl border-t border-white/5 z-50 flex gap-3">
         <Link 
           href={`/trips/${tripId}/share`}
           className="flex-[2] py-5 bg-[#F5F0E8] text-black rounded-full text-center text-[10px] font-vibe font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
         >
           Export Identity
         </Link>
         <button className="flex-1 py-5 border border-white/10 text-white/50 rounded-full text-[10px] font-vibe font-bold uppercase tracking-[0.2em] hover:bg-white/5 transition-all">
           Seal Lore
         </button>
      </div>

      {/* Story CTA */}
      <section className="px-6 mt-12 pb-10">
         <Link 
           href={`/trips/${tripId}/story`}
           className="block p-10 border border-white/5 bg-white/[0.01] rounded-[32px] text-center group hover:bg-white/[0.03] transition-all"
         >
           <div className="text-[8px] uppercase tracking-[0.4em] text-white/20 mb-4 font-bold">Cinematic Mode</div>
           <h3 className="font-cinematic font-black text-3xl mb-1 uppercase tracking-tighter">Watch the lore</h3>
           <p className="text-xs text-white/30 mb-8 font-vibe italic">Full-screen slide-by-slide story mode.</p>
           <div className="inline-flex items-center gap-2 px-8 py-4 bg-[#F5F0E8] text-black rounded-full text-[10px] font-vibe font-black uppercase tracking-[0.2em] group-hover:scale-105 transition-all">
              ▶ Play Story
           </div>
         </Link>
      </section>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-12">
       <div className="animate-pulse text-[10px] uppercase tracking-[0.5em] text-white/20 font-vibe">Decrypting Archive...</div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-12 text-center space-y-6 text-[#F5F0E8]">
       <h1 className="font-cinematic font-black text-4xl uppercase tracking-tighter">Archive Lost</h1>
       <p className="text-white/30 font-vibe italic text-sm">This lore does not exist or has been sealed permanently.</p>
       <Link href="/trips" className="px-8 py-4 bg-[#F5F0E8] text-black rounded-full text-[10px] font-vibe font-black uppercase tracking-widest">Back to Gallery</Link>
    </div>
  );
}
