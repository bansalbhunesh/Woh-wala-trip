import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function LandingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) redirect('/trips');

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: 'var(--bg)' }}>
      <div className="light-grain" />

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-7 py-4"
           style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="font-display italic font-black text-lg tracking-tight"
              style={{ color: 'var(--accent)' }}>
          woh wala trip
        </span>
        <div className="flex items-center gap-2 text-[9px] font-ui font-bold uppercase tracking-[0.3em]"
             style={{ color: 'var(--text-muted)' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
          Season 2026 · Archive Open
        </div>
        <Link href="/login"
              className="px-5 py-2 rounded-full text-[9px] font-ui font-bold uppercase tracking-widest transition-all hover:scale-105"
              style={{ background: 'var(--text)', color: 'var(--bg)' }}>
          Enter →
        </Link>
      </nav>

      {/* ── MAIN ────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] min-h-0">

        {/* LEFT — editorial text + CTA */}
        <div className="flex flex-col justify-center px-10 xl:px-16 py-6 gap-7">
          <p className="text-[9px] font-ui font-bold uppercase tracking-[0.45em]"
             style={{ color: 'var(--text-muted)' }}>
            AI Friendship Documentary
          </p>

          <h1 className="font-display font-black tracking-tighter leading-[0.82] uppercase"
              style={{ fontSize: 'clamp(48px, 8vw, 108px)', color: 'var(--text)' }}>
            Woh<br />Wala<br />
            <em className="italic not-italic" style={{ color: 'var(--accent)' }}>Trip</em>
          </h1>

          <p className="text-sm font-display italic leading-relaxed max-w-[280px]"
             style={{ color: 'var(--text-muted)' }}>
            "Your photo dumps become cinematic lore. Your friends become documented archetypes."
          </p>

          <div className="flex gap-3 flex-wrap">
            <Link href="/login"
                  className="flex items-center gap-2 px-7 py-3.5 rounded-full text-[10px] font-ui font-black uppercase tracking-[0.25em] transition-all hover:scale-105 active:scale-95"
                  style={{ background: 'var(--text)', color: 'var(--bg)' }}>
              Start the Lore <span className="text-base">→</span>
            </Link>
            <Link href="/trips/join"
                  className="flex items-center gap-2 px-7 py-3.5 rounded-full text-[10px] font-ui font-black uppercase tracking-[0.25em] transition-all hover:opacity-80"
                  style={{ border: '1.5px solid var(--border)', color: 'var(--text-muted)' }}>
              Join a Season
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {['AI Archetypes', 'Story Mode', 'Chaos Scores', 'Season Posters'].map(f => (
              <span key={f} className="px-3.5 py-1.5 rounded-full text-[8.5px] font-ui font-bold uppercase tracking-widest"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT — vivid floating card collage */}
        <div className="relative overflow-hidden hidden lg:block"
             style={{ borderLeft: '1px solid var(--border)' }}>

          {/* Background blobs */}
          <div className="absolute top-[-20%] right-[-10%] w-[55%] h-[55%] rounded-full opacity-30 animate-float-a pointer-events-none"
               style={{ background: 'oklch(88% 0.06 40)' }} />
          <div className="absolute bottom-[-15%] left-[-5%] w-[45%] h-[45%] rounded-full opacity-25 animate-float-b pointer-events-none"
               style={{ background: 'oklch(85% 0.06 180)' }} />

          {/* Chaos Source — large, coral */}
          <div className="absolute top-[8%] left-[10%] w-[175px] p-5 rounded-3xl rotate-[-4deg] shadow-card animate-card-in opacity-0"
               style={{ background: 'oklch(60% 0.22 25)', '--r': '-4deg', animationDelay: '0.1s', animationFillMode: 'forwards' } as React.CSSProperties}>
            <div className="text-3xl mb-3">⚡</div>
            <div className="text-[8px] font-ui font-bold uppercase tracking-widest mb-1 opacity-70" style={{ color: 'oklch(97% 0.005 25)' }}>Chaos Source</div>
            <div className="text-4xl font-display font-black leading-none" style={{ color: 'oklch(97% 0.005 25)' }}>9/10</div>
            <div className="mt-2 text-[8px] font-display italic leading-tight opacity-60" style={{ color: 'oklch(97% 0.005 25)' }}>
              "Started 3 incidents<br />before Day 2"
            </div>
          </div>

          {/* Cooked score — amber */}
          <div className="absolute top-[7%] right-[9%] w-[132px] p-4 rounded-3xl rotate-[5deg] shadow-card animate-card-in opacity-0"
               style={{ background: 'oklch(70% 0.12 85)', '--r': '5deg', animationDelay: '0.22s', animationFillMode: 'forwards' } as React.CSSProperties}>
            <div className="text-[8px] font-ui font-bold uppercase tracking-widest mb-1 opacity-70" style={{ color: 'oklch(20% 0.03 60)' }}>Cooked Level</div>
            <div className="text-5xl font-display font-black leading-none" style={{ color: 'oklch(20% 0.03 60)' }}>84</div>
            <div className="mt-1 text-[8px] font-ui font-bold uppercase tracking-widest opacity-60" style={{ color: 'oklch(20% 0.03 60)' }}>Historically</div>
            <div className="text-[8px] font-ui font-black uppercase tracking-widest" style={{ color: 'oklch(20% 0.03 60)' }}>Cooked.</div>
          </div>

          {/* Black Cat — teal */}
          <div className="absolute top-[48%] left-[5%] w-[148px] p-4 rounded-2xl rotate-[3deg] shadow-card animate-card-in opacity-0"
               style={{ background: 'oklch(65% 0.12 180)', '--r': '3deg', animationDelay: '0.34s', animationFillMode: 'forwards' } as React.CSSProperties}>
            <div className="text-2xl mb-2">🐈‍⬛</div>
            <div className="text-[8px] font-ui font-bold uppercase tracking-widest opacity-70" style={{ color: 'oklch(97% 0.005 180)' }}>Black Cat</div>
            <div className="text-3xl font-display font-black" style={{ color: 'oklch(97% 0.005 180)' }}>7/10</div>
            <div className="text-[7px] font-display italic opacity-50 mt-1 leading-tight" style={{ color: 'oklch(97% 0.005 180)' }}>"Everyone's chaos somehow"</div>
          </div>

          {/* Trip Receipt — cream paper */}
          <div className="absolute top-[42%] right-[7%] w-[158px] p-4 rounded-2xl rotate-[-2deg] animate-card-in opacity-0"
               style={{ background: 'oklch(97% 0.008 70)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', '--r': '-2deg', animationDelay: '0.46s', animationFillMode: 'forwards' } as React.CSSProperties}>
            <div className="text-[8px] font-ui font-bold uppercase tracking-widest mb-3 pb-2"
                 style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Trip Receipt</div>
            <div className="space-y-1.5 font-mono text-[8px]">
              {[['Photos dumped','247'],['Incidents logged','11'],['Stars given','⭐ 3/5'],['Group chaos','84%']].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ color: k === 'Incidents logged' ? 'var(--accent)' : 'var(--text)' }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2 text-[8px] font-ui font-black uppercase tracking-widest"
                 style={{ borderTop: '1px solid var(--border)', color: 'var(--accent)' }}>
              VERDICT: COOKED ✓
            </div>
          </div>

          {/* Golden Retriever — warm yellow */}
          <div className="absolute bottom-[16%] left-[25%] w-[142px] p-4 rounded-2xl rotate-[2deg] shadow-card animate-card-in opacity-0"
               style={{ background: 'oklch(92% 0.08 90)', '--r': '2deg', animationDelay: '0.58s', animationFillMode: 'forwards' } as React.CSSProperties}>
            <div className="text-2xl mb-2">🐕</div>
            <div className="text-[8px] font-ui font-bold uppercase tracking-widest opacity-70" style={{ color: 'oklch(30% 0.04 80)' }}>Golden Retriever</div>
            <div className="text-3xl font-display font-black" style={{ color: 'oklch(30% 0.04 80)' }}>5/10</div>
          </div>

          {/* NPC Energy — lavender */}
          <div className="absolute bottom-[9%] right-[7%] w-[132px] p-4 rounded-2xl rotate-[-3deg] shadow-card animate-card-in opacity-0"
               style={{ background: 'oklch(88% 0.06 280)', '--r': '-3deg', animationDelay: '0.70s', animationFillMode: 'forwards' } as React.CSSProperties}>
            <div className="text-2xl mb-2">🧍</div>
            <div className="text-[8px] font-ui font-bold uppercase tracking-widest opacity-70" style={{ color: 'oklch(30% 0.05 280)' }}>NPC Energy</div>
            <div className="text-3xl font-display font-black" style={{ color: 'oklch(30% 0.05 280)' }}>2/10</div>
            <div className="text-[7px] font-display italic opacity-50 mt-1" style={{ color: 'oklch(30% 0.05 280)' }}>"Present, technically."</div>
          </div>

          {/* Case stamp */}
          <div className="absolute bottom-4 left-4 text-[8px] font-ui font-bold uppercase tracking-[0.3em] pointer-events-none"
               style={{ color: 'oklch(70% 0.015 65)' }}>
            Case File · WWT-2026
          </div>
        </div>
      </div>

      {/* ── TICKER ──────────────────────────────────────────── */}
      <div className="relative z-10 overflow-hidden py-2.5"
           style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center">
              {['Black Cat', 'Chaos Source', 'Emotional Support NPC', 'Main Character', 'Golden Retriever', 'Historically Cooked', 'Peak Delusion', 'The Villain Arc'].map(t => (
                <span key={t} className="inline-flex items-center gap-4 px-6">
                  <span className="text-[9px] font-ui font-bold uppercase tracking-[0.3em]"
                        style={{ color: 'var(--text-muted)', opacity: 0.5 }}>{t}</span>
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--accent)', opacity: 0.4 }} />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
