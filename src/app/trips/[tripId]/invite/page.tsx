'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Copy, Check, MessageCircle, ArrowRight } from 'lucide-react';

export default function InvitePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const { data: tripData } = trpc.trips.getFull.useQuery({ tripId });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trip = (tripData as any)?.trip;
  const inviteCode = trip?.invite_code || '––––';
  const tripName = trip?.name || 'this trip';
  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/trips/join?code=${inviteCode}`;
  const whatsappMsg = `Yaar, ${tripName} ka archive bana raha hoon 📸 Apne photos upload karo: ${inviteLink}`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="light-grain" />

      <div className="relative z-10 w-full max-w-sm space-y-8 text-center">

        <div className="space-y-2">
          <p className="text-[9px] font-ui font-bold uppercase tracking-[0.45em]"
             style={{ color: 'var(--text-muted)' }}>Archive Initialized</p>
          <h1 className="font-display font-black tracking-tighter leading-[0.85]"
              style={{ fontSize: 'clamp(36px, 7vw, 64px)', color: 'var(--text)' }}>
            Gather <em className="italic" style={{ color: 'var(--accent)' }}>The Cast</em>
          </h1>
          <p className="text-sm font-display italic" style={{ color: 'var(--text-muted)' }}>
            "Lore is a team sport."
          </p>
        </div>

        {/* Code card */}
        <div className="rounded-3xl p-8 space-y-6"
             style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border)' }}>
          <p className="text-[9px] font-ui font-bold uppercase tracking-widest"
             style={{ color: 'var(--text-muted)' }}>Secret Access Key</p>

          <p className="font-display font-black tracking-[0.2em] leading-none"
             style={{ fontSize: 'clamp(40px, 10vw, 64px)', color: 'var(--text)' }}>
            {inviteCode}
          </p>

          <button
            onClick={copyCode}
            className="mx-auto flex items-center gap-2 px-7 py-3 rounded-full text-[10px] font-ui font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
            style={{
              background: copied ? 'oklch(65% 0.12 180 / 0.15)' : 'var(--bg)',
              border: `1.5px solid ${copied ? 'oklch(65% 0.12 180)' : 'var(--border)'}`,
              color: copied ? 'oklch(65% 0.12 180)' : 'var(--text-muted)',
            }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Key'}
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`, '_blank')}
            className="flex items-center justify-center gap-3 py-4 rounded-2xl text-[11px] font-ui font-black uppercase tracking-widest transition-all hover:scale-[1.02]"
            style={{ background: '#25D366', color: '#fff' }}>
            <MessageCircle size={17} /> Share on WhatsApp
          </button>

          <button
            onClick={() => router.push(`/trips/${tripId}`)}
            className="flex items-center justify-center gap-3 py-4 rounded-2xl text-[11px] font-ui font-black uppercase tracking-widest transition-all hover:scale-[1.02]"
            style={{ background: 'var(--text)', color: 'var(--bg)' }}>
            Go to Archive <ArrowRight size={17} />
          </button>
        </div>

        <p className="text-[9px] font-ui font-bold uppercase tracking-[0.35em]"
           style={{ color: 'var(--text-muted)', opacity: 0.35 }}>
          Theatrical Release Pending Cast Confirmation
        </p>
      </div>
    </div>
  );
}
