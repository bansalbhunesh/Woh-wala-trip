'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

interface Props {
  trip: any;
  tripId: string;
  onRetry: () => void;
}

export function FailedState({ trip, tripId, onRetry }: Props) {
  const router = useRouter();
  const generateLore = trpc.trips.generateLore.useMutation({
    onSuccess: () => {
      onRetry();
      router.push(`/trips/${tripId}/generating`);
    },
  });

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-10 py-20 text-center">
      <div className="space-y-3">
        <p
          className="font-mono text-[8px] uppercase tracking-[0.5em]"
          style={{ color: 'rgba(255,77,77,0.5)' }}
        >
          ● LORE ENGINE INTERRUPTED
        </p>
        <h2
          className="font-display font-black uppercase tracking-tighter leading-tight"
          style={{ fontSize: 'clamp(28px, 5vw, 52px)', color: 'rgba(245,240,232,0.9)' }}
        >
          {trip.name}
        </h2>
        <p
          className="font-display italic text-sm max-w-xs mx-auto"
          style={{ color: 'rgba(245,240,232,0.3)' }}
        >
          "The lore engine encountered an error. The archive is intact — retry to continue."
        </p>
      </div>

      {/* Photos are safe */}
      <div
        className="px-6 py-4 rounded-2xl"
        style={{ background: 'rgba(45,158,139,0.08)', border: '1px solid rgba(45,158,139,0.2)' }}
      >
        <p
          className="font-mono text-[8px] uppercase tracking-[0.3em]"
          style={{ color: 'rgba(45,158,139,0.7)' }}
        >
          ✓ YOUR PHOTOS ARE SAFE IN THE ARCHIVE
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => generateLore.mutate({ tripId })}
          disabled={generateLore.isPending}
          className="px-10 py-4 rounded-full font-ui font-black text-[10px] uppercase tracking-[0.35em] transition-all hover:scale-105 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-3"
          style={{
            background: 'rgba(255,77,77,0.12)',
            border: '1px solid rgba(255,77,77,0.4)',
            color: 'rgba(255,77,77,0.9)',
            boxShadow: '0 0 30px rgba(255,77,77,0.1)',
          }}
        >
          {generateLore.isPending ? (
            <>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,77,77,0.3)',
                  borderTopColor: '#FF4D4D',
                  animation: 'spin 0.8s linear infinite',
                }}
              />{' '}
              RETRYING...
            </>
          ) : (
            'RETRY LORE ENGINE →'
          )}
        </button>

        {generateLore.error && (
          <p
            className="font-mono text-[8px] uppercase tracking-[0.25em] text-center max-w-xs mx-auto"
            style={{ color: 'rgba(255,77,77,0.6)' }}
          >
            {generateLore.error.message}
          </p>
        )}

        <button
          onClick={() => router.push(`/trips/${tripId}`)}
          className="font-mono text-[7.5px] uppercase tracking-[0.4em] hover:opacity-60 transition-opacity"
          style={{ color: 'rgba(245,240,232,0.45)' }}
        >
          ← BACK TO ARCHIVE
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
