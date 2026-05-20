'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

interface LoreError {
  step?: string;
  message?: string;
}

interface Props {
  trip: any;
  tripId: string;
  onRetry: () => void;
}

export function FailedState({ trip, tripId, onRetry }: Props) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const loreError = trip?.lore_error as LoreError | null | undefined;
  const errorStep = loreError?.step;
  const errorMessage = loreError?.message;

  // Map internal pipeline steps to user-friendly hints
  const stepHints: Record<string, string> = {
    fetch: 'Trip data could not be loaded. Check your internet and retry.',
    vision: 'Photo analysis failed. Ensure photos are not corrupted and retry.',
    aggregate: 'Signal processing failed. Try again — this is usually transient.',
    lore: 'Story generation failed. The AI may be overloaded — retry in a minute.',
    enrichment: 'Character roles could not be generated. Retry to continue.',
    persist: 'Lore generated but could not be saved. Retry to complete.',
    stuck: 'Pipeline timed out after 30 minutes. Retry to restart.',
  };
  const userHint = errorStep ? stepHints[errorStep] : null;

  const generateLore = trpc.trips.generateLore.useMutation({
    onSuccess: () => {
      utils.trips.getFull.setData({ tripId }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          trip: {
            ...old.trip,
            lore_status: 'processing',
          },
        };
      });
      onRetry();
      router.push(`/trips/${tripId}/generating`);
    },
  });

  const resetLoreStatus = trpc.trips.resetLoreStatusToUpload.useMutation({
    onSuccess: () => {
      utils.trips.getFull.setData({ tripId }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          trip: {
            ...old.trip,
            lore_status: null,
          },
        };
      });
      onRetry();
      router.push(`/trips/${tripId}`);
    },
  });

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-10 py-20 text-center">
      <div className="space-y-3" role="alert" aria-live="assertive">
        <p
          className="font-mono text-[8px] uppercase tracking-[0.5em]"
          style={{ color: 'rgba(255,77,77,0.5)' }}
          aria-hidden="true"
        >
          ● LORE ENGINE INTERRUPTED
        </p>
        <h2
          className="font-display font-black uppercase tracking-tighter leading-tight"
          style={{ fontSize: 'clamp(28px, 5vw, 52px)', color: 'rgba(245,240,232,0.9)' }}
        >
          {trip.name}: Generation Failed
        </h2>
        <p
          className="font-display italic text-sm max-w-xs mx-auto"
          style={{ color: 'rgba(245,240,232,0.6)' }}
        >
          {userHint ??
            'The lore engine encountered an error. The archive is intact — retry to continue.'}
        </p>
        {errorStep && (
          <p
            className="font-mono text-[9px] uppercase tracking-[0.3em] mt-2"
            style={{ color: 'rgba(255,77,77,0.7)' }}
          >
            Failed at: {errorStep}
          </p>
        )}
      </div>

      {/* Photos are safe */}
      <div
        className="px-6 py-4 rounded-2xl"
        style={{ background: 'rgba(45,158,139,0.08)', border: '1px solid rgba(45,158,139,0.2)' }}
      >
        <p
          className="font-mono text-[9px] uppercase tracking-[0.3em]"
          style={{ color: 'rgba(45,158,139,0.9)' }}
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
            className="font-mono text-[9px] uppercase tracking-[0.25em] text-center max-w-xs mx-auto"
            style={{ color: 'rgba(255,77,77,0.9)' }}
          >
            {generateLore.error.message}
          </p>
        )}

        <button
          onClick={() => resetLoreStatus.mutate({ tripId })}
          disabled={resetLoreStatus.isPending}
          className="font-mono text-[10px] uppercase tracking-[0.4em] hover:opacity-60 transition-opacity disabled:opacity-30"
          style={{ color: 'rgba(245,240,232,0.45)' }}
        >
          {resetLoreStatus.isPending ? 'RESETTING...' : '← UPLOAD MORE PHOTOS / EDIT ARCHIVE'}
        </button>
      </div>

      {/* spin is in globals.css via @keyframes spin */}
    </div>
  );
}
