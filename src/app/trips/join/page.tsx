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
    <div className="min-h-screen bg-[#FAF8F4] p-6">
      <header className="mb-12 pt-10">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 mb-8 shadow-sm active:scale-90 transition-all"
        >
          ←
        </button>
        <h1 className="text-3xl font-outfit font-medium tracking-tight">Join a trip</h1>
        <p className="text-gray-500 mt-1">Enter the secret invite code.</p>
      </header>
      
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="GOA2024X"
            maxLength={8}
            className="w-full bg-transparent border-b-2 border-gray-200 py-6 text-4xl tracking-[0.2em] font-mono focus:outline-none focus:border-black uppercase placeholder:text-gray-100 text-center transition-all"
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-4 font-inter uppercase tracking-widest">8-character code</p>
        </div>
        
        <button
          onClick={() => joinTrip.mutate({ inviteCode: code })}
          disabled={code.length < 6 || joinTrip.isPending}
          className="btn-primary w-full shadow-premium py-5 text-lg"
        >
          {joinTrip.isPending ? 'Validating code...' : 'Join trip'}
        </button>
        
        {joinTrip.error && (
          <div className="p-4 bg-red-50 text-red-500 rounded-2xl border border-red-100 text-center text-sm">
            {joinTrip.error.message}
          </div>
        )}
      </div>
    </div>
  );
}
