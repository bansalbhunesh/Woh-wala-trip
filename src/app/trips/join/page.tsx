'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { CinematicShell } from '@/components/experience/CinematicShell';

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState((searchParams.get('code') || '').toUpperCase());
  const [focused, setFocused] = useState(false);

  const joinTrip = trpc.trips.joinByCode.useMutation({
    onSuccess: ({ tripId }) => router.push(`/trips/${tripId}`),
  });

  return (
    <CinematicShell intensity={0.35}>
      <div className="film-grain" />
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-10 text-center">

          <div className="space-y-3">
            <p className="font-mono text-[8px] uppercase tracking-[0.6em]"
               style={{ color: 'rgba(255,77,77,0.5)' }}>
              ● SECURE ACCESS PORTAL
            </p>
            <h1 className="font-display font-black uppercase tracking-tighter leading-[0.85]"
                style={{ fontSize: 'clamp(36px, 7vw, 72px)', color: 'rgba(245,240,232,0.92)' }}>
              ENTER <em className="italic" style={{ color: '#FF4D4D' }}>THE LORE</em>
            </h1>
            <p className="font-display italic text-sm" style={{ color: 'rgba(245,240,232,0.25)' }}>
              "Validate your credentials to access the digital remains of this season."
            </p>
          </div>

          {/* Code input */}
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl pointer-events-none transition-all duration-400"
                 style={{
                   border: `1px solid ${code.length > 0 ? 'rgba(255,77,77,0.5)' : 'rgba(245,240,232,0.07)'}`,
                   boxShadow: focused ? '0 0 40px rgba(255,77,77,0.1), inset 0 0 30px rgba(255,77,77,0.03)' : 'none',
                 }} />
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().slice(0, 8))}
              onKeyDown={e => e.key === 'Enter' && code.length >= 4 && joinTrip.mutate({ inviteCode: code })}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="TRIPCODE"
              maxLength={8}
              autoFocus
              className="w-full bg-transparent text-center py-8 px-6 font-display font-black outline-none tracking-[0.4em] uppercase"
              style={{
                fontSize: 'clamp(28px, 6vw, 44px)',
                color: code.length > 0 ? 'rgba(245,240,232,0.92)' : 'rgba(245,240,232,0.1)',
                caretColor: '#FF4D4D',
                background: 'rgba(245,240,232,0.02)',
                borderRadius: '1rem',
              }}
            />
            {code.length > 0 && (
              <div className="absolute bottom-0 left-8 right-8 h-px"
                   style={{ background: 'linear-gradient(90deg, transparent, rgba(255,77,77,0.6), transparent)' }} />
            )}
          </div>

          <button
            onClick={() => joinTrip.mutate({ inviteCode: code })}
            disabled={code.length < 4 || joinTrip.isPending}
            className="w-full py-4 rounded-2xl font-ui font-black text-[11px] uppercase tracking-widest transition-all duration-400 disabled:opacity-25 flex items-center justify-center gap-3"
            style={{
              background: 'rgba(255,77,77,0.1)',
              border: '1px solid rgba(255,77,77,0.4)',
              color: 'rgba(255,77,77,0.9)',
              boxShadow: code.length >= 4 ? '0 0 30px rgba(255,77,77,0.15)' : 'none',
            }}>
            {joinTrip.isPending ? (
              <>
                <div className="w-3 h-3 rounded-full" style={{ border: '1px solid rgba(255,77,77,0.3)', borderTopColor: '#FF4D4D', animation: 'spin 0.8s linear infinite' }} />
                DECRYPTING...
              </>
            ) : 'ACCESS ARCHIVE →'}
          </button>

          {joinTrip.error && (
            <div className="px-5 py-3 rounded-full font-mono text-[8px] uppercase tracking-[0.3em]"
                 style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)', color: 'rgba(255,77,77,0.8)' }}>
              {joinTrip.error.message}
            </div>
          )}

          <p className="font-mono text-[7.5px] uppercase tracking-[0.5em]" style={{ color: 'rgba(245,240,232,0.1)' }}>
            AUTHORIZED ENTRY ONLY
          </p>
        </div>
      </div>
      <style jsx>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </CinematicShell>
  );
}

export default function JoinTripPage() {
  return (
    <Suspense fallback={<div style={{ background: '#060604', minHeight: '100vh' }} />}>
      <JoinContent />
    </Suspense>
  );
}
