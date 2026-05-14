import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { LoreJson } from '@/lib/types';
import { FilmGrain, AtmosphericBlob, CinematicText } from '@/components/ui/atoms';
import { ArchiveFooter } from '@/components/cinematic/ArchiveRoom';
import { Play, Shield, Users, Calendar } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: trip } = await supabase
    .from('trips')
    .select('name, destination, lore_json, chaos_score')
    .eq('invite_code', code.toUpperCase())
    .single();

  if (!trip) return { title: 'Woh Wala Trip' };

  const lore = (trip as any).lore_json as LoreJson | null;

  return {
    title: lore?.trip_title || (trip as any).name,
    description: lore?.tagline || `${(trip as any).destination} trip archive`,
    openGraph: {
      title: lore?.trip_title || (trip as any).name,
      description: lore?.tagline,
      images: [
        {
          url: `/api/card/${code}`,
          width: 1080,
          height: 1920,
          alt: lore?.trip_title || (trip as any).name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: lore?.trip_title || (trip as any).name,
      description: lore?.tagline,
    },
  };
}

export default async function PublicLorePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: tripData } = await supabase
    .from('trips')
    .select('id, name, destination, chaos_score, member_count, lore_json, tier, invite_code, trip_start_date, trip_end_date')
    .eq('invite_code', code.toUpperCase())
    .single();

  if (!tripData) redirect('/');
  const trip = tripData as any;

  const lore = trip.lore_json as LoreJson | null;
  if (!lore) redirect(`/trips/join?code=${code}`);

  const cookedLevel = lore.cooked_level ?? trip.chaos_score ?? 60;
  const duration = computeDays(trip.trip_start_date, trip.trip_end_date);

  return (
    <div className="min-h-screen bg-black text-[#F5F0E8] font-cinematic selection:bg-cooked-accent selection:text-white overflow-x-hidden">
      <FilmGrain />
      
      {/* Immersive Teaser Hero */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 py-20 overflow-hidden">
        <AtmosphericBlob color="#FF3B2F" className="top-[-10%] right-[-10%] w-[600px] h-[600px] opacity-20" />
        <AtmosphericBlob color="#D49E2D" className="bottom-[10%] left-[-10%] w-[400px] h-[400px] opacity-10" />
        
        {/* Parallax Background Tease */}
        <div className="absolute inset-0 grayscale contrast-125 opacity-20 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1544620347-c4fd403d5957?q=80&w=2069" 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto w-full space-y-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.4em] text-white/40 font-black">
              <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10">Private Release</span>
              <span>{trip.destination}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cooked-accent animate-pulse" />
            </div>
            
            <h1 className="text-7xl md:text-[12vw] font-black tracking-tighter leading-[0.8] uppercase font-cinematic">
              {lore.trip_title.split(' ').map((word: string, i: number) => (
                <span key={i} className={i % 2 === 1 ? 'italic text-cooked-accent block md:inline' : 'block md:inline'}>{word} </span>
              ))}
            </h1>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-12">
            <div className="flex-1 space-y-6">
              <p className="text-3xl md:text-4xl font-cinematic italic text-white/80 leading-tight">
                &ldquo;{lore.tagline}&rdquo;
              </p>
              <div className="h-px w-20 bg-cooked-accent" />
            </div>

            <div className="flex items-baseline gap-6 bg-white/[0.03] border border-white/5 p-8 rounded-[3rem] backdrop-blur-xl">
              <span className="text-8xl font-vibe font-black tracking-tighter leading-none text-cooked-accent">
                {cookedLevel}
              </span>
              <div className="flex flex-col">
                <span className="text-xl font-vibe font-black uppercase tracking-tight text-white/90 leading-none">
                  {lore.cooked_verdict}
                </span>
                <span className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] mt-2">Chaos Rating</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <StatCard icon={<Users size={14} />} label="Cast" value={`${trip.member_count} Members`} />
             <StatCard icon={<Calendar size={14} />} label="Runtime" value={`${duration} Days`} />
             <StatCard icon={<Shield size={14} />} label="Security" value="Encrypted" />
             <StatCard icon={<Play size={14} />} label="Status" value="Live Lore" />
          </div>

          <div className="flex flex-col sm:flex-row gap-6 pt-12">
            <Link
              href={`/trips/join?code=${trip.invite_code}`}
              className="group flex items-center justify-center gap-4 px-12 py-8 bg-[#F5F0E8] text-black rounded-full font-black uppercase tracking-[0.3em] text-[11px] hover:scale-105 active:scale-95 transition-all shadow-[0_0_60px_rgba(245,240,232,0.1)]"
            >
              Join the Season
              <ArrowRight className="group-hover:translate-x-2 transition-transform" />
            </Link>
            <Link
              href={`/api/card/${trip.invite_code}`}
              target="_blank"
              className="flex items-center justify-center gap-4 px-12 py-8 border border-white/10 bg-white/[0.03] text-white/60 rounded-full font-black uppercase tracking-[0.3em] text-[11px] hover:bg-white/10 hover:text-white transition-all"
            >
              Identity Card
            </Link>
          </div>
        </div>
      </section>

      {/* Recap Section */}
      {lore.season_recap?.full_narrative && (
        <section className="px-6 py-40 border-t border-white/5 bg-white/[0.01] relative overflow-hidden">
          <AtmosphericBlob color="#FF3B2F" className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-[0.03]" />
          <div className="max-w-3xl mx-auto space-y-12 relative z-10 text-center">
            <CinematicText variant="eyebrow" className="text-white/20">The Oral History</CinematicText>
            <p className="text-3xl md:text-5xl font-cinematic italic text-[#F5F0E8] leading-[1.2] tracking-tight">
              &ldquo;{lore.season_recap.full_narrative}&rdquo;
            </p>
            <div className="text-[9px] uppercase tracking-[0.5em] text-white/10 font-black">Archive Extract 88.2</div>
          </div>
        </section>
      )}

      <ArchiveFooter />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-white/20 font-black">
        {icon} {label}
      </div>
      <div className="text-sm font-black text-white/80">{value}</div>
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg 
      width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14m-7-7 7 7-7 7"/>
    </svg>
  );
}

function computeDays(start: string | null, end: string | null): number {
  if (!start || !end) return 3;
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);
}
