'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { Plus, Search } from 'lucide-react';

const POSTER_PALETTES = [
  ['oklch(60% 0.22 25)', 'oklch(72% 0.16 35)'],
  ['oklch(65% 0.12 180)', 'oklch(76% 0.10 195)'],
  ['oklch(70% 0.12 85)', 'oklch(82% 0.10 95)'],
  ['oklch(62% 0.18 280)', 'oklch(74% 0.14 290)'],
  ['oklch(60% 0.14 155)', 'oklch(72% 0.12 165)'],
  ['oklch(58% 0.16 320)', 'oklch(72% 0.12 330)'],
];

function posterPalette(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return POSTER_PALETTES[Math.abs(h) % POSTER_PALETTES.length];
}

// Card widths vary to create rhythm
const CARD_WIDTHS = ['240px', '200px', '260px', '210px', '230px', '195px'];

export default function TripsPage() {
  const { data: trips, isLoading } = trpc.trips.listMine.useQuery();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <div className="light-grain" />

      {/* Header */}
      <header className="relative z-10 flex items-end justify-between px-8 pt-12 pb-8 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="space-y-1">
          <p className="text-[9px] font-ui font-bold uppercase tracking-[0.45em]"
             style={{ color: 'var(--text-muted)' }}>The Dossier</p>
          <h1 className="font-display font-black tracking-tighter leading-[0.85]"
              style={{ fontSize: 'clamp(36px, 6vw, 72px)', color: 'var(--text)' }}>
            The <em className="italic" style={{ color: 'var(--accent)' }}>Seasons</em>
          </h1>
        </div>
        <div className="flex items-center gap-3 pb-1">
          <button className="p-3 rounded-full transition-all hover:scale-105"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
          <Link href="/trips/new"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-ui font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                style={{ background: 'var(--text)', color: 'var(--bg)' }}>
            <Plus size={14} /> New Season
          </Link>
        </div>
      </header>

      {/* Horizontal scroll track */}
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="flex gap-5 px-8 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 rounded-3xl animate-pulse"
                   style={{ width: CARD_WIDTHS[i % CARD_WIDTHS.length], height: '65vh', background: 'var(--bg-surface)' }} />
            ))}
          </div>
        ) : trips?.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-24">
            <div className="text-5xl mb-5">📭</div>
            <h2 className="font-display font-black text-3xl tracking-tight mb-2" style={{ color: 'var(--text)' }}>
              No lore detected.
            </h2>
            <p className="text-sm font-ui mb-8 max-w-xs" style={{ color: 'var(--text-muted)' }}>
              Your archive is empty. Start a new season to begin documenting the chaos.
            </p>
            <Link href="/trips/new"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[10px] font-ui font-black uppercase tracking-widest transition-all hover:scale-105"
                  style={{ background: 'var(--text)', color: 'var(--bg)' }}>
              Start First Season →
            </Link>
          </div>
        ) : (
          <>
            {/* Scroll hint label */}
            <div className="px-8 mb-4 flex items-center gap-3">
              <p className="text-[9px] font-ui font-bold uppercase tracking-[0.4em]"
                 style={{ color: 'var(--text-muted)' }}>
                {trips?.length} Season{trips?.length !== 1 ? 's' : ''} in the archive
              </p>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <p className="text-[9px] font-ui font-bold uppercase tracking-[0.3em]"
                 style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                scroll →
              </p>
            </div>

            {/* Horizontal scroll container */}
            <div className="flex gap-5 px-8 pb-6 overflow-x-auto scrollbar-hide">
              {trips?.map((trip, idx) => {
                const [from, to] = posterPalette(trip.name ?? 'trip');
                const cardW = CARD_WIDTHS[idx % CARD_WIDTHS.length];
                const isReady = (trip as { lore_status?: string }).lore_status === 'ready';

                return (
                  <Link
                    key={trip.id}
                    href={`/trips/${trip.id}`}
                    className="group flex-shrink-0 flex flex-col rounded-3xl overflow-hidden light-card"
                    style={{ width: cardW, height: '62vh', minHeight: 380, boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}
                  >
                    {/* Full-height poster */}
                    <div className="relative flex-1"
                         style={{ background: `linear-gradient(160deg, ${from}, ${to})` }}>
                      {/* Status pill */}
                      <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-[7.5px] font-ui font-bold uppercase tracking-widest"
                           style={{ background: 'oklch(100% 0 0 / 0.2)', color: 'oklch(97% 0.005 60)' }}>
                        {isReady ? '✓ Lore Ready' : 'Active'}
                      </div>

                      {/* Big trip initial watermark */}
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <p className="font-display font-black leading-tight"
                           style={{
                             fontSize: 'clamp(18px, 3.5vw, 28px)',
                             color: 'oklch(97% 0.005 60)',
                             opacity: 0.95,
                             textShadow: '0 2px 8px rgba(0,0,0,0.12)',
                           }}>
                          {trip.name}
                        </p>
                        {trip.destination && (
                          <p className="text-[9px] font-ui mt-0.5" style={{ color: 'oklch(97% 0.005 60)', opacity: 0.65 }}>
                            {trip.destination}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer strip */}
                    <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                         style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}>
                      <p className="text-[9px] font-ui font-bold uppercase tracking-widest truncate"
                         style={{ color: 'var(--text-muted)' }}>
                        {trip.start_date ? new Date(trip.start_date).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : 'Timeless'}
                      </p>
                      <span className="text-sm opacity-30 group-hover:translate-x-1 transition-transform"
                            style={{ color: 'var(--text)' }}>→</span>
                    </div>
                  </Link>
                );
              })}

              {/* Add new season card at end */}
              <Link href="/trips/new"
                    className="flex-shrink-0 flex flex-col items-center justify-center gap-4 rounded-3xl transition-all hover:scale-[1.02] active:scale-95"
                    style={{
                      width: '180px', height: '62vh', minHeight: 380,
                      border: '2px dashed var(--border)',
                      background: 'transparent',
                    }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                     style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <Plus size={20} style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-[9px] font-ui font-bold uppercase tracking-widest text-center"
                   style={{ color: 'var(--text-muted)' }}>
                  New<br />Season
                </p>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 flex-shrink-0 py-4 px-8 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-[8px] font-ui font-bold uppercase tracking-[0.4em]"
           style={{ color: 'var(--text-muted)', opacity: 0.4 }}>
          Lore Pipeline v2.0
        </p>
        <p className="text-[8px] font-ui font-bold uppercase tracking-[0.4em]"
           style={{ color: 'var(--text-muted)', opacity: 0.4 }}>
          AI Friendship Archive
        </p>
      </footer>
    </div>
  );
}
