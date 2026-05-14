'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CinematicText, AtmosphericBlob } from '@/components/ui/atoms';
import { cn } from '@/lib/utils';
import { Save, Share2, Play, Mic, Shield, Star, Zap, Info } from 'lucide-react';

/* --- ARCHIVE NAVBAR --- */
export function ArchiveNavbar({ trip }: { trip: any }) {
  return (
    <nav className="sticky top-0 z-[100] w-full px-6 py-4 bg-black/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 bg-cooked-accent rounded-lg flex items-center justify-center font-black text-xs">W</div>
        <div className="hidden md:block h-8 w-px bg-white/10 mx-2" />
        <div className="hidden md:flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Current Archive</span>
          <span className="text-sm font-cinematic font-black tracking-tight">Season 2 – {trip.title}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="px-4 py-2 bg-cooked-accent text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Render Poster</button>
        <button className="px-4 py-2 bg-white/5 border border-white/10 text-white/60 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Share O.G.</button>
        <div className="h-8 w-px bg-white/10 mx-2" />
        <div className="flex items-center gap-3">
          <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">AI Story Mode</span>
          <div className="w-10 h-5 bg-cooked-accent rounded-full relative">
            <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
          </div>
        </div>
      </div>
    </nav>
  );
}

/* --- ARCHIVE HERO --- */
export function ArchiveHero({ trip }: { trip: any }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-[2.5rem] bg-[#14181C] border border-white/5 overflow-hidden p-8 md:p-12"
    >
      <AtmosphericBlob color="#FF3B2F" className="top-[-10%] right-[-10%] w-[400px] h-[400px] opacity-20" />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
        {/* Left Side: Context */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-cinematic font-black tracking-tighter leading-[0.85] text-[#F5F0E8]">
              Season 2: <br />
              {trip.title}
            </h1>
            <p className="text-lg md:text-xl text-white/40 font-cinematic italic max-w-md">
              "{trip.tagline || 'Analyzing trip dynamics...'}"
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button className="flex items-center gap-2 px-6 py-3 bg-cooked-accent text-white rounded-full text-[10px] font-black uppercase tracking-widest">
              <Save size={14} /> Save as Poster
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white/60 rounded-full text-[10px] font-black uppercase tracking-widest">
              Save Lore Card
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white/60 rounded-full text-[10px] font-black uppercase tracking-widest">
              Watch the Mini-Doc
            </button>
          </div>
        </div>

        {/* Right Side: Data Modules */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 rounded-3xl bg-black/40 border border-white/5 space-y-4">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold block mb-1">Delusion Index</span>
              <span className="text-5xl font-black font-vibe text-white">{trip.chaos_score}</span>
            </div>
            <p className="text-[10px] text-white/30 leading-relaxed italic">
              Why this hurts: your group genuinely believes a conspiracy theory about the bus' emotions.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-black/40 border border-white/5 space-y-4">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold block mb-1">Emotional Damage</span>
              <span className="text-5xl font-black font-vibe text-cooked-accent">9/10</span>
            </div>
            <p className="text-[10px] text-white/30 leading-relaxed italic">
              Top source: Midnight Confessions – unasked and deeply cinematic.
            </p>
          </div>

          <div className="col-span-2 p-6 rounded-3xl bg-cooked-accent/10 border border-cooked-accent/20 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-cooked-accent font-black block mb-1">Plot Twist</span>
                <span className="text-xl font-cinematic font-black text-white italic">The Bus Had Feelings</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-cooked-accent/20 flex items-center justify-center">
                <Info size={14} className="text-cooked-accent" />
              </div>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed">
              Kev convinced the group the bus operator was 'emotionally unavailable' and needed space. Lying scored him extra legroom.
            </p>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-cooked-accent text-white rounded-full text-[8px] font-black uppercase tracking-widest">Expose the Voicemail</button>
              <button className="px-4 py-2 bg-white/10 text-white rounded-full text-[8px] font-black uppercase tracking-widest">Blur for Privacy</button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* --- ARCHIVE REVEAL CARD --- */
export function ArchiveReveal({ 
  category, 
  name, 
  description, 
  revealTitle, 
  revealBody, 
  image, 
  color = "#FF3B2F",
  actions = []
}: {
  category: string;
  name: string;
  description: string;
  revealTitle: string;
  revealBody: string;
  image: string;
  color?: string;
  actions?: { label: string; icon?: React.ReactNode }[];
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="group relative rounded-[2.5rem] bg-[#14181C] border border-white/5 overflow-hidden flex flex-col md:flex-row h-auto md:h-[400px]"
    >
      <div className="w-full md:w-[45%] relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[5s] group-hover:scale-110"
          style={{ backgroundImage: `url(${image})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#14181C]" />
      </div>

      <div className="w-full md:w-[55%] p-8 md:p-12 flex flex-col justify-center space-y-6">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-white/40 font-bold block mb-2">{category} – {name}</span>
          <p className="text-[13px] text-white/50 leading-relaxed font-cinematic italic">
            {description}
          </p>
        </div>

        <div className="space-y-2">
          <span className="text-[9px] uppercase tracking-[0.3em] font-black block" style={{ color }}>{revealTitle}</span>
          <p className="text-sm text-white/80 leading-relaxed font-cinematic font-medium">
            {revealBody}
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          {actions.length > 0 ? actions.map((a, i) => (
             <button key={i} className={cn(
               "px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
               i === 0 ? "bg-cooked-accent text-white" : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
             )}>
               {a.label}
             </button>
          )) : (
            <>
              <button className="px-6 py-3 bg-cooked-accent text-white rounded-full text-[9px] font-black uppercase tracking-widest">Expose Her</button>
              <button className="px-6 py-3 bg-white/5 border border-white/10 text-white/60 rounded-full text-[9px] font-black uppercase tracking-widest">Make Poster</button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* --- SIDEBAR WIDGETS --- */
export function ProducerWidget({ cast }: { cast: any[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Producers</span>
        <div className="h-px flex-1 bg-white/5 ml-4" />
      </div>
      <div className="space-y-6">
        {cast.slice(0, 3).map((member, i) => (
          <div key={i} className="flex items-start gap-4 group">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 group-hover:border-cooked-accent transition-colors">
              <img src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.full_name}`} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <span className="text-sm font-bold text-white/90">{member.full_name}</span>
                <span className="text-[9px] uppercase tracking-widest text-cooked-accent font-black">Influence {Math.floor(Math.random() * 50) + 50}</span>
              </div>
              <p className="text-[10px] text-white/30 italic mb-2 leading-tight">"{member.tagline || 'Emotional triage and emergency snacks.'}"</p>
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase tracking-widest text-white/20 font-bold">Chaos</span>
                  <span className="text-xs font-black font-vibe text-white/60">{Math.floor(Math.random() * 100)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase tracking-widest text-white/20 font-bold">Lore</span>
                  <span className="text-xs font-black font-vibe text-white/60">{Math.floor(Math.random() * 40)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChaosChartWidget() {
  return (
    <div className="p-8 rounded-[2.5rem] bg-[#14181C] border border-white/5 space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Chaos Breakdown</span>
        <Shield size={14} className="text-white/20" />
      </div>
      
      <div className="aspect-square relative flex items-center justify-center">
        {/* Simple CSS Pie Chart representation */}
        <div className="w-40 h-40 rounded-full border-[15px] border-white/5 relative">
          <div className="absolute inset-0 rounded-full border-[15px] border-cooked-accent border-t-transparent border-l-transparent rotate-45" />
          <div className="absolute inset-0 rounded-full border-[15px] border-white/40 border-b-transparent border-r-transparent -rotate-12" />
        </div>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-black font-vibe">84%</span>
          <span className="text-[8px] uppercase font-bold text-white/20">Critical</span>
        </div>
      </div>

      <div className="space-y-2">
        {[
          { label: 'Hotel & Bus (Critical)', color: 'bg-cooked-accent', value: '45%' },
          { label: 'Group Chat (Extreme)', color: 'bg-white/60', value: '30%' },
          { label: 'Unasked Lore (Unstable)', color: 'bg-white/20', value: '25%' }
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", item.color)} />
              <span className="text-[9px] text-white/40 font-medium">{item.label}</span>
            </div>
            <span className="text-[10px] font-black text-white/60 font-vibe">{item.value}</span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-cooked-accent/60 italic text-center pt-2 border-t border-white/5">This chart is an indictment and a compliment.</p>
    </div>
  );
}

export function SchematicWidget() {
  return (
    <div className="p-8 rounded-[2.5rem] bg-[#14181C] border border-white/5 space-y-6">
       <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold block">Memory Schematic</span>
       <div className="aspect-[4/3] rounded-2xl overflow-hidden grayscale contrast-125 opacity-40 mix-blend-screen border border-white/10">
         <img src="https://images.unsplash.com/photo-1544620347-c4fd403d5957?q=80&w=2069" alt="" className="w-full h-full object-cover" />
       </div>
       <p className="text-[10px] text-white/30 italic leading-relaxed">
         Archive No. 8912 – Peak Midnight Confessions. Lore Battery died during cliff scene. Annotation: "Kev cried louder than the tide."
       </p>
    </div>
  );
}

/* --- CINEMATIC GALLERY CARD --- */
export function CinematicGalleryCard({ trip }: { trip: any }) {
  const isCooked = trip.chaos_score >= 80;
  const isUnstable = trip.chaos_score >= 50 && trip.chaos_score < 80;
  
  const statusLabel = isCooked ? 'Historically Cooked' : isUnstable ? 'Peak Delusion' : 'Stable Archive';
  const statusColor = isCooked ? 'text-cooked-accent' : isUnstable ? 'text-amber-500' : 'text-chill-accent';
  const borderColor = isCooked ? 'border-cooked-accent/20' : isUnstable ? 'border-amber-500/20' : 'border-white/10';

  return (
    <Link 
      href={`/trips/${trip.id}`}
      className={cn(
        "group relative block aspect-[4/5] rounded-[2.5rem] bg-[#14181C] border overflow-hidden transition-all duration-500 hover:scale-[1.02]",
        borderColor
      )}
    >
      <div className="absolute inset-0 grayscale contrast-125 opacity-40 group-hover:opacity-60 transition-opacity duration-700">
        <img 
          src="https://images.unsplash.com/photo-1544620347-c4fd403d5957?q=80&w=2069" 
          alt="" 
          className="w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-110"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      
      <div className="absolute inset-x-8 bottom-8 space-y-4">
        <div className="flex items-center gap-2">
          <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isCooked ? 'bg-cooked-accent' : 'bg-white/40')} />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">{statusLabel}</span>
        </div>
        
        <div>
          <span className="text-[10px] uppercase tracking-widest text-white/20 font-bold block mb-1">Archive No. {trip.id.slice(0,4)}</span>
          <h3 className="text-3xl font-cinematic font-black tracking-tighter leading-none text-[#F5F0E8] group-hover:text-cooked-accent transition-colors">
            {trip.title}
          </h3>
        </div>

        <p className="text-[11px] text-white/40 italic font-cinematic leading-relaxed line-clamp-2">
          "{trip.tagline || 'Documenting the missed transfers and off-brand hotels.'}"
        </p>

        <div className="flex justify-between items-end pt-4 border-t border-white/5">
          <div className="flex items-baseline gap-2">
            <span className={cn("text-4xl font-vibe font-black", statusColor)}>{trip.chaos_score}</span>
            <span className="text-[8px] uppercase tracking-[0.2em] text-white/20 font-bold">Chaos</span>
          </div>
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/20 group-hover:border-white/40 group-hover:text-white transition-all">
            <Play size={16} fill="currentColor" className="ml-1" />
          </div>
        </div>
      </div>

      {/* Floating Badge */}
      <div className="absolute top-8 right-8 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
        <span className="text-[8px] font-black uppercase tracking-widest text-white/60">Season {new Date(trip.created_at).getMonth() + 1}</span>
      </div>
    </Link>
  );
}

export function ArchiveFooter() {
  return (
    <footer className="mt-40 border-t border-white/5 pt-20 pb-40 px-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="space-y-4">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-black block">Theatrical Credits</span>
          <p className="text-[11px] text-white/20 leading-relaxed font-cinematic">
            Rendered by OG Poster Engine • Lore Pipeline v.2 • All inside joke detection active.<br /><br />
            Featuring Zara (Catalyst), Kev (Accidental Antagonist), Tom (Orchestrator). Under supervision by SAS ROFL.
          </p>
        </div>
        
        <div className="space-y-6 flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-black block">Share the Season</span>
          <div className="flex gap-4">
            <button className="px-8 py-4 bg-cooked-accent text-white rounded-full text-[10px] font-black uppercase tracking-widest">Share Poster</button>
            <button className="px-8 py-4 bg-white/5 border border-white/10 text-white/60 rounded-full text-[10px] font-black uppercase tracking-widest">Copy O.G. Link</button>
          </div>
        </div>

        <div className="space-y-4 text-right">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-black block">Micro-Lore Links</span>
          <div className="flex flex-col gap-2">
            <a href="#" className="text-[11px] text-white/20 hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-[11px] text-white/20 hover:text-white transition-colors">Terms</a>
            <a href="#" className="text-[11px] text-white/20 hover:text-white transition-colors">Report a Trip</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
