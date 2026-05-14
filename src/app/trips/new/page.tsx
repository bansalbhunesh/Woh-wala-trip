'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { FilmGrain, AtmosphericBlob, CinematicText } from '@/components/ui/atoms';
import { ChevronLeft, Sparkles, Calendar, MapPin, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NewTripPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const createTrip = trpc.trips.create.useMutation({
    onSuccess: (trip) => {
      router.push(`/trips/${trip.id}/invite`);
    },
  });

  const isReady = name && startDate && endDate && !createTrip.isPending;

  return (
    <div className="min-h-screen bg-black text-[#F5F0E8] font-cinematic selection:bg-cooked-accent selection:text-white pb-32 overflow-hidden relative">
      <FilmGrain />
      <AtmosphericBlob color="#FF3B2F" className="top-[-10%] left-[-10%] w-[500px] h-[500px] opacity-20" />
      <AtmosphericBlob color="#D49E2D" className="bottom-[-10%] right-[-10%] w-[400px] h-[400px] opacity-10" />

      <header className="max-w-2xl mx-auto px-6 pt-16 pb-12 relative z-10">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/20 hover:text-white transition-colors mb-8 group"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Cancel Archive
        </button>
        
        <div className="space-y-4">
          <CinematicText variant="eyebrow" className="text-white/40">The Setup</CinematicText>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none font-cinematic">
            New<br />
            <span className="italic text-cooked-accent">Season</span>
          </h1>
          <p className="text-lg text-white/40 italic max-w-sm">
            "Every disaster starts with a group chat and a date. Let's initialize yours."
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 space-y-12 relative z-10">
        <div className="space-y-8">
          <CinematicField 
            label="Season Title" 
            icon={<Type size={18} />}
            value={name} 
            onChange={setName} 
            placeholder="e.g. The Bus That Betrayed Us" 
          />

          <CinematicField
            label="Filming Location"
            icon={<MapPin size={18} />}
            value={destination}
            onChange={setDestination}
            placeholder="e.g. Midnight Coimbatore"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <CinematicField 
              label="Season Premiere" 
              icon={<Calendar size={18} />}
              value={startDate} 
              onChange={setStartDate} 
              type="date" 
            />
            <CinematicField 
              label="Season Finale" 
              icon={<Calendar size={18} />}
              value={endDate} 
              onChange={setEndDate} 
              type="date" 
            />
          </div>
        </div>

        <div className="pt-8">
          <button
            onClick={() =>
              createTrip.mutate({
                name,
                destination: destination || undefined,
                startDate,
                endDate,
              })
            }
            disabled={!isReady}
            className={cn(
              "w-full py-8 rounded-[2rem] flex items-center justify-center gap-4 transition-all duration-500",
              isReady 
                ? "bg-cooked-accent text-white shadow-[0_0_50px_rgba(255,59,47,0.3)] hover:scale-[1.02] active:scale-95" 
                : "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed"
            )}
          >
            <Sparkles size={20} className={cn(createTrip.isPending && "animate-spin")} />
            <span className="text-[11px] font-black uppercase tracking-[0.4em]">
              {createTrip.isPending ? 'Initializing Lore...' : 'Launch the Season'}
            </span>
          </button>

          {createTrip.error && (
            <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-cooked-accent font-black">
              Error: {createTrip.error.message}
            </p>
          )}
        </div>
      </main>

      {/* Decorative Floor */}
      <div className="mt-20 border-t border-white/5 pt-12 text-center opacity-20">
         <span className="text-[8px] uppercase tracking-[0.5em] font-black">Lore Pipeline v.2 Active</span>
      </div>
    </div>
  );
}

function CinematicField({
  label,
  value,
  onChange,
  placeholder,
  icon,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: string;
}) {
  return (
    <div className="space-y-3 group">
      <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/40 font-black ml-1 group-focus-within:text-cooked-accent transition-colors">
        {icon} {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] px-8 py-6 text-xl font-cinematic font-medium text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-cooked-accent/30 focus:bg-white/[0.07] focus:border-cooked-accent/50 transition-all selection:bg-cooked-accent"
      />
    </div>
  );
}
