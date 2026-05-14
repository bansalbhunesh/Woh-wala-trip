'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

export default function JoinTripPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const joinTrip = trpc.trips.joinByCode.useMutation({
    onSuccess: ({ tripId }) => {
      router.push(`/trips/${tripId}`);
    },
  });

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col items-center justify-center selection:bg-cooked-bg selection:text-white">
      <div className="w-full max-w-sm space-y-12">
        <div className="text-center space-y-4">
           <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-vibe">The Invitation</p>
           <h1 className="text-5xl font-cinematic font-medium text-cooked-bg leading-none">Enter the Lore</h1>
           <p className="text-sm text-gray-400 font-data font-light">
             Paste the invite code to join your group&apos;s digital archive.
           </p>
        </div>

        <div className="space-y-6">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="TRIPCODE"
            maxLength={8}
            className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-6 py-6 text-3xl font-vibe tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-cooked-accent/20 focus:bg-white transition-all uppercase"
            autoFocus
          />

          <button
            onClick={() => joinTrip.mutate({ inviteCode: code })}
            disabled={code.length < 4 || joinTrip.isPending}
            className="w-full py-5 bg-cooked-bg text-white rounded-full disabled:opacity-30 text-[10px] uppercase tracking-[0.3em] font-vibe font-bold shadow-xl shadow-cooked-bg/20 hover:scale-[1.02] transition-all"
          >
            {joinTrip.isPending ? 'Validating...' : 'Access Archive'}
          </button>
        </div>

      {joinTrip.error && <p className="mt-4 text-sm text-red-500">{joinTrip.error.message}</p>}
    </div>
  );
}
