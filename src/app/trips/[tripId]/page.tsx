'use client';

import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import Link from 'next/link';
import { useState } from 'react';

export default function TripRoomPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const [isStoryMode, setIsStoryMode] = useState(false);

  const { data: tripData, isLoading } = trpc.trips.getFull.useQuery({ tripId });

  if (isLoading) return <LoadingState />;
  if (!tripData) return <NotFoundState />;

  const trip = (tripData as any).trip;
  const cast = (tripData as any).cast || [];
  const lore = trip.lore_json || {};

  return (
    <div className="min-h-screen bg-[#0A0A08] text-[#F5F0E8] font-syne selection:bg-cooked-accent selection:text-white pb-20 overflow-x-hidden">
      {/* ✦ Cinematic Navigation Bar ✦ */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-black/60 backdrop-blur-xl border-b border-white/[0.05] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/trips" className="flex items-center gap-2 group">
            <div className="w-6 h-6 bg-cooked-accent rounded-sm rotate-45 group-hover:rotate-90 transition-transform duration-500" />
            <span className="font-cinematic font-black text-lg tracking-tighter uppercase">Woh Wala Trip</span>
          </Link>
          <div className="hidden md:block h-4 w-[1px] bg-white/10" />
          <div className="hidden md:block">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">Current Plot</p>
            <p className="text-sm font-cinematic font-black uppercase tracking-tight">{trip.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="hidden md:block px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all">Render Poster</button>
          <button className="hidden md:block px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all">Share OG</button>
          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
             <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">AI Story Mode</span>
             <button 
               onClick={() => router.push(`/trips/${tripId}/story`)}
               className="w-10 h-5 bg-cooked-accent/20 rounded-full relative p-1 group overflow-hidden"
             >
                <div className="w-3 h-3 bg-cooked-accent rounded-full absolute right-1 top-1 shadow-[0_0_10px_rgba(255,59,47,0.5)]" />
             </button>
          </div>
        </div>
      </nav>

      {/* ✦ Main Content Layout ✦ */}
      <main className="pt-24 px-6 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: HERO & REVEALS (8 COLS) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Main Hero Card */}
          <div className="relative group rounded-[40px] overflow-hidden bg-black border border-white/[0.08] shadow-2xl transition-all hover:border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="relative aspect-[4/5] md:aspect-auto bg-gradient-to-br from-neutral-900 to-black overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-luminosity group-hover:scale-105 transition-transform duration-[2s]" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop')` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                
                <div className="absolute top-8 left-8 flex gap-2">
                   <div className="px-3 py-1 bg-cooked-accent/20 backdrop-blur-md border border-cooked-accent/30 rounded-full text-[8px] font-bold uppercase tracking-widest text-cooked-accent">Chaos {trip.chaos_score}</div>
                   <div className="px-3 py-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-[8px] font-bold uppercase tracking-widest text-white/50">Season {new Date().getFullYear()}</div>
                </div>

                <div className="absolute bottom-10 left-10 right-10">
                  <h1 className="text-5xl md:text-6xl font-cinematic font-black tracking-tighter leading-[0.9] uppercase mb-4">
                    Season 2:<br/>The Bus That Betrayed Us
                  </h1>
                  <p className="text-sm text-white/40 leading-relaxed max-w-xs font-medium italic">
                    We thought the bus was our salvation. It arrived at 3AM, stole Sam's shoes, and got credited as a character.
                  </p>
                  <div className="flex gap-3 mt-8">
                     <button className="px-6 py-3 bg-[#F5F0E8] text-black rounded-full text-[9px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all">Save as Poster</button>
                     <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all">Watch Mini Doc</button>
                  </div>
                </div>
              </div>

              <div className="p-10 space-y-12 bg-white/[0.02]">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">Delusion Index</p>
                    <div className="text-6xl font-black text-[#F5F0E8] tracking-tighter">84</div>
                    <p className="text-[10px] text-white/30 leading-tight">Why this host-your-group-genuinely-believes-a-conspiracy-theory about the 'bus' situation.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">Emotional Damage</p>
                    <div className="text-6xl font-black text-cooked-accent tracking-tighter">9/10</div>
                    <p className="text-[10px] text-white/30 leading-tight">Total count: Midnight Confessions — unmasked and deeply cinematic.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 py-4 bg-cooked-accent/15 border border-cooked-accent/30 text-cooked-accent rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-cooked-accent/20 transition-all">Read Therapy Notes</button>
                  <button className="flex-1 py-4 bg-white/5 border border-white/10 text-white/60 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Look as Lore</button>
                </div>

                <div className="p-6 bg-black rounded-3xl border border-white/[0.05] relative overflow-hidden group/twist">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cooked-accent/5 blur-3xl group-hover/twist:bg-cooked-accent/20 transition-all" />
                  <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-cooked-accent mb-2">Plot Twist</p>
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-2">The Bus Had Feelings</h3>
                  <p className="text-xs text-white/40 leading-relaxed italic">An unreleased voicemail of the bus operator crying—the group now debates culpability and parenthood.</p>
                  <div className="flex gap-2 mt-6">
                    <button className="px-4 py-2 bg-cooked-accent text-white rounded-lg text-[8px] font-black uppercase tracking-widest">Expose Voicemail</button>
                    <button className="px-4 py-2 bg-white/5 rounded-lg text-[8px] font-black uppercase tracking-widest">Blur for Privacy</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Emotional Reveals Section */}
          <div className="space-y-6 pt-10">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/20 ml-2">Emotional Reveals — Moments You Can't Unsee</h2>
            
            <div className="grid grid-cols-1 gap-6">
              {/* Card 1: MVP */}
              <div className="group bg-white/[0.02] border border-white/5 rounded-[40px] p-8 flex flex-col md:flex-row gap-8 hover:bg-white/[0.04] transition-all">
                <div className="w-full md:w-64 h-64 rounded-3xl overflow-hidden relative">
                   <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1964&auto=format&fit=crop" className="w-full h-full object-cover mix-blend-screen opacity-80" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                   <div className="absolute bottom-4 left-4 right-4 text-center">
                      <div className="px-3 py-1 bg-chill-accent text-black rounded-full text-[8px] font-black uppercase tracking-widest">Trip MVP</div>
                   </div>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="text-4xl font-cinematic font-black uppercase tracking-tighter mb-2">Zara — The Catalyst</h3>
                  <p className="text-sm text-white/50 leading-relaxed mb-6 italic">Carried the group, the snacks, and three contradictory philosophies. Caused 2 love triangles inadvertently.</p>
                  <div className="p-4 bg-chill-accent/10 border border-chill-accent/20 rounded-2xl mb-8">
                    <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-chill-accent mb-1">Reveal</p>
                    <p className="text-xs font-bold text-white/80 uppercase tracking-tight">Secretly paid for the taxi back at 2AM.</p>
                  </div>
                  <div className="flex gap-3">
                    <button className="px-6 py-3 bg-cooked-accent text-white rounded-full text-[9px] font-black uppercase tracking-widest">Canvas Her</button>
                    <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest">Make Poster</button>
                  </div>
                </div>
              </div>

              {/* Card 2: Villain */}
              <div className="group bg-white/[0.02] border border-white/5 rounded-[40px] p-8 flex flex-col md:flex-row gap-8 hover:bg-white/[0.04] transition-all">
                <div className="w-full md:w-64 h-64 rounded-3xl overflow-hidden relative">
                   <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop" className="w-full h-full object-cover mix-blend-soft-light opacity-80 grayscale" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                   <div className="absolute bottom-4 left-4 right-4 text-center">
                      <div className="px-3 py-1 bg-cooked-accent text-white rounded-full text-[8px] font-black uppercase tracking-widest">Trip Villain</div>
                   </div>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="text-4xl font-cinematic font-black uppercase tracking-tighter mb-2">Kev — The Architect</h3>
                  <p className="text-sm text-white/50 leading-relaxed mb-6 italic">Blamed for the tent collapse, the missing GPS, and the heartbreak. Has an alibi that is suspiciously theatrical.</p>
                  <div className="p-4 bg-cooked-accent/10 border border-cooked-accent/20 rounded-2xl mb-8">
                    <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-cooked-accent mb-1">Plot Twist</p>
                    <p className="text-xs font-bold text-white/80 uppercase tracking-tight">Deviously fixed the generator but pocketed the cookies.</p>
                  </div>
                  <div className="flex gap-3">
                    <button className="px-6 py-3 bg-cooked-accent text-white rounded-full text-[9px] font-black uppercase tracking-widest">Accuse</button>
                    <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest">Challenge to Duel</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SIDEBAR WIDGETS (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Friends Widget */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 space-y-6">
             <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">Cast Members</h4>
                <div className="w-2 h-2 rounded-full bg-chill-accent animate-pulse" />
             </div>
             <div className="space-y-6">
                {cast.slice(0, 3).map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-full bg-neutral-800 border border-white/10 overflow-hidden relative">
                       <img src={`https://i.pravatar.cc/150?u=${m.id}`} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold uppercase tracking-tight">{m.full_name}</p>
                      <p className="text-[9px] text-white/30 uppercase font-medium">{m.archetype || 'Cast Member'}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] font-bold uppercase tracking-widest text-cooked-accent">Chaos</p>
                       <p className="text-xs font-black">{m.chaos_score}/10</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Chaos Chart Widget */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 space-y-6">
             <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">Chaos Distribution</h4>
             <div className="aspect-square relative flex items-center justify-center">
                {/* Simulated Pie Chart */}
                <div className="w-48 h-48 rounded-full border-[16px] border-white/5 relative">
                   <div className="absolute inset-0 rounded-full border-[16px] border-cooked-accent border-r-transparent border-b-transparent rotate-45" />
                   <div className="absolute inset-0 rounded-full border-[16px] border-chill-accent border-l-transparent border-t-transparent -rotate-12" />
                </div>
                <div className="absolute text-center">
                   <p className="text-2xl font-black tracking-tighter">{trip.chaos_score}</p>
                   <p className="text-[8px] font-bold uppercase tracking-widest text-white/20">Global</p>
                </div>
             </div>
             <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/40">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cooked-accent" />
                      <span>Delusion (Cookie Metal)</span>
                   </div>
                   <span>42%</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/40">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-chill-accent" />
                      <span>The Fringe (Overboard)</span>
                   </div>
                   <span>28%</span>
                </div>
             </div>
          </div>

          {/* Lore Timeline Widget */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 space-y-6">
             <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">Liner History</h4>
             <div className="h-40 flex items-end gap-1 px-2">
                {[40, 60, 30, 85, 45, 90, 55, 70, 35, 80].map((h, i) => (
                  <div key={i} className="flex-1 bg-white/5 rounded-t-sm group relative">
                     <div className="absolute bottom-0 left-0 right-0 bg-cooked-accent/30 group-hover:bg-cooked-accent transition-all rounded-t-sm" style={{ height: `${h}%` }} />
                  </div>
                ))}
             </div>
             <p className="text-[9px] text-white/20 leading-relaxed text-center italic">Pseudo-Midnight Confessions: Lore Battery died during cliff scenes. Annotation: "Sam voted louder than the tide."</p>
          </div>

          {/* Stickers / Sticker Zone Widget */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 space-y-6">
             <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">Sticker Zone</h4>
             <div className="p-10 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center">
                <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest leading-relaxed">Drag the archetype stickers into the ring to join proxy rank. The lore engine will produce a 3.5m documentary beat.</p>
                <div className="flex gap-2 mt-8">
                   <button className="px-4 py-2 bg-cooked-accent text-white rounded-lg text-[8px] font-black uppercase tracking-widest">Run Battle</button>
                   <button className="px-4 py-2 bg-white/5 rounded-lg text-[8px] font-black uppercase tracking-widest">Preview Scene</button>
                </div>
             </div>
          </div>

        </div>
      </main>

      {/* ✦ Theatrical Credits Footer ✦ */}
      <footer className="mt-20 pt-20 pb-10 px-6 border-t border-white/[0.05] bg-black">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
             <h5 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">Theatrical Credits</h5>
             <p className="text-xs text-white/20 leading-relaxed font-medium uppercase tracking-tight">Rendered by OG Poster Engine · Lore Pipeline v2 · AI Inside-Joke Detection active</p>
             <p className="text-[9px] text-white/10 italic">Featuring Zara (Catalyst), Kev (Accidental Antagonist), Sam (Archivist). Production supervision by <b>WG BDR</b>.</p>
          </div>
          <div className="space-y-4 text-center">
             <h5 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">Share the Season</h5>
             <div className="flex justify-center gap-3">
                <button className="px-8 py-3 bg-cooked-accent text-white rounded-full text-[9px] font-black uppercase tracking-widest">Share Poster</button>
                <button className="px-8 py-3 border border-white/10 text-white/40 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white/5">Copy OG Link</button>
             </div>
          </div>
          <div className="space-y-4 text-right">
             <h5 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">Micro-Lore Links</h5>
             <div className="flex flex-col items-end gap-2">
                <a href="#" className="text-[10px] text-white/20 hover:text-white uppercase tracking-widest transition-colors">Privacy · Terms · Report a Trip</a>
                <p className="text-[9px] text-white/10">© {new Date().getFullYear()} Woh Wala Trip. Archive your traumabonding properly.</p>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#0A0A08] flex items-center justify-center p-12">
       <div className="animate-pulse text-[10px] uppercase tracking-[0.5em] text-white/20 font-syne">Synchronizing Lore...</div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="min-h-screen bg-[#0A0A08] flex flex-col items-center justify-center p-12 text-center space-y-6 text-[#F5F0E8]">
       <h1 className="font-cinematic font-black text-4xl uppercase tracking-tighter">Archive Redacted</h1>
       <p className="text-white/30 font-syne italic text-sm">This specific season finale has been expunged from the record.</p>
       <Link href="/trips" className="px-8 py-4 bg-[#F5F0E8] text-black rounded-full text-[10px] font-syne font-black uppercase tracking-widest">Return to Gallery</Link>
    </div>
  );
}
