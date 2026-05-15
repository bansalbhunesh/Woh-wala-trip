'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { Plus, Search } from 'lucide-react';

const POSTER_PALETTES = [
  ['oklch(60% 0.22 25)', 'oklch(75% 0.18 35)'],   // coral
  ['oklch(65% 0.12 180)', 'oklch(78% 0.10 195)'],  // teal
  ['oklch(70% 0.12 85)', 'oklch(83% 0.10 95)'],    // amber
  ['oklch(62% 0.18 280)', 'oklch(76% 0.14 290)'],  // purple
  ['oklch(60% 0.14 155)', 'oklch(74% 0.12 165)'],  // green
];

function posterPalette(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return POSTER_PALETTES[Math.abs(h) % POSTER_PALETTES.length];
}

export default function TripsPage() {
  const { data: trips, isLoading } = trpc.trips.listMine.useQuery();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="light-grain" />

      {/* Header */}
      <header className="relative z-10 max-w-6xl mx-auto px-6 pt-14 pb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-2">
          <p className="text-[9px] font-ui font-bold uppercase tracking-[0.45em]"
             style={{ color: 'var(--text-muted)' }}>The Dossier</p>
          <h1 className="font-display font-black tracking-tighter leading-[0.85]"
              style={{ fontSize: 'clamp(40px, 7vw, 84px)', color: 'var(--text)' }}>
            The <em className="italic" style={{ color: 'var(--accent)' }}>Seasons</em>
          </h1>
        </div>

        <div className="flex items-center gap-3 pb-1">
          <button className="p-3 rounded-full transition-all hover:scale-105"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <Search size={17} style={{ color: 'var(--text-muted)' }} />
          </button>
          <Link href="/trips/new"
                className="flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-ui font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                style={{ background: 'var(--text)', color: 'var(--bg)' }}>
            <Plus size={15} /> New Season
          </Link>
        </div>
      </header>

      {/* Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-3xl overflow-hidden animate-pulse"
                   style={{ background: 'var(--bg-surface)', aspectRatio: '4/5' }} />
            ))}
          </div>
        ) : trips?.length === 0 ? (
          <div className="text-center py-32 rounded-3xl" style={{ border: '2px dashed var(--border)' }}>
            <div className="text-4xl mb-4">📭</div>
            <p className="font-display font-black text-xl mb-2" style={{ color: 'var(--text)' }}>
              No lore detected.
            </p>
            <p className="text-sm font-ui mb-8" style={{ color: 'var(--text-muted)' }}>
              Your archive is empty. Start a new season.
            </p>
            <Link href="/trips/new"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[10px] font-ui font-black uppercase tracking-widest transition-all hover:scale-105"
                  style={{ background: 'var(--text)', color: 'var(--bg)' }}>
              Start First Season →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {trips?.map((trip, idx) => {
              const [from, to] = posterPalette(trip.name ?? 'trip');
              return (
                <Link key={trip.id} href={`/trips/${trip.id}`}
                      className="group block rounded-3xl overflow-hidden light-card"
                      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  {/* Poster area */}
                  <div className="relative" style={{ aspectRatio: '4/3', background: `linear-gradient(135deg, ${from}, ${to})` }}>
                    {/* Lore status badge */}
                    <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-[8px] font-ui font-bold uppercase tracking-widest"
                         style={{ background: 'oklch(100% 0 0 / 0.2)', color: 'oklch(97% 0.005 60)' }}>
                      {(trip as any).lore_status === 'ready' ? '✓ Lore Ready' : 'Season Active'}
                    </div>
                    {/* Trip name watermark */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="font-display font-black text-center leading-tight px-6"
                         style={{ fontSize: 'clamp(20px, 4vw, 32px)', color: 'oklch(97% 0.005 60)', opacity: 0.9, textShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                        {trip.name}
                      </p>
                    </div>
                  </div>
                  {/* Card footer */}
                  <div className="px-5 py-4 flex items-center justify-between"
                       style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}>
                    <div>
                      <p className="font-ui font-bold text-sm truncate" style={{ color: 'var(--text)' }}>
                        {trip.name}
                      </p>
                      <p className="text-[10px] font-ui mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {trip.destination || 'Location TBD'}
                      </p>
                    </div>
                    <span className="text-sm opacity-40 group-hover:translate-x-1 transition-transform"
                          style={{ color: 'var(--text)' }}>→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t py-8 text-center"
              style={{ borderColor: 'var(--border)' }}>
        <p className="text-[9px] font-ui font-bold uppercase tracking-[0.4em]"
           style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
          Lore Pipeline v2.0 · AI Friendship Archive
        </p>
      </footer>
    </div>
  );
}
