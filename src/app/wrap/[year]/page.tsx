'use client';

import { use, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FilmGrain } from '@/components/ui/atoms';
import { trpc } from '@/lib/trpc/client';

function ChaosBar({ score, label, delay = 0 }: { score: number; label: string; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth(score), 80 + delay); return () => clearTimeout(t); }, [score, delay]);
  const color = score >= 80 ? '#FF4D4D' : score >= 55 ? '#D49E2D' : '#2D9E8B';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-vibe uppercase tracking-wider text-white/50 truncate max-w-[160px]">{label}</span>
        <span className="text-[11px] font-vibe font-bold tabular-nums" style={{ color }}>{score}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color, transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
    </div>
  );
}

export default function YearWrapPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = use(params);
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<'forward' | 'backward'>('forward');
  const [animKey, setAnimKey] = useState(0);
  const touchStart = useRef<number | null>(null);

  const { data: history, isLoading } = trpc.archetypes.getHistory.useQuery();
  const trips = ((history || []) as any[]).filter((h) => h.trip_year === Number(year));
  const allArchCounts: Record<string, number> = {};
  (history || []).forEach((h: any) => {
    const k = h.role_archetype_tag || h.role_title || 'Unknown';
    allArchCounts[k] = (allArchCounts[k] || 0) + 1;
  });
  const topArch = Object.entries(allArchCounts).sort(([, a], [, b]) => b - a)[0];
  const peakTrip = trips.length ? trips.reduce((a, b) => a.role_chaos_rating > b.role_chaos_rating ? a : b) : null;
  const avgChaos = trips.length ? Math.round(trips.reduce((s, t) => s + t.role_chaos_rating, 0) / trips.length) : 0;

  const slides = ['intro', 'trips_count', 'top_archetype', 'chaos_evolution', ...(peakTrip ? ['peak_moment'] : []), 'verdict'];
  const advance = () => { if (idx >= slides.length - 1) return; setDir('forward'); setAnimKey(k => k + 1); setIdx(i => i + 1); };
  const retreat = () => { if (idx <= 0) return; setDir('backward'); setAnimKey(k => k + 1); setIdx(i => i - 1); };
  const handleTap = (e: React.MouseEvent) => { if (e.clientX < window.innerWidth * 0.33) retreat(); else advance(); };
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 80) dx < 0 ? advance() : retreat();
    touchStart.current = null;
  };

  const current = slides[idx];
  const slideAnim = dir === 'forward' ? 'wrap-in-right' : 'wrap-in-left';
  const glow = current === 'verdict' ? '#2D9E8B' : current === 'chaos_evolution' ? '#D49E2D' : '#FF4D4D';

  return (
    <div className="fixed inset-0 bg-[#060604] overflow-hidden select-none"
         onClick={handleTap} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <FilmGrain />
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: `radial-gradient(ellipse at 50% 40%, ${glow}10 0%, transparent 65%)`, transition: 'background 1.2s cubic-bezier(0.16,1,0.3,1)' }} />

      {/* Progress */}
      <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 px-4 pt-3">
        {slides.map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full transition-all duration-400"
                 style={{ width: i < idx ? '100%' : i === idx ? '50%' : '0%', background: 'rgba(255,255,255,0.6)' }} />
          </div>
        ))}
      </div>

      <div className="absolute top-6 left-4 z-50 flex items-center gap-1.5 px-3 py-1 rounded-full text-[7.5px] font-mono uppercase tracking-wider"
           style={{ background: 'rgba(45,158,139,0.12)', border: '1px solid rgba(45,158,139,0.28)', color: 'rgba(45,158,139,0.85)' }}>
        ✦ YAARLORE WRAP
      </div>
      <button onClick={e => { e.stopPropagation(); router.push('/trips'); }}
              className="absolute top-6 right-4 z-50 text-white/35 text-xs font-vibe uppercase tracking-wider hover:text-white/60 transition-colors">
        ← Archive
      </button>

      <div key={animKey} className="absolute inset-0 flex items-center justify-center px-8 py-20"
           style={{ animation: `${slideAnim} 0.6s cubic-bezier(0.16,1,0.3,1) both` }}>

        {current === 'intro' && (
          <div className="text-center space-y-8 max-w-sm" style={{ animation: 'wrap-rise 0.75s cubic-bezier(0.16,1,0.3,1) 0.05s both' }}>
            <p className="text-[10px] uppercase tracking-[0.5em] text-white/30 font-vibe" style={{ animation: 'wrap-rise 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both', opacity: 0 }}>Yaarlore</p>
            <h1 className="font-cinematic font-black uppercase leading-[0.82] tracking-tighter text-[#F5F0E8]"
                style={{ fontSize: 'clamp(64px, 18vw, 120px)', animation: 'wrap-rise 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both', opacity: 0 }}>
              YOUR <span style={{ color: '#FF4D4D' }}>{year}</span><br />IN CHAOS
            </h1>
            {isLoading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 rounded-full border border-white/20 border-t-white/60 animate-spin" />
              </div>
            ) : (
              <p className="text-base font-data font-light text-white/40 italic">
                {trips.length > 0 ? `${trips.length} trips. Avg chaos: ${avgChaos}. Documented.` : `No trips archived for ${year} yet.`}
              </p>
            )}
          </div>
        )}

        {current === 'trips_count' && (
          <div className="text-center space-y-10 max-w-sm" style={{ animation: 'wrap-rise 0.65s cubic-bezier(0.16,1,0.3,1) both' }}>
            <p className="text-[10px] uppercase tracking-[0.5em] text-white/30 font-vibe">In {year} You Went</p>
            <div className="font-vibe font-black leading-none tracking-tighter"
                 style={{ fontSize: 'clamp(110px, 24vw, 200px)', color: '#FF4D4D', animation: 'score-slam 0.55s cubic-bezier(0.16,1,0.3,1) 0.1s both' }}>
              {trips.length || '—'}
            </div>
            <p className="text-xl font-vibe font-bold uppercase tracking-widest text-white/80"
               style={{ animation: 'wrap-rise 0.5s ease 0.4s both', opacity: 0 }}>
              TRIPS THIS YEAR
            </p>
            <ul className="space-y-2" style={{ animation: 'wrap-rise 0.5s ease 0.65s both', opacity: 0 }}>
              {trips.map((t: any, i: number) => {
                const c = t.role_chaos_rating >= 80 ? '#FF4D4D' : t.role_chaos_rating >= 55 ? '#D49E2D' : '#2D9E8B';
                return (
                  <li key={i} className="text-sm font-data font-light text-white/45 flex items-center justify-between gap-4">
                    <span className="truncate">{t.trip_name}</span>
                    <span className="text-[10px] font-vibe font-bold flex-shrink-0" style={{ color: c }}>{t.role_chaos_rating}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {current === 'top_archetype' && topArch && (
          <div className="text-center space-y-8 max-w-sm" style={{ animation: 'card-flip 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s both' }}>
            <p className="text-[10px] uppercase tracking-[0.5em] text-white/30 font-vibe">Your Recurring Identity</p>
            <div className="w-28 h-28 rounded-full flex items-center justify-center mx-auto"
                 style={{ background: 'linear-gradient(135deg, rgba(255,77,77,0.2), rgba(255,77,77,0.05))', border: '1.5px solid rgba(255,77,77,0.4)', boxShadow: '0 0 40px rgba(255,77,77,0.18)' }}>
              <span className="text-4xl font-cinematic font-black text-[#FF4D4D]">
                {topArch[0].replace(/The\s+/i, '')[0]?.toUpperCase()}
              </span>
            </div>
            <h2 className="font-cinematic font-black tracking-tighter text-[#F5F0E8] uppercase leading-[0.88]"
                style={{ fontSize: 'clamp(36px, 10vw, 56px)' }}>
              {topArch[0]}
            </h2>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full"
                 style={{ background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.2)' }}>
              <span className="text-xs font-vibe font-bold text-[#FF4D4D] uppercase tracking-wider">
                Appeared {topArch[1]}× in your archive
              </span>
            </div>
          </div>
        )}

        {current === 'chaos_evolution' && (
          <div className="space-y-10 max-w-sm w-full" style={{ animation: 'wrap-rise 0.65s cubic-bezier(0.16,1,0.3,1) both' }}>
            <div>
              <p className="text-[10px] uppercase tracking-[0.5em] text-white/30 font-vibe mb-2">Your Season Arc</p>
              <h2 className="font-cinematic font-black uppercase tracking-tighter text-[#F5F0E8] leading-[0.88]"
                  style={{ fontSize: 'clamp(40px, 10vw, 58px)' }}>
                CHAOS<br />TIMELINE
              </h2>
            </div>
            <div className="space-y-4">
              {trips.map((t: any, i: number) => (
                <ChaosBar key={i} score={t.role_chaos_rating} label={t.trip_name} delay={i * 120} />
              ))}
            </div>
          </div>
        )}

        {current === 'peak_moment' && peakTrip && (
          <div className="text-center space-y-8 max-w-sm" style={{ animation: 'wrap-rise 0.65s cubic-bezier(0.16,1,0.3,1) both' }}>
            <p className="text-[10px] uppercase tracking-[0.5em] text-white/30 font-vibe">Peak Chaos Achieved</p>
            <div className="font-vibe font-black leading-none tracking-tighter"
                 style={{ fontSize: 'clamp(90px, 20vw, 160px)', color: '#FF4D4D', textShadow: '0 0 50px rgba(255,77,77,0.3)', animation: 'score-slam 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both' }}>
              {peakTrip.role_chaos_rating}
            </div>
            <h2 className="font-cinematic font-black uppercase tracking-tighter text-[#F5F0E8] leading-[0.88]"
                style={{ fontSize: 'clamp(28px, 8vw, 46px)' }}>
              {peakTrip.trip_name}
            </h2>
          </div>
        )}

        {current === 'verdict' && (
          <div className="text-center space-y-10 max-w-sm">
            <div className="w-10 h-0.5 mx-auto rounded-full bg-[#2D9E8B]" />
            <p className="font-cinematic italic text-white/85 leading-relaxed"
               style={{ fontSize: 'clamp(20px, 5vw, 28px)', animation: 'wrap-rise 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s both', opacity: 0 }}>
              &ldquo;{year}{' '}was the year the mythology solidified. The archive remembers everything.&rdquo;
            </p>
            <div className="w-10 h-0.5 mx-auto rounded-full bg-[#2D9E8B]"
                 style={{ animation: 'fade-in 0.4s ease 0.5s both', opacity: 0 }} />
            <div className="space-y-3" style={{ animation: 'wrap-rise 0.5s ease 0.7s both', opacity: 0 }}>
              <button
                onClick={e => { e.stopPropagation(); if (navigator.share) navigator.share({ title: `My ${year} Yaarlore Wrap`, url: window.location.href }).catch(() => {}); }}
                className="w-full py-5 bg-[#F5F0E8] text-[#060604] rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl">
                Share Your {year} Wrap
              </button>
            </div>
          </div>
        )}
      </div>

      {idx === 0 && !isLoading && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-between px-8 pointer-events-none">
          <span className="text-white/45 text-xs font-vibe uppercase tracking-wider">← tap</span>
          <span className="text-white/45 text-xs font-vibe uppercase tracking-wider">tap →</span>
        </div>
      )}

      <style jsx>{`
        @keyframes wrap-in-right {
          from { opacity: 0; transform: translate3d(55px, 0, 0) scale(0.96); filter: blur(5px); }
          to   { opacity: 1; transform: translate3d(0, 0, 0)    scale(1);    filter: blur(0);   }
        }
        @keyframes wrap-in-left {
          from { opacity: 0; transform: translate3d(-55px, 0, 0) scale(0.96); filter: blur(5px); }
          to   { opacity: 1; transform: translate3d(0, 0, 0)     scale(1);    filter: blur(0);   }
        }
        @keyframes wrap-rise {
          from { opacity: 0; transform: translate3d(0, 30px, 0); filter: blur(6px); }
          to   { opacity: 1; transform: translate3d(0, 0, 0);    filter: blur(0);   }
        }
        @keyframes score-slam {
          0%   { transform: scale(0.3);  opacity: 0; filter: blur(12px); }
          55%  { transform: scale(1.07); opacity: 1; filter: blur(0);    }
          75%  { transform: scale(0.97); }
          90%  { transform: scale(1.01); }
          100% { transform: scale(1);   }
        }
        @keyframes card-flip {
          from { opacity: 0; transform: perspective(1000px) rotateY(-25deg) scale(0.92); filter: blur(6px); }
          to   { opacity: 1; transform: perspective(1000px) rotateY(0deg)   scale(1);    filter: blur(0);   }
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
