'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { FilmGrain, AtmosphericBlob, CinematicText } from '@/components/ui/atoms';
import { Copy, Share2, ArrowRight, MessageCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InvitePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const { data: tripData } = trpc.trips.getFull.useQuery({ tripId });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trip = (tripData as any)?.trip;
  const inviteCode = trip?.invite_code || '';
  const tripName = trip?.title || 'this trip';
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
    <div className="min-h-screen bg-black text-[#F5F0E8] font-cinematic selection:bg-cooked-accent selection:text-white pb-32 overflow-hidden relative">
      <FilmGrain />
      <AtmosphericBlob color="#FF3B2F" className="top-[-10%] right-[-10%] w-[500px] h-[500px] opacity-20" />
      <AtmosphericBlob color="#1FA882" className="bottom-[-10%] left-[-10%] w-[400px] h-[400px] opacity-10" />

      <header className="max-w-2xl mx-auto px-6 pt-24 pb-12 text-center space-y-6 relative z-10">
        <CinematicText variant="eyebrow" className="text-white/40">Archive Initialized</CinematicText>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.8] font-cinematic">
          Gather<br />
          <span className="italic text-cooked-accent">The Cast</span>
        </h1>
        <p className="text-lg text-white/40 italic max-w-sm mx-auto">
          "Lore is a team sport. Invite your group to upload their photo dumps and questionable decisions."
        </p>
      </header>

      <main className="max-w-2xl mx-auto px-6 space-y-8 relative z-10">
        {/* Invite Code Card */}
        <div className="relative overflow-hidden rounded-[3rem] bg-white/[0.03] border border-white/10 p-12 text-center group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-cooked-accent/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-cooked-accent/10 transition-all duration-700" />
          
          <span className="text-[10px] uppercase tracking-[0.5em] text-white/20 font-black block mb-6">Secret Access Key</span>
          
          <div className="relative inline-block mb-10">
            <span className="text-6xl md:text-8xl font-vibe font-black tracking-[0.2em] text-[#F5F0E8] drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              {inviteCode}
            </span>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={copyCode} 
              className={cn(
                "flex items-center gap-3 px-10 py-5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all",
                copied 
                  ? "bg-chill-accent/20 text-chill-accent border border-chill-accent/30" 
                  : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied to Lore' : 'Copy Access Key'}
            </button>
          </div>
        </div>

        {/* Share Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={shareWhatsApp}
            className="group flex items-center justify-center gap-4 py-6 bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-[#25D366] hover:text-white transition-all shadow-[0_0_40px_rgba(37,211,102,0.1)]"
          >
            <MessageCircle size={20} />
            Share on WhatsApp
          </button>

          <button
            onClick={() => router.push(`/trips/${tripId}`)}
            className="group flex items-center justify-center gap-4 py-6 bg-white text-black rounded-full text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)]"
          >
            Go to Archive
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <p className="text-center text-[9px] uppercase tracking-[0.4em] text-white/10 font-black pt-8">
          Theatrical Release Pending Cast Confirmation
        </p>
      </main>
    </div>
  );
}
