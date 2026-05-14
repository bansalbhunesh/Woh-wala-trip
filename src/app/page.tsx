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
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {/* Cinematic Hero */}
      <section className="relative h-[100vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden bg-white">
        {/* Deep Field Ambient Glows */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-cooked-accent/10 blur-[160px] animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-chill-accent/10 blur-[160px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="relative z-10 space-y-12 max-w-5xl">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-gray-100 bg-white/40 backdrop-blur-2xl text-[10px] uppercase tracking-[0.4em] font-vibe font-bold text-cooked-bg/60 animate-fade-in shadow-2xl shadow-black/5">
            <span className="w-1.5 h-1.5 rounded-full bg-cooked-accent animate-pulse" />
            Season 2026 Archive Now Open
          </div>
          <h1 className="text-[14vw] md:text-[10vw] font-cinematic font-medium tracking-tighter leading-[0.8] text-cooked-bg animate-slide-up">
            Woh Wala <br /> <span className="italic text-chill-accent">Trip</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-xl mx-auto font-data font-light leading-relaxed animate-slide-up delay-100">
            Turn your messy group photo dumps into cinematic lore, roasted archetypes, and permanent season recaps.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 animate-slide-up delay-200">
            <Link
              href="/login"
              className="px-14 py-6 bg-cooked-bg text-white rounded-full text-xs uppercase tracking-[0.3em] font-vibe font-bold hover:scale-[1.03] transition-all shadow-2xl shadow-cooked-bg/30 active:scale-95"
            >
              Start the lore
            </Link>
            <Link
              href="#demo"
              className="px-14 py-6 border border-gray-100 bg-white rounded-full text-xs uppercase tracking-[0.3em] font-vibe font-bold hover:bg-gray-50 transition-all text-gray-400"
            >
              See example
            </Link>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce opacity-20 z-10">
          <span className="text-2xl text-gray-300">↓</span>
        </div>
      </section>

      {/* "This app exposed our friend group" Section */}
      <section id="demo" className="py-32 px-6 bg-[#FAF8F4]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight leading-tight">
                "This app exposed <br /> our friend group."
              </h2>
              <div className="space-y-6 text-gray-600 text-lg leading-relaxed font-light">
                <p>
                  We don't just "detect faces." We look for signs of a group's collective 
                  emotional downfall. 
                </p>
                <div className="p-8 bg-white/40 backdrop-blur-md rounded-3xl border border-white/20 shadow-sm space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-vibe">Latest Lore: The Delusion Arc</p>
                  <p className="text-2xl italic font-cinematic text-cooked-bg leading-tight">
                    "Everyone was pretending to be mentally stable until the 3 AM ramen phase hit. 
                    Ishaan caused 37% of the problems, and Tanya officially became the Emotional Support NPC."
                  </p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white rounded-[2rem] p-4 shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500 border border-gray-100">
                <div className="aspect-[9/16] bg-gray-50 rounded-[1.5rem] overflow-hidden flex flex-col p-10 justify-between">
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Trip Recap / Season 4</div>
                    <div className="text-4xl font-medium leading-none">The Goa <br /> Downfall</div>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="flex items-baseline gap-4">
                      <div className="text-8xl font-medium tracking-tighter text-red-500">88</div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-widest">How Cooked?</span>
                        <span className="text-[10px] opacity-50">Historically Cooked</span>
                      </div>
                    </div>
                    <div className="text-xs leading-relaxed opacity-60 italic">
                      "The reason this trip now has its own Wikipedia page in our heads."
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scrolling Archetype Ticker */}
      <section className="py-20 border-y border-gray-50 overflow-hidden bg-white">
        <div className="flex gap-12 animate-marquee whitespace-nowrap">
           {[...Array(2)].map((_, i) => (
             <div key={i} className="flex gap-12 items-center">
                <span className="text-4xl md:text-6xl font-cinematic italic text-gray-100">Black Cat</span>
                <span className="w-4 h-4 rounded-full bg-cooked-accent/20" />
                <span className="text-4xl md:text-6xl font-cinematic italic text-gray-100">Chaos Source</span>
                <span className="w-4 h-4 rounded-full bg-chill-accent/20" />
                <span className="text-4xl md:text-6xl font-cinematic italic text-gray-100">Emotional Support NPC</span>
                <span className="w-4 h-4 rounded-full bg-cooked-accent/20" />
                <span className="text-4xl md:text-6xl font-cinematic italic text-gray-100">Main Character</span>
                <span className="w-4 h-4 rounded-full bg-chill-accent/20" />
             </div>
           ))}
        </div>
      </section>

      {/* Who are you? Archetypes */}
      <section className="py-40 px-6">
        <div className="max-w-6xl mx-auto text-center space-y-24">
          <div className="space-y-4">
             <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-vibe">The Cast</p>
             <h2 className="text-6xl md:text-8xl font-cinematic font-medium tracking-tighter text-cooked-bg">Who are you?</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <ArchetypeCard name="Black Cat" icon="🐈‍⬛" desc="Main character energy, minimal photos, maximum impact." />
            <ArchetypeCard name="Golden Retriever" icon="🐕" desc="Happy to be there, 400 blurry selfies of everyone else." />
            <ArchetypeCard name="Support NPC" icon="🧍" desc="Present in every background, saying absolutely nothing." />
            <ArchetypeCard name="Chaos Source" icon="⚡" desc="The sole reason the trip was historically cooked." />
          </div>
        </div>
      </section>

      {/* Footer / CTA */}
      <section className="relative py-60 px-6 text-center bg-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[40%] rounded-full bg-cooked-bg/5 blur-[120px]" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-12">
          <h2 className="text-7xl md:text-9xl font-cinematic font-medium tracking-tighter leading-[0.8] text-cooked-bg">
            Stop being boring. <br /> <span className="italic text-chill-accent">Start the lore.</span>
          </h2>
          <div className="flex flex-col items-center gap-8 pt-8">
            <Link
              href="/login"
              className="px-16 py-7 bg-cooked-bg text-white rounded-full text-xs uppercase tracking-[0.4em] font-vibe font-bold hover:scale-[1.03] transition-all shadow-3xl shadow-cooked-bg/40"
            >
              Access the Archive
            </Link>
            <div className="flex items-center gap-8 text-[10px] uppercase tracking-[0.2em] font-vibe text-gray-300">
               <span>Free for basic lore</span>
               <span className="w-1 h-1 rounded-full bg-gray-200" />
               <span>₹299 for Season Posters</span>
               <span className="w-1 h-1 rounded-full bg-gray-200" />
               <span>Permanent Privacy</span>
            </div>
          </div>
        </div>

        <div className="mt-40 pt-12 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-8 px-12">
           <div className="text-xs font-cinematic font-bold text-cooked-bg/20">WWT &copy; 2026</div>
           <div className="flex gap-8 text-[10px] uppercase tracking-widest font-vibe text-gray-300">
              <Link href="/privacy" className="hover:text-cooked-bg transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-cooked-bg transition-colors">Terms</Link>
              <Link href="/press" className="hover:text-cooked-bg transition-colors">Archive Press</Link>
           </div>
           <div className="text-[10px] font-data text-gray-300">Made for friend groups that don&apos;t hold back.</div>
        </div>
      </section>
    </div>
  );
}

function ArchetypeCard({ name, icon, desc }: { name: string; icon: string; desc: string }) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-gray-50/50 border border-gray-100/50 space-y-6 text-left hover:bg-white hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500 group">
      <div className="text-5xl grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-110 group-hover:-rotate-12 origin-left">
        {icon}
      </div>
      <div>
        <h3 className="font-vibe font-medium text-xl text-cooked-bg tracking-tight">{name}</h3>
        <p className="text-sm text-gray-500 font-data font-light leading-snug mt-2 opacity-80 group-hover:opacity-100 transition-opacity">
          {desc}
        </p>
      </div>
    </div>
  );
}
