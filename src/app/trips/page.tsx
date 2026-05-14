'use client';
import { trpc } from '@/lib/trpc/client';
import Link from 'next/link';

export default function TripsListPage() {
  const { data: trips, isLoading } = trpc.trips.listMine.useQuery();
  
  return (
    <div className="min-h-screen bg-[#FAF8F4] pb-32">
      <header className="px-6 pt-16 pb-8">
        <h1 className="text-3xl font-outfit font-medium tracking-tight">Your trips</h1>
      </header>
      
      <main className="px-6 space-y-4">
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-white rounded-3xl animate-pulse" />
            ))}
          </div>
        )}
        
        {trips?.length === 0 && (
          <EmptyState />
        )}
        
        <div className="grid gap-4">
          {trips?.map((trip: any) => trip && (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}`}
              className="group block bg-white rounded-3xl p-6 shadow-premium border border-transparent hover:border-gray-200 transition-all active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="font-outfit text-xl font-medium group-hover:translate-x-1 transition-transform">{trip.name}</h2>
                <StatusBadge status={trip.lore_status} />
              </div>
              <div className="text-sm text-gray-500 font-inter">
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  {trip.destination || 'Unknown destination'}
                </p>
                <p className="mt-1 flex items-center gap-2 text-gray-400">
                  {trip.member_count} members · {trip.total_photos} photos
                </p>
              </div>
              
              {trip.chaos_score !== null && (
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-black transition-all duration-1000 ease-out" 
                      style={{ width: `${trip.chaos_score}%` }} 
                    />
                  </div>
                  <span className="text-xs font-mono font-medium">CHAOS {trip.chaos_score}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      </main>
      
      <div className="fixed bottom-8 right-6 left-6 flex gap-3">
        <Link
          href="/trips/join"
          className="btn-secondary flex-1 flex items-center justify-center gap-2 shadow-premium"
        >
          <span className="text-xl">↗</span> Join
        </Link>
        <Link
          href="/trips/new"
          className="btn-primary flex-[2] flex items-center justify-center gap-2 shadow-premium"
        >
          <span className="text-2xl font-light">+</span> New Trip
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-20 text-center flex flex-col items-center">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-6">
        🌴
      </div>
      <p className="text-gray-400 text-sm mb-8 max-w-[200px] leading-relaxed">
        You haven't been on any narrated trips yet.
      </p>
      <Link href="/trips/new" className="btn-primary">
        Create your first trip
      </Link>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-500',
    processing: 'bg-amber-50 text-amber-600 animate-pulse',
    ready: 'bg-green-50 text-green-600',
    failed: 'bg-red-50 text-red-500',
    regenerating: 'bg-amber-50 text-amber-600 animate-pulse',
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}
