'use client';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

export default function InvitePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const { data: trip } = trpc.trips.getFull.useQuery({ tripId });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inviteCode = (trip as any)?.trip?.invite_code || '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tripName = (trip as any)?.trip?.name || 'this trip';
  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${inviteCode}`;
  const whatsappMessage = `Aaye yaar, ${tripName} ka archive bana raha hoon. Apne photos upload karo: ${inviteLink}`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <header className="pt-20 pb-10 text-center space-y-2">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-vibe">Archive Created</p>
        <h1 className="text-5xl font-cinematic font-medium text-cooked-bg leading-tight">Gather the Cast</h1>
        <p className="text-sm text-gray-400 font-data font-light max-w-xs mx-auto">
          Lore is a team sport. Invite your group to upload their photo dumps.
        </p>
      </header>

      <div className="relative overflow-hidden bg-gray-50 border border-gray-100 rounded-[2.5rem] p-10 text-center mb-8">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cooked-accent/5 rounded-full -mr-12 -mt-12 blur-2xl" />
        <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-vibe mb-4">Secret Access Key</p>
        <p className="text-5xl font-vibe font-bold tracking-[0.3em] mb-8 text-cooked-bg">{inviteCode}</p>
        <button 
          onClick={copyCode} 
          className="text-[10px] uppercase tracking-widest font-vibe font-bold py-3 px-8 bg-white border border-gray-100 rounded-full shadow-sm hover:bg-gray-50 transition-all"
        >
          {copied ? 'Copied to Lore' : 'Copy Access Key'}
        </button>
      </div>

      <div className="space-y-4">
        <button
          onClick={shareWhatsApp}
          className="w-full py-5 bg-[#25D366] text-white rounded-full font-vibe font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 shadow-xl shadow-[#25D366]/20 hover:scale-[1.02] transition-transform"
        >
          Share on WhatsApp
        </button>

        <button
          onClick={() => router.push(`/trips/${tripId}`)}
          className="w-full py-5 text-[10px] uppercase tracking-widest font-vibe text-gray-400 hover:text-cooked-bg transition-colors"
        >
          Skip to Trip Archive →
        </button>
      </div>
    </div>
  );
}
