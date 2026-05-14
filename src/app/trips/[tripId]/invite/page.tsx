'use client';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

export default function InvitePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  
  const { data: tripData } = trpc.trips.getFull.useQuery({ tripId });
  
  const trip = (tripData as any)?.trip;
  const inviteCode = trip?.invite_code || '';
  const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/join/${inviteCode}` : '';
  const whatsappMessage = `Aaye yaar, ${trip?.name} ka archive bana raha hoon. Apne photos upload karo: ${inviteLink}`;
  
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
    <div className="min-h-screen bg-[#FAF8F4] p-6 flex flex-col">
      <header className="pt-16 mb-12 text-center">
        <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 animate-bounce">
          🎉
        </div>
        <h1 className="text-3xl font-outfit font-medium tracking-tight mb-2">Trip created!</h1>
        <p className="text-gray-500">Now, bring in the chaos.</p>
      </header>
      
      <div className="bg-white rounded-[2rem] p-10 text-center shadow-premium border border-gray-100 flex-1 flex flex-col justify-center mb-12 animate-in zoom-in-95 duration-500">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 mb-6">Your invite code</p>
        <p className="text-5xl font-mono tracking-[0.1em] font-medium mb-10 select-all">{inviteCode}</p>
        <button
          onClick={copyCode}
          className="mx-auto text-sm py-2.5 px-6 border border-gray-200 rounded-full font-medium hover:bg-gray-50 active:scale-95 transition-all"
        >
          {copied ? 'Copied to clipboard!' : 'Copy code'}
        </button>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={shareWhatsApp}
          className="w-full py-5 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all"
        >
          <span className="text-xl">WhatsApp</span>
          <span>Share Link</span>
        </button>
        
        <button
          onClick={() => router.push(`/trips/${tripId}`)}
          className="w-full py-5 bg-transparent text-gray-400 font-medium active:scale-[0.98] transition-all"
        >
          Skip, take me to trip
        </button>
      </div>
    </div>
  );
}
