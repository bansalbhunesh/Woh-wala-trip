'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/components/ui/Toast';

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [code, setCode] = useState((searchParams.get('code') || '').toUpperCase());
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80);
    return () => clearTimeout(t);
  }, []);

  const joinTrip = trpc.trips.joinByCode.useMutation({
    onSuccess: ({ tripId }) => {
      toast('Welcome to the crew →');
      router.push(`/trips/${tripId}`);
    },
  });

  const canJoin = code.length >= 4 && !joinTrip.isPending;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'oklch(97% 0.008 70)', color: 'oklch(16% 0.015 60)' }}
    >
      <div className="light-grain" />

      {/* Nav */}
      <nav
        className="relative z-10 flex items-center justify-between px-8 py-4"
        style={{ borderBottom: '1px solid oklch(87% 0.015 72)' }}
      >
        <button
          onClick={() => router.back()}
          className="font-mono text-[8px] uppercase tracking-[0.4em] hover:opacity-60 transition-opacity"
          style={{ color: 'oklch(52% 0.015 60)' }}
        >
          ← BACK
        </button>
        <span
          className="font-display italic font-black text-base tracking-tight"
          style={{ color: 'oklch(60% 0.22 25)' }}
        >
          yaarlore
        </span>
        <div className="w-12" />
      </nav>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-10">
          {/* Header */}
          <div
            className="space-y-2"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
              filter: revealed ? 'blur(0px)' : 'blur(6px)',
              transition:
                'opacity 0.65s cubic-bezier(0.16,1,0.3,1) 0.05s, transform 0.65s cubic-bezier(0.16,1,0.3,1) 0.05s, filter 0.65s cubic-bezier(0.16,1,0.3,1) 0.05s',
              willChange: 'transform, opacity',
            }}
          >
            <p
              className="font-mono text-[8px] uppercase tracking-[0.6em]"
              style={{ color: 'oklch(60% 0.22 25)' }}
            >
              JOIN A SEASON
            </p>
            <h1
              className="font-display font-black uppercase tracking-tighter leading-[0.85]"
              style={{ fontSize: 'clamp(40px, 7vw, 80px)', color: 'oklch(16% 0.015 60)' }}
            >
              ENTER{' '}
              <em className="italic" style={{ color: 'oklch(60% 0.22 25)' }}>
                THE CODE
              </em>
            </h1>
            <p className="font-display italic text-sm" style={{ color: 'oklch(52% 0.015 60)' }}>
              "Someone left a door open. Walk in."
            </p>
          </div>

          {/* Code input — BIG */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              border: `1.5px solid ${focused || code.length > 0 ? 'oklch(60% 0.22 25 / 0.5)' : 'oklch(87% 0.015 72)'}`,
              background: focused ? 'oklch(96% 0.012 25 / 0.3)' : 'oklch(93.5% 0.012 72)',
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
              filter: revealed ? 'blur(0px)' : 'blur(6px)',
              transition:
                'border-color 0.3s cubic-bezier(0.16,1,0.3,1), background 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.18s, transform 0.55s cubic-bezier(0.16,1,0.3,1) 0.18s, filter 0.55s cubic-bezier(0.16,1,0.3,1) 0.18s',
            }}
          >
            <input
              type="text"
              value={code}
              onChange={e =>
                setCode(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '')
                    .slice(0, 8)
                )
              }
              onKeyDown={e => e.key === 'Enter' && canJoin && joinTrip.mutate({ inviteCode: code })}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="TRIPCODE"
              maxLength={8}
              autoFocus
              className="w-full bg-transparent text-center py-10 px-6 font-display font-black outline-none tracking-[0.35em] uppercase"
              style={{
                fontSize: 'clamp(32px, 7vw, 56px)',
                color: code.length > 0 ? 'oklch(16% 0.015 60)' : 'oklch(70% 0.015 60)',
                caretColor: 'oklch(60% 0.22 25)',
              }}
            />
          </div>

          {/* Join button */}
          <button
            onClick={() => joinTrip.mutate({ inviteCode: code })}
            disabled={!canJoin}
            className="w-full py-4 rounded-2xl font-ui font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 disabled:opacity-30"
            style={{
              background: canJoin ? 'oklch(16% 0.015 60)' : 'oklch(93.5% 0.012 72)',
              color: canJoin ? 'oklch(97% 0.008 70)' : 'oklch(52% 0.015 60)',
              border: `1.5px solid ${canJoin ? 'transparent' : 'oklch(87% 0.015 72)'}`,
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
              filter: revealed ? 'blur(0px)' : 'blur(6px)',
              transition: `opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.28s, transform 0.55s cubic-bezier(0.16,1,0.3,1) 0.28s, filter 0.55s cubic-bezier(0.16,1,0.3,1) 0.28s, background 0.3s ease`,
              willChange: 'transform, opacity',
            }}
            onMouseEnter={e => {
              if (!canJoin) return;
              const el = e.currentTarget as HTMLButtonElement;
              el.style.transform = 'translate3d(0,-2px,0)';
              el.style.boxShadow = '0 8px 30px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.transform = 'translate3d(0,0,0)';
              el.style.boxShadow = 'none';
            }}
          >
            {joinTrip.isPending ? (
              <>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: '1.5px solid currentColor',
                    borderTopColor: 'transparent',
                    animation: 'join-spin 0.8s linear infinite',
                  }}
                />{' '}
                JOINING...
              </>
            ) : (
              'JOIN THE SEASON →'
            )}
          </button>

          {joinTrip.error && (
            <div
              className="flex flex-col items-center gap-3"
              style={{ animation: 'join-error-enter 0.45s cubic-bezier(0.16,1,0.3,1) forwards' }}
            >
              <p
                className="text-center py-3 px-5 rounded-full font-mono text-[8px] uppercase tracking-[0.25em]"
                style={{
                  background: 'oklch(96% 0.012 25 / 0.5)',
                  border: '1px solid oklch(60% 0.22 25 / 0.3)',
                  color: 'oklch(60% 0.22 25)',
                }}
              >
                {joinTrip.error.message}
              </p>
              <button
                onClick={() => joinTrip.reset()}
                className="font-mono text-[8px] uppercase tracking-[0.3em] transition-opacity hover:opacity-60"
                style={{ color: 'oklch(52% 0.015 60)' }}
              >
                ← Try a different code
              </button>
            </div>
          )}

          <p
            className="text-center font-mono text-[7px] uppercase tracking-[0.45em]"
            style={{
              color: 'oklch(70% 0.015 60)',
              opacity: revealed ? 1 : 0,
              transition: 'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.4s',
            }}
          >
            GET THE CODE FROM A TRIP MEMBER
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes join-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes join-error-enter {
          from {
            opacity: 0;
            transform: translate3d(0, 12px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}

export default function JoinTripPage() {
  return (
    <Suspense fallback={<div style={{ background: 'oklch(97% 0.008 70)', minHeight: '100vh' }} />}>
      <JoinContent />
    </Suspense>
  );
}
