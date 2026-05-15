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
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 flex-shrink-0"
           style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="font-display italic font-black text-base tracking-tight"
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
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] overflow-hidden min-h-0">

        {/* LEFT — bleeding oversized type */}
        <div className="relative flex flex-col justify-between py-8 overflow-hidden"
             style={{ borderRight: '1px solid var(--border)' }}>

          {/* Huge bleeding title — crops at edges intentionally */}
          <div className="absolute inset-0 flex flex-col justify-center pl-6 pointer-events-none select-none"
               style={{ marginTop: '-2%' }}>
            {['WOH', 'WALA', 'TRIP'].map((word, i) => (
              <div
                key={word}
                className="font-display font-black uppercase leading-[0.82] tracking-[-0.03em] animate-fade-in opacity-0"
                style={{
                  fontSize: 'clamp(80px, 14vw, 175px)',
                  color: i === 2 ? 'var(--accent)' : 'var(--text)',
                  fontStyle: i === 2 ? 'italic' : 'normal',
                  /* bleed: shift each line progressively right so last letter clips right edge */
                  marginLeft: i === 0 ? '-0.04em' : i === 1 ? '0.02em' : '0.06em',
                  animationDelay: `${i * 0.12}s`,
                  animationFillMode: 'forwards',
                }}
              >
                {word}
              </div>
            ))}
          </div>

          {/* Bottom — tagline + CTAs */}
          <div className="relative z-10 mt-auto px-6 pb-0 space-y-5">
            <p className="text-sm font-display italic leading-relaxed max-w-[260px]"
               style={{ color: 'var(--text-muted)' }}>
              "Your photo dumps become cinematic lore. Your friends become documented archetypes."
            </p>

            <div className="flex gap-3 flex-wrap">
              <Link href="/login"
                    className="flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-ui font-black uppercase tracking-[0.25em] transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'var(--text)', color: 'var(--bg)' }}>
                Start the Lore <span>→</span>
              </Link>
              <Link href="/trips/join"
                    className="flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-ui font-black uppercase tracking-[0.25em] transition-all hover:opacity-80"
                    style={{ border: '1.5px solid var(--border)', color: 'var(--text-muted)' }}>
                Join a Season
              </Link>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {['AI Archetypes', 'Story Mode', 'Chaos Scores', 'Season Posters'].map(f => (
                <span key={f} className="px-3 py-1 rounded-full text-[8px] font-ui font-bold uppercase tracking-widest"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — varied-scale floating card collage */}
        <div className="relative overflow-hidden hidden lg:block">

          {/* Ambient blobs */}
          <div className="absolute top-[-20%] right-[-10%] w-[55%] h-[55%] rounded-full opacity-25 animate-float-a pointer-events-none"
               style={{ background: 'oklch(88% 0.06 40)' }} />
          <div className="absolute bottom-[-15%] left-[-5%] w-[45%] h-[45%] rounded-full opacity-20 animate-float-b pointer-events-none"
               style={{ background: 'oklch(85% 0.06 180)' }} />

          {/* ── HERO card — Chaos Source, large ── */}
          <div className="absolute top-[6%] left-[8%] w-[210px] p-6 rounded-3xl rotate-[-4deg] shadow-card-hover animate-card-in opacity-0"
               style={{ background: 'oklch(60% 0.22 25)', '--r': '-4deg', animationDelay: '0.08s', animationFillMode: 'forwards' } as React.CSSProperties}>
            <div className="text-4xl mb-4">⚡</div>
            <div className="text-[8px] font-ui font-bold uppercase tracking-widest mb-1 opacity-70" style={{ color: 'oklch(97% 0.005 25)' }}>Chaos Source</div>
            <div className="font-display font-black leading-none mb-2" style={{ fontSize: 52, color: 'oklch(97% 0.005 25)' }}>9/10</div>
            <div className="text-[8px] font-display italic leading-snug opacity-55" style={{ color: 'oklch(97% 0.005 25)' }}>
              "Started 3 incidents<br />before Day 2"
            </div>
          </div>

          {/* ── Cooked score — medium, amber, top-right ── */}
          <div className="absolute top-[5%] right-[6%] w-[118px] p-4 rounded-3xl rotate-[6deg] animate-card-in opacity-0"
               style={{ background: 'oklch(70% 0.12 85)', '--r': '6deg', animationDelay: '0.20s', animationFillMode: 'forwards', boxShadow: '0 12px 40px rgba(0,0,0,0.10)' } as React.CSSProperties}>
            <div className="text-[8px] font-ui font-bold uppercase tracking-widest opacity-60 mb-1" style={{ color: 'oklch(20% 0.03 60)' }}>Cooked</div>
            <div className="font-display font-black leading-none" style={{ fontSize: 44, color: 'oklch(20% 0.03 60)' }}>84</div>
            <div className="text-[7px] font-ui font-bold uppercase tracking-widest leading-tight mt-1 opacity-55" style={{ color: 'oklch(20% 0.03 60)' }}>Historically<br />Cooked.</div>
          </div>

          {/* ── Black Cat — small, teal, mid-left ── */}
          <div className="absolute top-[50%] left-[4%] w-[128px] p-4 rounded-2xl rotate-[3deg] animate-card-in opacity-0"
               style={{ background: 'oklch(65% 0.12 180)', '--r': '3deg', animationDelay: '0.32s', animationFillMode: 'forwards', boxShadow: '0 8px 24px rgba(0,0,0,0.10)' } as React.CSSProperties}>
            <div className="text-2xl mb-2">🐈‍⬛</div>
            <div className="text-[7px] font-ui font-bold uppercase tracking-widest opacity-70" style={{ color: 'oklch(97% 0.005 180)' }}>Black Cat</div>
            <div className="font-display font-black text-3xl" style={{ color: 'oklch(97% 0.005 180)' }}>7/10</div>
          </div>

          {/* ── Trip Receipt — medium, cream paper, right-center ── */}
          <div className="absolute top-[38%] right-[5%] w-[165px] p-4 rounded-2xl rotate-[-3deg] animate-card-in opacity-0"
               style={{ background: 'oklch(97% 0.008 70)', border: '1px solid var(--border)', '--r': '-3deg', animationDelay: '0.44s', animationFillMode: 'forwards', boxShadow: '0 12px 32px rgba(0,0,0,0.08)' } as React.CSSProperties}>
            <div className="text-[8px] font-ui font-bold uppercase tracking-widest mb-3 pb-2"
                 style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Trip Receipt</div>
            <div className="space-y-1.5 font-mono text-[8px]">
              {[['Photos', '247'], ['Incidents', '11'], ['Stars', '⭐ 3/5'], ['Chaos %', '84%']].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ color: k === 'Incidents' ? 'var(--accent)' : 'var(--text)' }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2 text-[7.5px] font-ui font-black uppercase tracking-widest"
                 style={{ borderTop: '1px solid var(--border)', color: 'var(--accent)' }}>
              VERDICT: COOKED ✓
            </div>
          </div>

          {/* ── Golden Retriever — small, warm yellow, bottom-center ── */}
          <div className="absolute bottom-[18%] left-[28%] w-[120px] p-4 rounded-2xl rotate-[2deg] animate-card-in opacity-0"
               style={{ background: 'oklch(92% 0.08 90)', '--r': '2deg', animationDelay: '0.56s', animationFillMode: 'forwards', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' } as React.CSSProperties}>
            <div className="text-2xl mb-1.5">🐕</div>
            <div className="text-[7px] font-ui font-bold uppercase tracking-widest opacity-70" style={{ color: 'oklch(30% 0.04 80)' }}>Golden Ret.</div>
            <div className="font-display font-black text-2xl" style={{ color: 'oklch(30% 0.04 80)' }}>5/10</div>
          </div>

          {/* ── NPC Energy — tiny, lavender, bottom-right ── */}
          <div className="absolute bottom-[10%] right-[7%] w-[112px] p-3.5 rounded-2xl rotate-[-4deg] animate-card-in opacity-0"
               style={{ background: 'oklch(88% 0.06 280)', '--r': '-4deg', animationDelay: '0.68s', animationFillMode: 'forwards', boxShadow: '0 8px 24px rgba(0,0,0,0.07)' } as React.CSSProperties}>
            <div className="text-2xl mb-1.5">🧍</div>
            <div className="text-[7px] font-ui font-bold uppercase tracking-widest opacity-70" style={{ color: 'oklch(30% 0.05 280)' }}>NPC Energy</div>
            <div className="font-display font-black text-2xl" style={{ color: 'oklch(30% 0.05 280)' }}>2/10</div>
            <div className="text-[6.5px] font-display italic opacity-40 mt-1" style={{ color: 'oklch(30% 0.05 280)' }}>"Present, technically."</div>
          </div>

          {/* ── Main Character — extra small, green, upper-mid ── */}
          <div className="absolute top-[32%] left-[42%] w-[96px] p-3 rounded-xl rotate-[-2deg] animate-card-in opacity-0"
               style={{ background: 'oklch(88% 0.08 155)', '--r': '-2deg', animationDelay: '0.80s', animationFillMode: 'forwards', boxShadow: '0 6px 20px rgba(0,0,0,0.07)' } as React.CSSProperties}>
            <div className="text-xl mb-1">🌟</div>
            <div className="text-[6.5px] font-ui font-bold uppercase tracking-widest opacity-70" style={{ color: 'oklch(25% 0.04 155)' }}>Main Char.</div>
            <div className="font-display font-black text-xl" style={{ color: 'oklch(25% 0.04 155)' }}>6/10</div>
          </div>

          {/* Case stamp */}
          <div className="absolute bottom-3 left-4 text-[7.5px] font-ui font-bold uppercase tracking-[0.3em] pointer-events-none"
               style={{ color: 'oklch(72% 0.015 65)' }}>
            Case File · WWT-2026
          </div>
        </div>
      </div>

      {/* ── TICKER ──────────────────────────────────────────── */}
      <div className="relative z-10 overflow-hidden py-2.5 flex-shrink-0"
           style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center">
              {['Black Cat', 'Chaos Source', 'Emotional Support NPC', 'Main Character', 'Golden Retriever', 'Historically Cooked', 'Peak Delusion', 'The Villain Arc'].map(t => (
                <span key={t} className="inline-flex items-center gap-4 px-6">
                  <span className="text-[9px] font-ui font-bold uppercase tracking-[0.3em]"
                        style={{ color: 'var(--text-muted)', opacity: 0.45 }}>{t}</span>
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--accent)', opacity: 0.35 }} />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
