'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { FilmGrain, AtmosphericBlob, CinematicText } from '@/components/ui/atoms';
import { KeyRound, ShieldCheck, ChevronRight } from 'lucide-react';

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const [code, setCode] = useState(initialCode.toUpperCase());

  const joinTrip = trpc.trips.joinByCode.useMutation({
    onSuccess: ({ tripId }) => {
      router.push(`/trips/${tripId}`);
    },
  });

  const handleJoin = () => {
    if (code.length >= 4) {
      joinTrip.mutate({ inviteCode: code });
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#F5F0E8] font-cinematic selection:bg-cooked-accent selection:text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <FilmGrain />
      <AtmosphericBlob color="#FF3B2F" className="top-[-20%] left-[-20%] w-[600px] h-[600px] opacity-20" />
      <AtmosphericBlob color="#D49E2D" className="bottom-[-20%] right-[-20%] w-[400px] h-[400px] opacity-10" />

      <div className="w-full max-w-md space-y-16 relative z-10">
        <div className="text-center space-y-6">
           <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[9px] uppercase tracking-[0.4em] text-white/40 font-black mb-4">
             <ShieldCheck size={12} className="text-cooked-accent" /> Secure Access
           </div>
           <h1 className="text-6xl md:text-7xl font-black text-[#F5F0E8] tracking-tighter leading-none uppercase font-cinematic">
             Enter<br />
             <span className="italic text-cooked-accent">The Lore</span>
           </h1>
           <p className="text-lg text-white/30 italic max-w-xs mx-auto">
             "Validate your credentials to access the digital remains of this season."
           </p>
        </div>

        <div className="space-y-8">
          <div className="relative group">
            <div className="absolute left-8 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-cooked-accent transition-colors">
              <KeyRound size={24} />
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="TRIPCODE"
              maxLength={8}
              className="w-full bg-white/[0.03] border border-white/10 rounded-[2.5rem] pl-20 pr-8 py-10 text-4xl md:text-5xl font-vibe font-black tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-cooked-accent/30 focus:bg-white/[0.06] focus:border-cooked-accent/50 transition-all uppercase placeholder:text-white/5 selection:bg-cooked-accent"
              autoFocus
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={code.length < 4 || joinTrip.isPending}
            className="group w-full py-8 bg-[#F5F0E8] text-black rounded-full disabled:opacity-20 text-[11px] font-black uppercase tracking-[0.4em] shadow-[0_0_60px_rgba(255,255,255,0.05)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
          >
            {joinTrip.isPending ? 'Decrypting...' : 'Access Archive'}
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {joinTrip.error && (
          <div className="p-6 rounded-[2rem] bg-cooked-accent/10 border border-cooked-accent/20 text-center animate-in fade-in slide-in-from-bottom-4">
            <p className="text-[10px] text-cooked-accent font-black uppercase tracking-widest">{joinTrip.error.message}</p>
          </div>
        )}

        <div className="text-center pt-12">
           <span className="text-[8px] uppercase tracking-[0.5em] text-white/10 font-black">Authorized Entry Only</span>
        </div>
      </div>
    </div>
  );
}

export default function JoinTripPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <JoinContent />
    </Suspense>
  );
}
