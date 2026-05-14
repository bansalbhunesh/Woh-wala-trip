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
    <div className="min-h-screen bg-black text-[#F5F0E8] p-6 flex flex-col items-center justify-center selection:bg-cooked-bg selection:text-white">
      <div className="w-full max-w-sm space-y-12">
        <div className="text-center space-y-4">
           <p className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-vibe">The Invitation</p>
           <h1 className="text-5xl font-cinematic font-black text-[#F5F0E8] tracking-tighter leading-none">Enter the Lore</h1>
           <p className="text-sm text-white/30 font-vibe italic">
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
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-8 text-4xl font-vibe font-black tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-cooked-accent/20 focus:bg-white/5 transition-all uppercase placeholder:text-white/5"
            autoFocus
          />

          <button
            onClick={() => joinTrip.mutate({ inviteCode: code })}
            disabled={code.length < 4 || joinTrip.isPending}
            className="w-full py-6 bg-[#F5F0E8] text-black rounded-full disabled:opacity-30 text-[10px] uppercase tracking-[0.3em] font-vibe font-black shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {joinTrip.isPending ? 'Validating...' : 'Access Archive'}
          </button>
        </div>

        {joinTrip.error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
            <p className="text-xs text-red-500 font-vibe font-bold uppercase tracking-wider">{joinTrip.error.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
