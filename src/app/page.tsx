import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FilmGrain, AtmosphericBlob, CinematicText } from '@/components/ui/atoms';
import { ChevronRight, Sparkles, Play, Users } from 'lucide-react';

export default async function LandingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect('/trips');
  }

  return (
    <div className="min-h-screen bg-black text-[#F5F0E8] font-cinematic selection:bg-cooked-accent selection:text-white overflow-x-hidden">
      <FilmGrain />
      
      {/* Cinematic Hero */}
      <section className="relative h-[100vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        {/* Explosive Ambient Glows */}
        <AtmosphericBlob color="#FF3B2F" className="top-[-10%] left-[-15%] w-[60vw] h-[60vw] opacity-10 animate-float-a" />
        <AtmosphericBlob color="#1FA882" className="bottom-[10%] right-[-10%] w-[50vw] h-[50vw] opacity-5 animate-float-b" />
        <AtmosphericBlob color="#D49E2D" className="top-[40%] left-[30%] w-[40vw] h-[40vw] opacity-5 animate-float-c" />
        
        {/* Floating Archetype Cards */}
        <div className="absolute inset-0 z-1 pointer-events-none hidden lg:block">
           <FloatingCard emoji="⚡" name="Chaos Source" score="9/10" color="var(--cooked-accent)" className="top-[15%] left-[10%] rotate-[-4deg] animate-float-a" />
           <FloatingCard emoji="🐈‍⬛" name="Black Cat" score="7/10" color="var(--chill-accent)" className="top-[20%] right-[12%] rotate-[3deg] animate-float-b delay-700" />
           <FloatingCard emoji="🧍" name="NPC Energy" score="2/10" color="#6B6860" className="bottom-[25%] left-[15%] rotate-[2deg] animate-float-c delay-1000" />
           <FloatingCard emoji="🐕" name="Golden Retriever" score="5/10" color="#D49E2D" className="bottom-[30%] right-[10%] rotate-[-3deg] animate-float-a delay-1500" />
        </div>

        <div className="relative z-10 space-y-12 max-w-6xl">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-2xl text-[10px] font-black uppercase tracking-[0.4em] text-white/40 shadow-2xl">
            <span className="w-2 h-2 rounded-full bg-cooked-accent animate-pulse" />
            Season 2026 Archive Now Open
          </div>
          
          <h1 className="text-[18vw] md:text-[14vw] font-black tracking-tighter leading-[0.78] text-[#F5F0E8] uppercase font-cinematic">
            Woh<br />Wala<br /><span className="italic text-cooked-accent">Trip</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/30 max-w-sm mx-auto italic font-medium leading-relaxed">
            "Your photo dumps become cinematic lore. Your friends become roasted archetypes."
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-12">
            <Link
              href="/login"
              className="group flex items-center gap-4 px-12 py-7 bg-[#F5F0E8] text-black rounded-full text-[11px] font-black uppercase tracking-[0.3em] hover:scale-110 active:scale-95 transition-all shadow-3xl"
            >
              Start the Lore
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#demo"
              className="flex items-center gap-4 px-12 py-7 border border-white/10 bg-white/5 text-white/40 rounded-full text-[11px] font-black uppercase tracking-[0.3em] hover:bg-white/10 hover:text-white transition-all"
            >
              <Play size={16} /> View Demo
            </Link>
          </div>
        </div>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce opacity-20">
          <span className="text-2xl text-white/30 font-light">↓</span>
        </div>
      </section>

      {/* Scrolling Ticker */}
      <section className="relative z-10 border-y border-white/5 overflow-hidden bg-white/[0.02] backdrop-blur-md py-6">
        <div className="flex gap-0 animate-marquee whitespace-nowrap">
           {[...Array(2)].map((_, i) => (
             <div key={i} className="flex gap-0 items-center">
                <TickerItem text="Black Cat" />
                <TickerItem text="Chaos Source" />
                <TickerItem text="Emotional Support NPC" />
                <TickerItem text="Main Character" />
                <TickerItem text="Golden Retriever" />
                <TickerItem text="Historically Cooked" />
                <TickerItem text="Peak Delusion" />
             </div>
           ))}
        </div>
      </section>

      {/* Feature Section */}
      <section id="demo" className="relative z-10 py-60 px-6">
        <div className="max-w-6xl mx-auto text-center space-y-32">
           <div className="space-y-6">
             <CinematicText variant="eyebrow" className="text-white/20">The Algorithm</CinematicText>
             <h2 className="text-7xl md:text-[10vw] font-black tracking-tighter leading-[0.8] text-[#F5F0E8] uppercase">
               Exposing<br />Everyone.
             </h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <FeatureCard 
               icon={<Sparkles size={24} className="text-cooked-accent" />} 
               title="Archetypes" 
               desc="AI analyzes your group dynamic and assigns roasting roles." 
             />
             <FeatureCard 
               icon={<Play size={24} className="text-chill-accent" />} 
               title="Story Mode" 
               desc="Tap-through cinematic slides generated from your photo dumps." 
             />
             <FeatureCard 
               icon={<Users size={24} className="text-lore-accent" />} 
               title="Cast List" 
               desc="Track everyone's chaos score and collective cooked rating." 
             />
             <FeatureCard 
               icon={<ChevronRight size={24} className="text-white/40" />} 
               title="Posters" 
               desc="Export high-fidelity season posters for your social release." 
             />
           </div>
        </div>
      </section>

      {/* Final Call */}
      <section className="relative py-80 px-6 text-center overflow-hidden border-t border-white/5">
        <AtmosphericBlob color="#FF3B2F" className="bottom-[-20%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vw] opacity-10" />
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-12">
          <h2 className="text-7xl md:text-[10vw] font-black tracking-tighter leading-[0.8] text-[#F5F0E8] uppercase">
            Stop being boring. <br /> <span className="italic text-cooked-accent">Start the lore.</span>
          </h2>
          <div className="flex flex-col items-center gap-8 pt-12">
            <Link
              href="/login"
              className="px-16 py-8 bg-[#F5F0E8] text-black rounded-full text-[12px] font-black uppercase tracking-[0.4em] hover:scale-110 active:scale-95 transition-all shadow-3xl"
            >
              Access the Archive
            </Link>
            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
               <span>Open Beta</span>
               <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
               <span>v2.0 Cinematic Pipeline</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FloatingCard({ emoji, name, score, color, className }: { emoji: string; name: string; score: string; color: string; className: string }) {
  return (
    <div className={`absolute p-6 border border-white/10 rounded-[2.5rem] bg-white/[0.03] backdrop-blur-xl flex flex-col gap-3 w-44 transition-all duration-700 ${className}`}>
      <div className="text-3xl">{emoji}</div>
      <div className="text-[10px] font-black uppercase tracking-widest text-white/30">{name}</div>
      <div className="text-2xl font-black" style={{ color }}>{score}</div>
    </div>
  );
}

function TickerItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-12 px-12">
      <span className="text-4xl md:text-6xl font-black italic text-white/[0.03] uppercase whitespace-nowrap">{text}</span>
      <div className="w-2 h-2 rounded-full bg-cooked-accent/40 flex-shrink-0" />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-10 border border-white/5 bg-white/[0.02] rounded-[3rem] text-left hover:bg-white/[0.05] hover:border-white/10 transition-all duration-500 group">
      <div className="mb-8 transform group-hover:scale-110 transition-transform duration-500">{icon}</div>
      <h3 className="font-black text-2xl text-[#F5F0E8] leading-tight mb-4 uppercase">{title}</h3>
      <p className="text-[11px] text-white/30 font-medium leading-relaxed italic">"{desc}"</p>
    </div>
  );
}
