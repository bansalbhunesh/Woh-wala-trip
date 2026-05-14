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
      <header className="pt-8 mb-12 text-center">
        <h1 className="text-2xl font-medium mb-2">Trip created</h1>
        <p className="text-sm text-gray-500">Share the code with your group</p>
      </header>

      <div className="border-2 border-black rounded-2xl p-8 text-center mb-8">
        <p className="text-xs text-gray-500 mb-3">YOUR INVITE CODE</p>
        <p className="text-4xl font-mono tracking-widest mb-6">{inviteCode}</p>
        <button onClick={copyCode} className="text-sm py-2 px-4 border border-gray-300 rounded-lg">
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>

      <button
        onClick={shareWhatsApp}
        className="w-full py-4 bg-[#25D366] text-white rounded-xl font-medium flex items-center justify-center gap-2"
      >
        Share on WhatsApp
      </button>

      <button
        onClick={() => router.push(`/trips/${tripId}`)}
        className="w-full py-4 mt-3 border border-gray-300 rounded-xl font-medium"
      >
        Skip — go to trip
      </button>
    </div>
  );
}
