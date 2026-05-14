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
    <div className="min-h-screen bg-white p-6">
      <button onClick={() => router.back()} className="text-sm text-gray-500 mt-6 mb-8">
        ← Back
      </button>
      <h1 className="text-2xl font-medium mb-6">Join a trip</h1>
      <p className="text-sm text-gray-500 mb-8">
        Enter the invite code your friend shared with you.
      </p>

      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="GOA2024X"
        maxLength={8}
        className="w-full border-b border-gray-300 py-4 text-2xl tracking-widest font-mono focus:outline-none focus:border-black uppercase"
        autoFocus
      />

      <button
        onClick={() => joinTrip.mutate({ inviteCode: code })}
        disabled={code.length < 6 || joinTrip.isPending}
        className="w-full mt-8 py-4 bg-black text-white rounded-xl disabled:opacity-30 font-medium"
      >
        {joinTrip.isPending ? 'Joining...' : 'Join trip'}
      </button>

      {joinTrip.error && <p className="mt-4 text-sm text-red-500">{joinTrip.error.message}</p>}
    </div>
  );
}
