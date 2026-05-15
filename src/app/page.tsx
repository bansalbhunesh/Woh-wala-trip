import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FilmGrain } from '@/components/ui/atoms';

export default async function LandingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) redirect('/trips');

  return (
    <div className="h-screen overflow-hidden bg-[#060604] text-[#F5F0E8] flex flex-col select-none">
      <FilmGrain />

      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[55vw] h-[55vw] rounded-full bg-cooked-accent/[0.07] blur-[160px] animate-float-a" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-chill-accent/[0.05] blur-[140px] animate-float-b" />
        <div className="absolute top-[40%] left-[40%] w-[30vw] h-[30vw] rounded-full bg-lore-accent/[0.04] blur-[120px] animate-float-c" />
      </div>

      {/* ── NAV ────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/[0.05]">
        <span className="font-cinematic italic text-cooked-accent text-lg tracking-tight">woh wala trip</span>
        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.35em] text-white/25 font-vibe font-black">
          <span className="w-1.5 h-1.5 rounded-full bg-cooked-accent animate-pulse" />
          Season 2026 · Archive Open
        </div>
        <Link
          href="/login"
          className="px-5 py-2 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-white/40 hover:bg-white/[0.06] hover:text-white hover:border-white/20 transition-all"
        >
          Enter →
        </Link>
      </nav>

      {/* ── MAIN GRID ──────────────────────────────────────── */}
      <div className="relative z-10 flex-1 grid grid-cols-[1fr_1.1fr] overflow-hidden">

        {/* LEFT — Title + CTA */}
        <div className="flex flex-col justify-center px-12 xl:px-16 py-6 gap-7">
          <div className="space-y-1">
            <p className="text-[9px] font-vibe font-black uppercase tracking-[0.45em] text-white/20 mb-4">
              AI Friendship Documentary
            </p>
            <h1 className="font-cinematic font-black tracking-tighter leading-[0.82] uppercase text-[#F5F0E8]"
                style={{ fontSize: 'clamp(52px, 8.5vw, 112px)' }}>
              Woh<br />Wala<br /><em className="italic text-cooked-accent not-italic">Trip</em>
            </h1>
          </div>

          <p className="text-sm text-white/35 max-w-[280px] font-cinematic italic leading-relaxed">
            "Your photo dumps become cinematic lore. Your friends become roasted archetypes."
          </p>

          <div className="flex gap-3 flex-wrap">
            <Link
              href="/login"
              className="flex items-center gap-2 px-7 py-3.5 bg-[#F5F0E8] text-black rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-glow-red"
            >
              Start the Lore
              <span className="text-base">→</span>
            </Link>
            <Link
              href="/trips/join"
              className="flex items-center gap-2 px-7 py-3.5 border border-white/10 bg-white/[0.03] text-white/40 rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/[0.07] hover:text-white/70 transition-all"
            >
              Join a Season
            </Link>
          </div>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {['AI Archetypes', 'Story Mode', 'Chaos Scores', 'Export Posters'].map((f) => (
              <span
                key={f}
                className="px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.07] text-[8.5px] uppercase tracking-widest text-white/25 font-vibe font-black"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT — Visual card collage */}
        <div className="relative overflow-hidden border-l border-white/[0.04]">

          {/* Chaos Source — large, center-left */}
          <div className="absolute top-[10%] left-[8%] w-[175px] p-5 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl rotate-[-4deg] shadow-2xl hover:rotate-[-2deg] transition-transform duration-700">
            <div className="text-3xl mb-3">⚡</div>
            <div className="text-[8px] uppercase tracking-widest text-white/35 font-vibe font-black mb-1">Chaos Source</div>
            <div className="text-4xl font-cinematic font-black text-cooked-accent leading-none">9/10</div>
            <div className="mt-2 text-[8px] text-white/20 font-cinematic italic leading-tight">
              "Started 3 incidents<br />before Day 2"
            </div>
          </div>

          {/* Cooked score badge — top-right */}
          <div className="absolute top-[8%] right-[10%] w-[130px] p-4 rounded-3xl border border-cooked-accent/25 bg-cooked-accent/[0.07] backdrop-blur-xl rotate-[5deg] hover:rotate-[3deg] transition-transform duration-700">
            <div className="text-[8px] uppercase tracking-widest text-cooked-accent/50 font-vibe font-black mb-1">Cooked Level</div>
            <div className="text-5xl font-cinematic font-black text-cooked-accent leading-none">84</div>
            <div className="mt-1 text-[8px] uppercase tracking-widest text-white/25 font-vibe">Historically</div>
            <div className="text-[8px] uppercase tracking-widest text-cooked-accent font-vibe font-black">Cooked.</div>
          </div>

          {/* Black Cat — mid left */}
          <div className="absolute top-[48%] left-[5%] w-[145px] p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rotate-[3deg] hover:rotate-[1deg] transition-transform duration-700">
            <div className="text-2xl mb-2">🐈‍⬛</div>
            <div className="text-[8px] uppercase tracking-widest text-white/30 font-vibe font-black">Black Cat</div>
            <div className="text-3xl font-cinematic font-black text-chill-accent">7/10</div>
            <div className="text-[7px] text-white/15 italic mt-1 font-cinematic">"Everyone's bad decisions somehow"</div>
          </div>

          {/* Trip Receipt — mid right */}
          <div className="absolute top-[42%] right-[7%] w-[155px] p-4 rounded-2xl border border-white/[0.08] bg-[#0E0E0C] rotate-[-2deg] hover:rotate-[0deg] transition-transform duration-700 shadow-xl">
            <div className="text-[8px] uppercase tracking-widest text-white/30 font-vibe font-black mb-3 pb-2 border-b border-white/[0.08]">Trip Receipt</div>
            <div className="space-y-1.5 font-mono text-[8px]">
              <div className="flex justify-between text-white/35"><span>Photos dumped</span><span className="text-white/50">247</span></div>
              <div className="flex justify-between text-white/35"><span>Incidents logged</span><span className="text-cooked-accent">11</span></div>
              <div className="flex justify-between text-white/35"><span>Stars given</span><span className="text-white/50">⭐ 3/5</span></div>
              <div className="flex justify-between text-white/35"><span>Group chaos %</span><span className="text-white/50">84%</span></div>
            </div>
            <div className="mt-3 pt-2 border-t border-white/[0.08] text-[8px] uppercase tracking-widest text-cooked-accent font-vibe font-black">
              VERDICT: COOKED ✓
            </div>
          </div>

          {/* Golden Retriever — bottom */}
          <div className="absolute bottom-[14%] left-[25%] w-[140px] p-4 rounded-2xl border border-unstable-accent/20 bg-unstable-accent/[0.05] rotate-[2deg] hover:rotate-[0deg] transition-transform duration-700">
            <div className="text-2xl mb-2">🐕</div>
            <div className="text-[8px] uppercase tracking-widest text-white/30 font-vibe font-black">Golden Retriever</div>
            <div className="text-3xl font-cinematic font-black text-unstable-accent">5/10</div>
          </div>

          {/* NPC Energy — bottom right */}
          <div className="absolute bottom-[10%] right-[6%] w-[130px] p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] rotate-[-3deg] hover:rotate-[-1deg] transition-transform duration-700">
            <div className="text-2xl mb-2">🧍</div>
            <div className="text-[8px] uppercase tracking-widest text-white/25 font-vibe font-black">NPC Energy</div>
            <div className="text-3xl font-cinematic font-black text-white/40">2/10</div>
            <div className="text-[7px] text-white/15 italic mt-1 font-cinematic">"Present, technically."</div>
          </div>

          {/* Case ID watermark */}
          <div className="absolute bottom-4 left-4 text-[8px] uppercase tracking-[0.35em] text-white/8 font-vibe font-black pointer-events-none">
            Case File · WWT-2026 · Classified
          </div>
        </div>
      </div>

      {/* ── TICKER ─────────────────────────────────────────── */}
      <div className="relative z-10 border-t border-white/[0.05] overflow-hidden py-2.5 bg-white/[0.01]">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center">
              {['Black Cat', 'Chaos Source', 'Emotional Support NPC', 'Main Character', 'Golden Retriever', 'Historically Cooked', 'Peak Delusion', 'The Villain Arc'].map((t) => (
                <span key={t} className="inline-flex items-center gap-4 px-6">
                  <span className="text-[9px] uppercase tracking-[0.35em] text-white/[0.13] font-vibe font-black">{t}</span>
                  <span className="w-1 h-1 rounded-full bg-cooked-accent/30 flex-shrink-0" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
