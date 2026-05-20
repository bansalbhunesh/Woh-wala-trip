'use client';
import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { analytics } from '@/lib/analytics';
import { Copy, Check, MessageCircle, ArrowRight } from 'lucide-react';

export default function InvitePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80);
    return () => clearTimeout(t);
  }, []);

  const { data: tripData } = trpc.trips.getFull.useQuery({ tripId });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trip = (tripData as any)?.trip;
  const inviteCode = trip?.invite_code || '––––';
  const tripName = trip?.name || 'this trip';
  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/trips/join?code=${inviteCode}`;
  const whatsappMsg = `Yaar, ${tripName} ka archive ban raha hai 📸 Join karo: ${inviteLink}`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(inviteCode);
    analytics.friendInvited(tripId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          onClick={() => router.push(`/trips/${tripId}`)}
          className="font-mono text-[8px] uppercase tracking-[0.4em] hover:opacity-60 transition-opacity"
          style={{ color: 'oklch(52% 0.015 60)' }}
        >
          ← ARCHIVE
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
        <div className="w-full max-w-sm space-y-10 text-center">
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
              ● ARCHIVE INITIALIZED
            </p>
            <h1
              className="font-display font-black uppercase tracking-tighter leading-[0.85]"
              style={{ fontSize: 'clamp(32px, 6vw, 60px)', color: 'oklch(16% 0.015 60)' }}
            >
              GATHER{' '}
              <em className="italic" style={{ color: 'oklch(60% 0.22 25)' }}>
                THE CAST
              </em>
            </h1>
            <p className="font-display italic text-sm" style={{ color: 'oklch(52% 0.015 60)' }}>
              "Lore is a team sport."
            </p>
          </div>

          {/* The code — HERO */}
          <div
            className="rounded-2xl py-10 px-6 space-y-5 overflow-hidden"
            style={{
              background: 'oklch(93.5% 0.012 72)',
              border: '1.5px solid oklch(87% 0.015 72)',
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
              filter: revealed ? 'blur(0px)' : 'blur(6px)',
              transition:
                'opacity 0.65s cubic-bezier(0.16,1,0.3,1) 0.15s, transform 0.65s cubic-bezier(0.16,1,0.3,1) 0.15s, filter 0.65s cubic-bezier(0.16,1,0.3,1) 0.15s',
              willChange: 'transform, opacity',
            }}
          >
            <p
              className="font-mono text-[7.5px] uppercase tracking-[0.5em]"
              style={{ color: 'oklch(52% 0.015 60)' }}
            >
              ACCESS CODE
            </p>

            {/* Invite code — font-mono guarantees equal char widths so the code
                never overflows the box regardless of character mix (W, M, I, etc.).
                clamp caps at 44px: 8 chars × (26px mono width + 0.3em×44px tracking)
                = 8 × 39px = 312px which fits inside max-w-sm minus px-6 (≈ 336px). */}
            <p
              className="font-mono font-bold tracking-[0.3em] leading-none w-full"
              style={{
                fontSize: 'clamp(28px, 8vw, 44px)',
                color: 'oklch(16% 0.015 60)',
                overflowWrap: 'break-word',
                wordBreak: 'break-all',
              }}
            >
              {inviteCode}
            </p>

            <button
              onClick={copyCode}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full active:scale-95"
              style={{
                border: `1px solid ${copied ? 'oklch(65% 0.12 180 / 0.5)' : 'oklch(87% 0.015 72)'}`,
                background: copied ? 'oklch(65% 0.12 180 / 0.1)' : 'transparent',
                color: copied ? 'oklch(45% 0.12 180)' : 'oklch(52% 0.015 60)',
                transition:
                  'transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s, background 0.3s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.transform = 'translate3d(0,-2px,0)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.transform = 'translate3d(0,0,0)';
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span className="font-mono text-[8px] uppercase tracking-widest">
                {copied ? 'COPIED' : 'COPY CODE'}
              </span>
            </button>
          </div>

          {/* Actions */}
          <div
            className="space-y-3"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
              filter: revealed ? 'blur(0px)' : 'blur(6px)',
              transition:
                'opacity 0.65s cubic-bezier(0.16,1,0.3,1) 0.25s, transform 0.65s cubic-bezier(0.16,1,0.3,1) 0.25s, filter 0.65s cubic-bezier(0.16,1,0.3,1) 0.25s',
              willChange: 'transform, opacity',
            }}
          >
            <button
              onClick={() =>
                window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`, '_blank')
              }
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-ui font-black text-[10px] uppercase tracking-widest"
              style={{
                background: '#25D366',
                color: '#fff',
                boxShadow: '0 4px 24px rgba(37,211,102,0.2)',
                transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.transform = 'translate3d(0,-2px,0)';
                el.style.boxShadow = '0 12px 40px rgba(37,211,102,0.3)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.transform = 'translate3d(0,0,0)';
                el.style.boxShadow = '0 4px 24px rgba(37,211,102,0.2)';
              }}
            >
              <MessageCircle size={16} /> SHARE ON WHATSAPP
            </button>

            <button
              onClick={() => router.push(`/trips/${tripId}`)}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-ui font-black text-[10px] uppercase tracking-widest"
              style={{
                background: 'oklch(93.5% 0.012 72)',
                border: '1.5px solid oklch(87% 0.015 72)',
                color: 'oklch(16% 0.015 60)',
                transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.transform = 'translate3d(0,-2px,0)';
                el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.transform = 'translate3d(0,0,0)';
                el.style.boxShadow = 'none';
              }}
            >
              ENTER ARCHIVE <ArrowRight size={16} />
            </button>
          </div>

          <p
            className="font-mono text-[7px] uppercase tracking-[0.4em]"
            style={{
              color: 'oklch(70% 0.015 60)',
              opacity: revealed ? 1 : 0,
              transition: 'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.35s',
            }}
          >
            THEATRICAL RELEASE PENDING CAST CONFIRMATION
          </p>
        </div>
      </div>
    </div>
  );
}
