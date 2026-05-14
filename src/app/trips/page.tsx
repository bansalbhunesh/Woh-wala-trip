'use client';
import { trpc } from '@/lib/trpc/client';
import Link from 'next/link';

export default function TripsListPage() {
  const { data: trips, isLoading } = trpc.trips.listMine.useQuery();

  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-2xl font-medium">Your trips</h1>
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
                className="block border border-gray-200 rounded-xl p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <h2 className="font-medium text-base">{trip.name}</h2>
                  <StatusBadge status={trip.lore_status} />
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>
                    {trip.destination} · {trip.member_count} people · {trip.total_photos} photos
                  </p>
                  {trip.chaos_score !== null && <p>Chaos: {trip.chaos_score}/100</p>}
                </div>
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
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    processing: 'bg-amber-50 text-amber-700',
    ready: 'bg-green-50 text-green-700',
    failed: 'bg-red-50 text-red-700',
    regenerating: 'bg-amber-50 text-amber-700',
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}
