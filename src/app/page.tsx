import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function LandingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect('/trips');
  }

  return (
    <div className="min-h-screen bg-black text-[#F5F0E8] font-vibe selection:bg-cooked-bg selection:text-white overflow-hidden">
      {/* Cinematic Hero */}
      <section className="relative h-[100vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden bg-black">
        {/* Explosive Ambient Glows */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-15%] w-[55vw] h-[55vw] rounded-full bg-cooked-accent/10 blur-[160px] animate-float-a" />
          <div className="absolute bottom-[20%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-chill-accent/5 blur-[160px] animate-float-b" />
          <div className="absolute top-[40%] left-[35%] w-[30vw] h-[30vw] rounded-full bg-amber-500/5 blur-[160px] animate-float-c" />
        </div>
        
        {/* Floating Archetype Cards */}
        <div className="absolute inset-0 z-1 pointer-events-none hidden lg:block">
           <FloatingCard emoji="⚡" name="Chaos Source" score="9/10" color="var(--cooked-bg)" className="top-[12%] left-[8%] rotate-[-3deg] animate-pulse" />
           <FloatingCard emoji="🐈‍⬛" name="Black Cat" score="7/10" color="var(--chill-bg)" className="top-[18%] right-[10%] rotate-[2deg] animate-pulse delay-700" />
           <FloatingCard emoji="🧍" name="NPC Energy" score="2/10" color="#6B6860" className="bottom-[22%] left-[12%] rotate-[1deg] animate-pulse delay-1000" />
           <FloatingCard emoji="🐕" name="Golden Retriever" score="5/10" color="#E8A020" className="bottom-[28%] right-[8%] rotate-[-2deg] animate-pulse delay-1500" />
        </div>

        <div className="relative z-10 space-y-10 max-w-5xl">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-2xl text-[9px] uppercase tracking-[0.35em] font-vibe font-bold text-white/40 animate-fade-in shadow-2xl">
            <span className="w-1.5 h-1.5 rounded-full bg-cooked-accent animate-pulse" />
            Season 2026 Archive Now Open
          </div>
          <h1 className="text-[17vw] md:text-[14vw] font-cinematic font-black tracking-tighter leading-[0.82] text-[#F5F0E8] animate-slide-up">
            Woh<br />Wala<br /><span className="italic text-chill-accent">Trip</span>
          </h1>
          <p className="text-sm md:text-base text-white/30 max-w-xs mx-auto font-vibe font-light leading-relaxed animate-slide-up delay-100">
            Your photo dumps become cinematic lore. Your friends become roasted archetypes. Your chaos gets a score.
          </p>
          <div className="flex flex-col gap-4 items-center pt-8 animate-slide-up delay-200">
            <Link
              href="/login"
              className="w-full max-w-[280px] py-6 bg-[#F5F0E8] text-black rounded-full text-[11px] uppercase tracking-[0.25em] font-vibe font-black hover:scale-[1.05] transition-all shadow-3xl shadow-white/5 active:scale-95"
            >
              Start the lore
            </Link>
            <Link
              href="#demo"
              className="w-full max-w-[280px] py-6 border border-white/10 bg-transparent text-white/50 rounded-full text-[11px] uppercase tracking-[0.25em] font-vibe font-bold hover:border-white/30 hover:text-white transition-all"
            >
              See an example
            </Link>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce opacity-20 z-10">
          <span className="text-2xl text-white/30 font-light">↓</span>
        </div>
      </section>

      {/* Scrolling Archetype Ticker */}
      <section className="relative z-10 border-y border-white/5 overflow-hidden bg-white/5 backdrop-blur-sm py-4">
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

      {/* "The algorithm exposes everyone" Section */}
      <section id="demo" className="relative z-10 py-40 px-6 bg-black">
        <div className="max-w-6xl mx-auto text-center">
           <p className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-vibe mb-4">What you actually get</p>
           <h2 className="text-6xl md:text-8xl font-cinematic font-black tracking-tighter leading-[0.88] text-[#F5F0E8] mb-20">
             The algorithm<br />exposes everyone.
           </h2>

           <div className="relative group max-w-4xl mx-auto mb-20">
              <div className="absolute inset-0 bg-cooked-accent/20 blur-[120px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="relative p-20 bg-white/5 border border-white/5 rounded-[40px] backdrop-blur-3xl overflow-hidden transition-all duration-700 hover:border-white/10">
                 <div className="text-[14vw] md:text-[10vw] font-vibe font-black tracking-tighter text-cooked-accent leading-none animate-pulse-slow">88</div>
                 <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-vibe mt-4">How Cooked? / 100</p>
                 <p className="text-2xl italic font-cinematic text-cooked-accent mt-4">"Historically Cooked"</p>
              </div>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <FeatureCard icon="🎭" title={<>Character<br/>Archetypes</>} desc="Every person gets a role, a verdict, and a chaos rating" />
             <FeatureCard icon="▶" title={<>Cinematic<br/>Story Mode</>} desc="Tap-through slides like IG Stories but for lore" />
             <FeatureCard icon="↗" title={<>Share<br/>Cards</>} desc="Receipt, character, chaos — all shareable" />
             <FeatureCard icon="⚡" title={<>Chaos<br/>Battles</>} desc="Vote who was more cooked. Winner earns +1 chaos" />
           </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-60 px-6 text-center bg-black overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[40%] rounded-full bg-cooked-accent/5 blur-[120px]" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-12">
          <h2 className="text-7xl md:text-[10vw] font-cinematic font-black tracking-tighter leading-[0.85] text-[#F5F0E8]">
            Stop being boring. <br /> <span className="italic text-chill-accent">Start the lore.</span>
          </h2>
          <div className="flex flex-col items-center gap-8 pt-8">
            <Link
              href="/login"
              className="px-16 py-7 bg-[#F5F0E8] text-black rounded-full text-[11px] uppercase tracking-[0.25em] font-vibe font-black hover:scale-[1.05] transition-all shadow-3xl shadow-white/10"
            >
              Access the Archive
            </Link>
            <div className="flex items-center gap-8 text-[9px] uppercase tracking-[0.2em] font-vibe text-white/20">
               <span>Free for basic lore</span>
               <span className="w-1 h-1 rounded-full bg-white/10" />
               <span>₹299 for Season Posters</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FloatingCard({ emoji, name, score, color, className }: { emoji: string; name: string; score: string; color: string; className: string }) {
  return (
    <div className={`absolute p-5 border border-white/5 rounded-3xl backdrop-blur-md flex flex-col gap-2 w-36 ${className}`}>
      <div className="text-2xl">{emoji}</div>
      <div className="text-[10px] italic font-cinematic text-white/50">{name}</div>
      <div className="text-xl font-vibe font-black" style={{ color }}>{score}</div>
    </div>
  );
}

function TickerItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-10 px-10">
      <span className="text-3xl md:text-5xl font-cinematic italic text-white/10 whitespace-nowrap">{text}</span>
      <div className="w-1.5 h-1.5 rounded-full bg-cooked-accent/30 flex-shrink-0" />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: React.ReactNode; desc: string }) {
  return (
    <div className="p-8 border border-white/5 bg-white/[0.02] rounded-[32px] text-left hover:bg-white/[0.05] hover:border-white/10 transition-all duration-500 group">
      <div className="text-3xl mb-6 transform group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="font-cinematic font-black text-xl text-[#F5F0E8] leading-tight mb-2">{title}</h3>
      <p className="text-[10px] text-white/30 font-vibe leading-relaxed">{desc}</p>
    </div>
  );
}
