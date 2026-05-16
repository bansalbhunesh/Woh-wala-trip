'use client';
import { useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';

export function RecurringIdentityWidget({ tripId }: { tripId: string }) {
  const { data: history } = trpc.archetypes.getHistory.useQuery();
  const syncMutation = trpc.archetypes.syncFromTrip.useMutation();

  useEffect(() => {
    syncMutation.mutate({ tripId });
  }, [tripId]); // eslint-disable-line

  if (!history || history.length === 0) return null;

  const otherTrips = history.filter((h: any) => h.trip_id !== tripId);
  if (otherTrips.length === 0) return null;

  const archCounts: Record<string, number> = {};
  history.forEach((h: any) => {
    const key = h.role_archetype_tag ?? h.role_title;
    if (key) archCounts[key] = (archCounts[key] || 0) + 1;
  });
  const topArchetype = Object.entries(archCounts).sort(([, a], [, b]) => b - a)[0]?.[0];
  const isRecurring = history.length >= 2 && (archCounts[topArchetype] ?? 0) >= 2;

  return (
    <div className="px-6 py-5 rounded-[2rem] border space-y-4"
         style={{ background: 'rgba(255,77,77,0.04)', borderColor: 'rgba(255,77,77,0.12)' }}>
      <div className="text-[7px] font-mono uppercase tracking-[0.5em]"
           style={{ color: 'rgba(255,77,77,0.5)' }}>
        Recurring Identity
      </div>

      {isRecurring ? (
        <>
          <div className="space-y-1">
            <div className="text-xs font-cinematic font-black text-white/80 uppercase tracking-tight">
              {topArchetype}
            </div>
            <div className="text-[10px] font-data text-white/35">
              Appeared across {archCounts[topArchetype]} trips
            </div>
          </div>
          <div className="space-y-1.5">
            {history.slice(0, 4).map((h: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[9px] font-data text-white/30 truncate max-w-[120px]">
                  {h.trip_name}
                </span>
                <span className="text-[9px] font-mono" style={{ color: 'rgba(255,77,77,0.6)' }}>
                  {h.role_chaos_rating}/10
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-[10px] font-data text-white/30">
          Complete more trips to discover your recurring identity.
        </div>
      )}
    </div>
  );
}
