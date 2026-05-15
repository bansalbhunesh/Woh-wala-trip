'use client';
import { use } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';

export default function ShareCardPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();
  const { data: tripData } = trpc.trips.getFull.useQuery({ tripId });
  
  const trip = (tripData as any)?.trip;
  const lore = trip?.lore_json;
  
  if (!lore) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
        <p className="mt-4 text-sm text-gray-400 font-inter">Rendering your card...</p>
      </div>
    );
  }
  
  const cardImageUrl = `/api/card/${tripId}`;
  
  const shareToWhatsApp = () => {
    const msg = `${lore.whatsapp_caption || lore.tagline} ${window.location.origin}/trips/${tripId}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };
  
  return (
    <div className="min-h-screen bg-[#FAF8F4] p-6 pb-12">
      <header className="mb-8 pt-8">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm active:scale-90 transition-all"
        >
          ←
        </button>
      </header>
      
      <div className="max-w-md mx-auto animate-in zoom-in-95 duration-500">
        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100">
          <img
            src={cardImageUrl}
            alt="Trip card"
            className="w-full aspect-[9/16] object-cover"
          />
        </div>
        
        <div className="mt-12 space-y-4">
          <button
            onClick={shareToWhatsApp}
            className="btn-primary w-full shadow-lg py-5 flex items-center justify-center gap-3 bg-[#25D366]"
          >
            Share to WhatsApp
          </button>
          
          <a
            href={cardImageUrl}
            download={`${trip.name.replace(/\s+/g, '-')}-card.png`}
            className="btn-secondary w-full py-5 flex items-center justify-center"
          >
            Download Image
          </a>
        </div>
        
        <div className="mt-12 p-6 bg-amber-50 rounded-3xl border border-amber-100 text-center">
          <p className="text-xs text-amber-700 font-inter leading-relaxed">
            Free cards have a small watermark. Upgrade to <span className="font-bold">Digital Tier (₹299)</span> to remove it and unlock permanent hosting.
          </p>
        </div>
      </div>
    </div>
  );
}
