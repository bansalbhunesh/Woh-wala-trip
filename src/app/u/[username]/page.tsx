import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { FilmGrain } from '@/components/ui/atoms';
import Link from 'next/link';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const supabase = createSupabaseServiceClient();
  const { data: profile } = await supabase
    .from('public_profiles' as never).select('*')
    .eq('username' as never, username.toLowerCase()).single();
  if (!profile) return { title: 'Archive Not Found — Yaarlore' };
  const p = profile as any;
  return {
    title: `${p.display_name || p.username} (@${username}) — Yaarlore`,
    description: p.bio || `${p.display_name || username}'s friendship mythology archive on Yaarlore.`,
    openGraph: { title: `${p.display_name || p.username} on Yaarlore`, description: p.bio || 'Friendship mythology, documented.', type: 'profile' },
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: profile } = await supabase
    .from('public_profiles' as never).select('*')
    .eq('username' as never, username.toLowerCase()).single();

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#060604] flex flex-col items-center justify-center gap-6 px-6">
        <FilmGrain />
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
             style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)' }}>
          <span className="text-2xl font-cinematic font-black text-[#FF4D4D]">?</span>
        </div>
        <div className="text-center space-y-3 max-w-sm">
          <h1 className="text-3xl font-cinematic font-black text-[#F5F0E8] uppercase tracking-tighter">Archive not found</h1>
          <p className="text-sm font-data font-light text-white/35 italic leading-relaxed">
            This archive doesn&apos;t exist — yet. The mythology is still waiting to be written.
          </p>
        </div>
        <Link href="/" className="px-7 py-3.5 rounded-full text-[10px] font-vibe font-bold uppercase tracking-widest text-white/50 border border-white/10 hover:bg-white/5 transition-all">
          ← Return to Yaarlore
        </Link>
      </div>
    );
  }

  const p = profile as any;
  const { data: archetypeHistory } = await supabase
    .from('user_archetypes' as never).select('*')
    .eq('user_id' as never, p.id)
    .order('created_at' as never, { ascending: false });
  const history = (archetypeHistory || []) as any[];

  const allScores = history.map((h: any) => h.role_chaos_rating ?? 0).filter(Boolean);
  const avgChaos = allScores.length ? Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length) : 0;
  const peakChaos = allScores.length ? Math.max(...allScores) : 0;

  const archFreq: Record<string, number> = {};
  for (const h of history) {
    const key = h.role_archetype_tag || h.role_title || 'Unknown';
    archFreq[key] = (archFreq[key] || 0) + 1;
  }
  const recurringArchetype = Object.entries(archFreq).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="min-h-screen bg-[#060604] text-[#F5F0E8]">
      <FilmGrain />
      <div className="fixed inset-0 pointer-events-none z-0"
           style={{ background: 'radial-gradient(ellipse at 30% 0%, rgba(255,77,77,0.07) 0%, transparent 55%), radial-gradient(ellipse at 75% 80%, rgba(45,158,139,0.05) 0%, transparent 50%)' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-16 space-y-20">

        {/* Hero */}
        <section className="space-y-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, rgba(255,77,77,0.2), rgba(255,77,77,0.04))', border: '1.5px solid rgba(255,77,77,0.35)', boxShadow: '0 0 32px rgba(255,77,77,0.14)' }}>
              <span className="text-3xl font-cinematic font-black text-[#FF4D4D]">
                {((p.display_name || p.username || '?')[0]).toUpperCase()}
              </span>
            </div>
            <div className="space-y-1.5 pt-1">
              <h1 className="font-cinematic font-black tracking-tighter text-[#F5F0E8] uppercase leading-[0.88]"
                  style={{ fontSize: 'clamp(32px, 8vw, 56px)' }}>
                {p.display_name || p.username}
              </h1>
              <p className="text-sm font-data text-white/35">@{username}</p>
              {p.bio && <p className="text-sm font-data font-light text-white/50 italic leading-relaxed max-w-md pt-1">{p.bio}</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            {[
              { label: 'Trips', value: history.length.toString(), color: '#F5F0E8' },
              { label: 'Avg Chaos', value: avgChaos ? avgChaos.toString() : '—', color: avgChaos >= 80 ? '#FF4D4D' : avgChaos >= 55 ? '#D49E2D' : '#2D9E8B' },
              { label: 'Peak Chaos', value: peakChaos ? peakChaos.toString() : '—', color: '#FF4D4D' },
            ].map((stat, i) => (
              <div key={i} className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 font-vibe">{stat.label}</p>
                <p className="text-2xl font-vibe font-black tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recurring Identity */}
        {recurringArchetype && (
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-6 h-px rounded-full bg-[#2D9E8B]" />
              <p className="text-[10px] uppercase tracking-[0.45em] text-white/30 font-vibe">The Recurring Identity</p>
            </div>
            <div className="relative rounded-3xl p-8 overflow-hidden"
                 style={{ background: 'linear-gradient(135deg, rgba(255,77,77,0.08), rgba(255,77,77,0.02))', border: '1px solid rgba(255,77,77,0.18)' }}>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 font-cinematic font-black leading-none select-none pointer-events-none"
                   style={{ fontSize: '140px', color: 'rgba(255,77,77,0.04)' }}>
                {recurringArchetype[0].replace(/The\s+/i, '')[0]?.toUpperCase()}
              </div>
              <div className="relative z-10 space-y-4">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.35em] font-vibe mb-1" style={{ color: 'rgba(255,77,77,0.6)' }}>
                    Appears {recurringArchetype[1]}× across {history.length} trips
                  </p>
                  <h2 className="font-cinematic font-black uppercase tracking-tighter text-[#F5F0E8] leading-[0.88]"
                      style={{ fontSize: 'clamp(28px, 7vw, 48px)' }}>
                    {recurringArchetype[0]}
                  </h2>
                </div>
                {history[0]?.role_title && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                       style={{ background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.2)' }}>
                    <span className="text-xs font-vibe font-bold text-[#FF4D4D] uppercase tracking-wider">{history[0].role_title}</span>
                  </div>
                )}
                <p className="text-sm font-data font-light text-white/40 italic leading-relaxed max-w-md">
                  This character appears in {Math.round((recurringArchetype[1] / Math.max(history.length, 1)) * 100)}% of their trips. A signature presence in the archive.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Archive grid */}
        {history.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-6 h-px rounded-full bg-[#2D9E8B]" />
              <p className="text-[10px] uppercase tracking-[0.45em] text-white/30 font-vibe">The Archive</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {history.map((h: any, i: number) => {
                const score = h.role_chaos_rating ?? null;
                const color = score !== null ? (score >= 8 ? '#FF4D4D' : score >= 5 ? '#D49E2D' : '#2D9E8B') : '#2D9E8B';
                const title = h.role_title || h.role_archetype_tag || 'Unknown';
                const year = h.created_at ? new Date(h.created_at).getFullYear() : null;
                return (
                  <div key={i} className="relative rounded-2xl p-6 overflow-hidden space-y-4 transition-all hover:scale-[1.01]"
                       style={{ background: 'rgba(14,14,12,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="absolute right-4 bottom-4 font-cinematic font-black leading-none select-none pointer-events-none"
                         style={{ fontSize: '80px', color: `${color}07` }}>
                      {title.replace(/The\s+/i, '')[0]?.toUpperCase()}
                    </div>
                    <p className="text-[9px] uppercase tracking-[0.35em] text-white/25 font-vibe truncate">{h.trip_name || 'Untitled Trip'}</p>
                    <h3 className="font-cinematic font-black tracking-tighter text-[#F5F0E8] uppercase leading-[0.9] relative z-10"
                        style={{ fontSize: 'clamp(18px, 5vw, 24px)' }}>
                      {title}
                    </h3>
                    {score !== null && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                           style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                        <span className="text-[10px] font-vibe font-bold uppercase tracking-wider" style={{ color }}>
                          Chaos {score}/10
                        </span>
                      </div>
                    )}
                    {year && <p className="text-[9px] font-data text-white/20 uppercase tracking-wider">{year}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <footer className="border-t border-white/6 pt-10 flex items-center justify-between">
          <Link href="/" className="text-[10px] uppercase tracking-widest font-vibe text-white/25 hover:text-white/50 transition-colors">← Yaarlore</Link>
          <p className="text-[9px] font-data text-white/15 italic">Archive rendered by Lore Pipeline</p>
        </footer>
      </div>
    </div>
  );
}
