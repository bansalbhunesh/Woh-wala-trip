'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const [code, setCode] = useState(initialCode.toUpperCase());

  const joinTrip = trpc.trips.joinByCode.useMutation({
    onSuccess: ({ tripId }) => router.push(`/trips/${tripId}`),
  });

  const handleJoin = () => {
    if (code.length >= 4) joinTrip.mutate({ inviteCode: code });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="light-grain" />

      <div className="relative z-10 w-full max-w-md space-y-10 text-center">

        <div className="space-y-3">
          <p className="text-[9px] font-ui font-bold uppercase tracking-[0.45em]"
             style={{ color: 'var(--text-muted)' }}>Secure Access</p>
          <h1 className="font-display font-black tracking-tighter leading-[0.85]"
              style={{ fontSize: 'clamp(40px, 8vw, 80px)', color: 'var(--text)' }}>
            Enter <em className="italic" style={{ color: 'var(--accent)' }}>The Lore</em>
          </h1>
          <p className="text-sm font-display italic" style={{ color: 'var(--text-muted)' }}>
            "Validate your credentials to access the digital remains of this season."
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="TRIPCODE"
            maxLength={8}
            className="w-full rounded-2xl px-6 py-5 text-3xl font-display font-black tracking-[0.3em] text-center outline-none transition-all"
            style={{
              background: 'var(--bg-surface)',
              border: `1.5px solid ${code.length > 0 ? 'var(--accent)' : 'var(--border)'}`,
              color: 'var(--text)',
              boxShadow: code.length > 0 ? '0 0 0 4px oklch(60% 0.22 25 / 0.1)' : 'none',
            }}
            autoFocus
          />

          <button
            onClick={handleJoin}
            disabled={code.length < 4 || joinTrip.isPending}
            className="w-full py-4 rounded-2xl text-[11px] font-ui font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-35"
            style={{ background: 'var(--text)', color: 'var(--bg)' }}>
            {joinTrip.isPending ? 'Joining…' : 'Access Archive →'}
          </button>
        </div>

        {joinTrip.error && (
          <div className="px-5 py-4 rounded-2xl animate-slide-up"
               style={{ background: 'oklch(60% 0.22 25 / 0.08)', border: '1px solid oklch(60% 0.22 25 / 0.2)' }}>
            <p className="text-sm font-ui" style={{ color: 'var(--accent)' }}>
              {joinTrip.error.message}
            </p>
          </div>
        )}

        <p className="text-[9px] font-ui font-bold uppercase tracking-[0.4em]"
           style={{ color: 'var(--text-muted)', opacity: 0.4 }}>
          Authorized entry only
        </p>
      </div>
    </div>
  );
}

export default function JoinTripPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--bg)' }} />}>
      <JoinContent />
    </Suspense>
  );
}
