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
      <section className="relative h-[90vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-100 via-white to-white opacity-50" />
        
        <div className="relative z-10 space-y-6 max-w-3xl">
          <div className="inline-block px-4 py-1.5 rounded-full bg-black text-white text-[10px] uppercase tracking-[0.2em] font-medium mb-4 animate-fade-in">
            Your friendships, narrated.
          </div>
          <h1 className="text-6xl md:text-8xl font-medium tracking-tight leading-[0.9] animate-slide-up">
            Woh Wala <br /> <span className="italic">Trip</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 max-w-xl mx-auto font-light leading-relaxed animate-slide-up delay-100">
            Turn your messy group photo dumps into cinematic lore, friendship archetypes, and seasonal recaps.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 animate-slide-up delay-200">
            <Link
              href="/login"
              className="px-10 py-5 bg-black text-white rounded-full text-base font-medium hover:scale-105 transition-transform"
            >
              Start the lore
            </Link>
            <Link
              href="#demo"
              className="px-10 py-5 border border-gray-200 rounded-full text-base font-medium hover:bg-gray-50 transition-colors"
            >
              See an example
            </Link>
          </div>
        </div>

        {/* Decorative "Season Poster" feel */}
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[120%] h-64 bg-gradient-to-t from-white via-white/80 to-transparent z-20" />
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
                <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <p className="text-xs uppercase tracking-widest text-gray-400">Latest Lore: The Delusion Arc</p>
                  <p className="text-xl italic font-serif">
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

      {/* Who are you? Archetypes */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto text-center space-y-20">
          <h2 className="text-4xl md:text-6xl font-medium tracking-tight">Who are you in the group?</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ArchetypeCard name="Black Cat" icon="🐈‍⬛" desc="Main character energy, minimal photos." />
            <ArchetypeCard name="Golden Retriever" icon="🐕" desc="Happy to be there, 400 blurry selfies." />
            <ArchetypeCard name="Support NPC" icon="🧍" desc="Present in every background, saying nothing." />
            <ArchetypeCard name="Chaos Source" icon="⚡" desc="The reason the trip was historically cooked." />
          </div>
        </div>
      </section>

      {/* Footer / CTA */}
      <section className="py-40 px-6 text-center bg-black text-white">
        <div className="max-w-3xl mx-auto space-y-10">
          <h2 className="text-5xl md:text-7xl font-medium tracking-tight italic">
            Stop being boring. <br /> Start the lore.
          </h2>
          <Link
            href="/login"
            className="inline-block px-12 py-6 bg-white text-black rounded-full text-lg font-medium hover:invert transition-all"
          >
            Create your trip archive
          </Link>
          <p className="text-gray-500 text-sm font-light">
            Free for basic lore. ₹299 for the permanent Season Poster.
          </p>
        </div>
      </section>
    </div>
  );
}

function ArchetypeCard({ name, icon, desc }: { name: string; icon: string; desc: string }) {
  return (
    <div className="p-8 rounded-[2rem] bg-gray-50 border border-gray-100 space-y-4 text-left hover:bg-white hover:shadow-xl transition-all group">
      <div className="text-4xl grayscale group-hover:grayscale-0 transition-all">{icon}</div>
      <div>
        <h3 className="font-medium text-lg">{name}</h3>
        <p className="text-sm text-gray-500 font-light leading-snug mt-1">{desc}</p>
      </div>
    </div>
  );
}
