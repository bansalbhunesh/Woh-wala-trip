'use client';
import { trpc } from '@/lib/trpc/client';
import Link from 'next/link';

export default function TripsListPage() {
  const { data: trips, isLoading } = trpc.trips.listMine.useQuery();

  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 pt-20 pb-10">
        <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-vibe mb-2">The Archive</p>
        <h1 className="text-5xl font-cinematic font-medium text-cooked-bg">Your Seasons</h1>
      </header>

      <main className="px-6 space-y-3">
        {isLoading && <div className="text-sm text-gray-400">Loading...</div>}

        {trips?.length === 0 && <EmptyState />}

        {trips?.map(
          (trip) =>
            trip && (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}`}
                className="group block relative overflow-hidden rounded-[2.5rem] bg-gray-50 border border-gray-100 p-8 hover:bg-white hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-vibe">Season {trip.total_photos > 50 ? 'Finale' : 'Premiere'}</p>
                    <h2 className="text-3xl font-cinematic font-medium text-cooked-bg leading-none group-hover:text-chill-accent transition-colors">{trip.name}</h2>
                  </div>
                  <StatusBadge status={trip.lore_status} />
                </div>
                
                <div className="flex items-center gap-4 text-[10px] font-vibe uppercase tracking-widest text-gray-400">
                  <span>{trip.destination}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-200" />
                  <span>{trip.member_count} Cast Members</span>
                </div>

                {trip.chaos_score !== null && (
                   <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                         <span className="text-2xl font-vibe font-bold text-cooked-accent leading-none">{trip.chaos_score}</span>
                         <span className="text-[8px] text-gray-400 uppercase tracking-widest">Chaos Rating</span>
                      </div>
                      <span className="text-[10px] italic font-cinematic text-gray-400">Open Archive →</span>
                   </div>
                )}
              </Link>
            )
        )}
      </main>

      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <Link
          href="/trips/join"
          className="w-14 h-14 rounded-full border border-gray-300 bg-white flex items-center justify-center"
        >
          <span className="text-xl">↗</span>
        </Link>
        <Link
          href="/trips/new"
          className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center"
        >
          <span className="text-2xl">+</span>
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-12 text-center">
      <p className="text-gray-400 text-sm mb-4">No trips yet</p>
      <Link
        href="/trips/new"
        className="inline-block py-3 px-6 bg-black text-white rounded-xl text-sm"
      >
        Create your first trip
      </Link>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Empty' },
    processing: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Archiving...' },
    ready: { bg: 'bg-green-50', text: 'text-green-600', label: 'Ready' },
    failed: { bg: 'bg-red-50', text: 'text-red-600', label: 'Error' },
    regenerating: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Recutting...' },
  };
  const config = styles[status] || styles.pending;
  return (
    <span className={`text-[8px] uppercase tracking-[0.2em] font-vibe font-bold px-3 py-1.5 rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
