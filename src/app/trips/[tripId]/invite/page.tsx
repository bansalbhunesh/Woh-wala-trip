'use client';
import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { analytics } from '@/lib/analytics';
import { CinematicShell } from '@/components/experience/CinematicShell';
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
    <CinematicShell intensity={0.3}>
      <div className="film-grain" />
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm space-y-10 text-center">

          <div className="space-y-2"
               style={{
                 opacity: revealed ? 1 : 0,
                 transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
                 filter: revealed ? 'blur(0px)' : 'blur(6px)',
                 transition: 'opacity 0.65s cubic-bezier(0.16,1,0.3,1) 0.05s, transform 0.65s cubic-bezier(0.16,1,0.3,1) 0.05s, filter 0.65s cubic-bezier(0.16,1,0.3,1) 0.05s',
                 willChange: 'transform, opacity',
               }}>
            <p className="font-mono text-[8px] uppercase tracking-[0.6em]" style={{ color: 'rgba(255,77,77,0.5)' }}>
              ● ARCHIVE INITIALIZED
            </p>
            <h1 className="font-display font-black uppercase tracking-tighter leading-[0.85]"
                style={{ fontSize: 'clamp(32px, 6vw, 60px)', color: 'rgba(245,240,232,0.92)' }}>
              GATHER <em className="italic" style={{ color: '#FF4D4D' }}>THE CAST</em>
            </h1>
            <p className="font-display italic text-sm" style={{ color: 'rgba(245,240,232,0.25)' }}>
              "Lore is a team sport."
            </p>
          </div>

          {/* Code reveal */}
          <div className="rounded-2xl py-10 px-6 space-y-6"
               style={{
                 background: 'rgba(245,240,232,0.03)',
                 border: '1px solid rgba(245,240,232,0.07)',
                 opacity: revealed ? 1 : 0,
                 transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
                 filter: revealed ? 'blur(0px)' : 'blur(6px)',
                 transition: 'opacity 0.65s cubic-bezier(0.16,1,0.3,1) 0.15s, transform 0.65s cubic-bezier(0.16,1,0.3,1) 0.15s, filter 0.65s cubic-bezier(0.16,1,0.3,1) 0.15s',
                 willChange: 'transform, opacity',
               }}>
            <p className="font-mono text-[7.5px] uppercase tracking-[0.5em]" style={{ color: 'rgba(245,240,232,0.2)' }}>
              ACCESS CODE
            </p>
            <p className="font-display font-black tracking-[0.25em] leading-none"
               style={{ fontSize: 'clamp(36px, 9vw, 60px)', color: 'rgba(245,240,232,0.9)', textShadow: '0 0 40px rgba(255,77,77,0.15)' }}>
              {inviteCode}
            </p>
            <button onClick={copyCode}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full active:scale-95"
                    style={{
                      border: `1px solid ${copied ? 'rgba(45,158,139,0.5)' : 'rgba(245,240,232,0.1)'}`,
                      background: copied ? 'rgba(45,158,139,0.1)' : 'rgba(245,240,232,0.04)',
                      color: copied ? 'rgba(45,158,139,0.9)' : 'rgba(245,240,232,0.4)',
                      transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1), border-color 0.3s, background 0.3s',
                    }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = 'translate3d(0,-2px,0)'; el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = 'translate3d(0,0,0)'; el.style.boxShadow = 'none'; }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span className="font-mono text-[8px] uppercase tracking-widest">
                {copied ? 'COPIED' : 'COPY CODE'}
              </span>
            </button>
          </div>

          <div className="space-y-3"
               style={{
                 opacity: revealed ? 1 : 0,
                 transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,24px,0)',
                 filter: revealed ? 'blur(0px)' : 'blur(6px)',
                 transition: 'opacity 0.65s cubic-bezier(0.16,1,0.3,1) 0.25s, transform 0.65s cubic-bezier(0.16,1,0.3,1) 0.25s, filter 0.65s cubic-bezier(0.16,1,0.3,1) 0.25s',
                 willChange: 'transform, opacity',
               }}>
            <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`, '_blank')}
                    className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-ui font-black text-[10px] uppercase tracking-widest"
                    style={{ background: '#25D366', color: '#fff', boxShadow: '0 8px 32px rgba(37,211,102,0.2)', transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1)' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = 'translate3d(0,-2px,0)'; el.style.boxShadow = '0 16px 48px rgba(37,211,102,0.3)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = 'translate3d(0,0,0)'; el.style.boxShadow = '0 8px 32px rgba(37,211,102,0.2)'; }}>
              <MessageCircle size={16} /> SHARE ON WHATSAPP
            </button>
            <button onClick={() => router.push(`/trips/${tripId}`)}
                    className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-ui font-black text-[10px] uppercase tracking-widest"
                    style={{ border: '1px solid rgba(255,77,77,0.3)', background: 'rgba(255,77,77,0.08)', color: 'rgba(255,77,77,0.9)', transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1)' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = 'translate3d(0,-2px,0)'; el.style.boxShadow = '0 8px 30px rgba(255,77,77,0.2)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = 'translate3d(0,0,0)'; el.style.boxShadow = 'none'; }}>
              ENTER ARCHIVE <ArrowRight size={16} />
            </button>
          </div>

          <p className="font-mono text-[7px] uppercase tracking-[0.4em]"
             style={{
               color: 'rgba(245,240,232,0.1)',
               opacity: revealed ? 1 : 0,
               transition: 'opacity 0.55s cubic-bezier(0.16,1,0.3,1) 0.35s',
             }}>
            THEATRICAL RELEASE PENDING CAST CONFIRMATION
          </p>
        </div>
      </div>
    </CinematicShell>
  );
}
