'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { CinematicText, AtmosphericBlob } from '@/components/ui/atoms';
import { cn } from '@/lib/utils';
import { Save, Share2, Play, Mic, Shield, Star, Zap, Info, ChevronRight, X } from 'lucide-react';

/* --- ARCHIVE NAVBAR --- */
export function ArchiveNavbar({ trip }: { trip: any }) {
  return (
    <nav className="sticky top-0 z-[100] w-full px-6 py-4 bg-black/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/trips" className="w-8 h-8 bg-cooked-accent rounded-lg flex items-center justify-center font-black text-xs text-white">W</Link>
        <div className="hidden md:block h-8 w-px bg-white/10 mx-2" />
        <div className="hidden md:flex flex-col">
          <span className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-black">Current File</span>
          <span className="text-sm font-cinematic font-black tracking-tight text-[#F5F0E8]">Season 2 – {trip.title}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-6 mr-6">
           <div className="flex flex-col items-end">
             <span className="text-[8px] uppercase tracking-widest text-white/20 font-black">Archive Health</span>
             <span className="text-[10px] font-black text-chill-accent uppercase tracking-widest">Stable</span>
           </div>
           <div className="flex flex-col items-end">
             <span className="text-[8px] uppercase tracking-widest text-white/20 font-black">Lore Density</span>
             <span className="text-[10px] font-black text-cooked-accent uppercase tracking-widest">Critical</span>
           </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="px-5 py-2.5 bg-cooked-accent text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,59,47,0.2)]">Render Poster</button>
          <button className="px-5 py-2.5 bg-white/5 border border-white/10 text-white/60 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Share O.G.</button>
        </div>
        
        <div className="h-8 w-px bg-white/10 mx-2" />
        
        <div className="flex items-center gap-3">
          <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold hidden sm:block">AI Story Mode</span>
          <div className="w-10 h-5 bg-cooked-accent/20 rounded-full relative cursor-pointer border border-cooked-accent/30">
            <div className="absolute right-1 top-1 w-3 h-3 bg-cooked-accent rounded-full shadow-[0_0_10px_rgba(255,59,47,0.5)]" />
          </div>
        </div>
      </div>
    </nav>
  );
}

/* --- ARCHIVE HERO (Dossier Style) --- */
export function ArchiveHero({ trip }: { trip: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Main Block: The Story */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-7 relative rounded-[3rem] bg-[#14181C] border border-white/5 overflow-hidden flex flex-col"
      >
        <div className="h-[300px] relative">
          <img 
            src="https://images.unsplash.com/photo-1544620347-c4fd403d5957?q=80&w=2069" 
            alt="" 
            className="w-full h-full object-cover grayscale opacity-60 contrast-125" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#14181C] via-[#14181C]/40 to-transparent" />
          
          <div className="absolute top-8 left-8 flex gap-3">
            <span className="px-3 py-1.5 rounded-full bg-cooked-accent text-white text-[8px] font-black uppercase tracking-[0.2em]">Chaos 12%</span>
            <span className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white/60 text-[8px] font-black uppercase tracking-[0.2em]">Inside Joke Detected</span>
            <span className="px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-500 text-[8px] font-black uppercase tracking-[0.2em] border border-amber-500/20">Trip Villain: Kev</span>
          </div>
        </div>

        <div className="p-12 space-y-8 flex-1">
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-cinematic font-black tracking-tighter leading-[0.85] text-[#F5F0E8] uppercase">
              Season 2: <br />
              {trip.title}
            </h1>
            <p className="text-xl text-white/30 font-cinematic italic max-w-lg leading-relaxed">
              "{trip.tagline || 'Documenting the missed transfers and off-brand hotels.'}"
            </p>
          </div>

          <div className="flex flex-wrap gap-4 pt-4">
            <button className="px-8 py-4 bg-cooked-accent text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-xl">
              Save as Poster
            </button>
            <button className="px-8 py-4 bg-white/5 border border-white/10 text-white/60 rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all">
              Save Lore Card
            </button>
            <button className="px-8 py-4 bg-white/5 border border-white/10 text-white/60 rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all flex items-center gap-2">
              <Play size={14} fill="currentColor" /> Watch the Mini-Doc
            </button>
          </div>
        </div>
      </motion.div>

      {/* Right Column: Stats & Plot Twist */}
      <div className="lg:col-span-5 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-6 h-1/2">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-8 rounded-[2.5rem] bg-[#14181C] border border-white/5 flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] uppercase tracking-widest text-white/20 font-black block mb-2">Delusion Index</span>
              <div className="text-6xl font-black font-vibe text-white">{trip.chaos_score}</div>
            </div>
            <p className="text-[10px] text-white/30 leading-relaxed italic">
              Why this hurts: your group genuinely believes a conspiracy theory about the bus' emotions.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-8 rounded-[2.5rem] bg-[#14181C] border border-white/5 flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] uppercase tracking-widest text-white/20 font-black block mb-2">Emotional Damage</span>
              <div className="text-6xl font-black font-vibe text-cooked-accent">9/10</div>
            </div>
            <p className="text-[10px] text-white/30 leading-relaxed italic">
              Top source: Midnight Confessions – unasked and deeply cinematic.
            </p>
          </motion.div>
        </div>

        {/* Plot Twist Block */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-10 rounded-[3rem] bg-cooked-accent/5 border border-cooked-accent/10 space-y-6"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-widest text-cooked-accent font-black block">Plot Twist</span>
              <h3 className="text-2xl font-cinematic font-black text-white italic">The Bus Had Feelings</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-cooked-accent/20 flex items-center justify-center">
              <Info size={16} className="text-cooked-accent" />
            </div>
          </div>
          
          <p className="text-[12px] text-white/50 leading-relaxed font-medium">
            Kev convinced the group the bus operator was 'emotionally unavailable' and needed space. Lying scored him extra legroom, stability, and the window seat.
          </p>
          
          <div className="flex gap-3 pt-2">
            <button className="px-6 py-3 bg-cooked-accent text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">Expose the Voicemail</button>
            <button className="px-6 py-3 bg-white/5 text-white/40 rounded-full text-[9px] font-black uppercase tracking-widest hover:text-white transition-all">Blur for Privacy</button>
          </div>
          
          <div className="pt-4 border-t border-white/5">
            <span className="text-[9px] text-white/20 italic uppercase tracking-widest">This feels like a mini-documentary. Screenshot worthy.</span>
          </div>
        </motion.div>
      </div>
    </div>
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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative rounded-[3rem] bg-[#14181C] border border-white/5 overflow-hidden flex flex-col md:flex-row h-auto md:h-[450px] shadow-2xl"
    >
      <div className="w-full md:w-[45%] relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[10s] group-hover:scale-110"
          style={{ backgroundImage: `url(${image})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-[#14181C]" />
      </div>

      <div className="w-full md:w-[55%] p-10 md:p-16 flex flex-col justify-center space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
             <span className="text-[11px] uppercase tracking-[0.3em] text-white/30 font-black">{category} – {name}</span>
          </div>
          <p className="text-base text-white/50 leading-relaxed font-cinematic italic">
            "{description}"
          </p>
        </div>

        <div className="space-y-3 p-6 rounded-3xl bg-white/[0.02] border border-white/5">
          <span className="text-[10px] uppercase tracking-[0.4em] font-black block" style={{ color }}>{revealTitle}</span>
          <p className="text-sm text-[#F5F0E8] leading-relaxed font-cinematic font-black uppercase tracking-tight">
            {revealBody}
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          {actions.length > 0 ? actions.map((a, i) => (
             <button key={i} className={cn(
               "px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
               i === 0 ? "bg-white text-black hover:scale-105" : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
             )}>
               {a.label}
             </button>
          )) : (
            <>
              <button className="px-8 py-4 bg-cooked-accent text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Expose Her</button>
              <button className="px-8 py-4 bg-white/5 border border-white/10 text-white/60 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Make Poster</button>
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
    <div className="p-8 rounded-[2.5rem] bg-[#14181C] border border-white/5 space-y-8">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-black">Producers</span>
        <div className="h-px w-12 bg-white/10" />
      </div>
      <div className="space-y-8">
        {cast.slice(0, 3).map((member, i) => (
          <div key={i} className="flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/5 group-hover:border-cooked-accent transition-all">
                <img src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.full_name}`} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-[#F5F0E8]">{member.full_name}</span>
                <span className="text-[9px] text-white/20 italic leading-tight max-w-[120px] line-clamp-1">"{member.tagline || 'Emotional triage and emergency snacks.'}"</span>
              </div>
            </div>
            <div className="text-right">
               <span className="text-[8px] uppercase tracking-widest text-white/20 font-black block">Influence</span>
               <span className="text-xs font-black font-vibe text-white/60">{Math.floor(Math.random() * 50) + 50}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChaosChartWidget() {
  return (
    <div className="p-8 rounded-[2.5rem] bg-[#14181C] border border-white/5 space-y-8 h-[400px] flex flex-col">
      <span className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-black block">Chaos Breakdown</span>
      
      <div className="flex-1 relative flex items-center justify-center">
        <div className="w-48 h-48 rounded-full border-[20px] border-white/5 relative">
          <div className="absolute inset-[-20px] rounded-full border-[20px] border-cooked-accent border-t-transparent border-l-transparent rotate-45" />
          <div className="absolute inset-[-20px] rounded-full border-[20px] border-white/40 border-b-transparent border-r-transparent -rotate-12" />
        </div>
        <div className="absolute flex flex-col items-center">
          <span className="text-4xl font-black font-vibe text-white">84%</span>
          <span className="text-[9px] uppercase font-black text-white/20 tracking-widest">Indicted</span>
        </div>
      </div>

      <div className="space-y-3 pt-6 border-t border-white/5">
        <p className="text-[10px] text-white/40 leading-relaxed italic">
          This chart is an indictment and a compliment. Group chat density: Extreme.
        </p>
      </div>
    </div>
  );
}

export function SchematicWidget() {
  return (
    <div className="p-8 rounded-[2.5rem] bg-[#14181C] border border-white/5 space-y-6">
       <span className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-black block">Memory Schematic</span>
       <div className="aspect-video rounded-3xl overflow-hidden border border-white/10 group relative">
         <img src="https://images.unsplash.com/photo-1544620347-c4fd403d5957?q=80&w=2069" alt="" className="w-full h-full object-cover grayscale contrast-125 group-hover:scale-105 transition-transform duration-700" />
         <div className="absolute inset-0 bg-cooked-accent/10 opacity-40 mix-blend-overlay" />
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
        "group relative block aspect-[4/5] rounded-[3rem] bg-[#14181C] border overflow-hidden transition-all duration-500 hover:scale-[1.02] shadow-2xl",
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
      
      <div className="absolute inset-x-8 bottom-10 space-y-4">
        <div className="flex items-center gap-2">
          <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isCooked ? 'bg-cooked-accent' : 'bg-white/40')} />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">{statusLabel}</span>
        </div>
        
        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-widest text-white/20 font-black block">Archive No. {trip.id.slice(0,4)}</span>
          <h3 className="text-3xl font-cinematic font-black tracking-tighter leading-none text-[#F5F0E8] group-hover:text-cooked-accent transition-colors uppercase">
            {trip.title}
          </h3>
        </div>

        <p className="text-[11px] text-white/40 italic font-cinematic leading-relaxed line-clamp-2">
          "{trip.tagline || 'Documenting the missed transfers and off-brand hotels.'}"
        </p>

        <div className="flex justify-between items-end pt-4 border-t border-white/5">
          <div className="flex items-baseline gap-2">
            <span className={cn("text-4xl font-vibe font-black", statusColor)}>{trip.chaos_score}</span>
            <span className="text-[8px] uppercase tracking-[0.2em] text-white/20 font-black">Chaos</span>
          </div>
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/20 group-hover:border-white/40 group-hover:text-white transition-all">
            <Play size={16} fill="currentColor" className="ml-1" />
          </div>
        </div>
      </div>

      <div className="absolute top-8 right-8 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
        <span className="text-[8px] font-black uppercase tracking-widest text-white/60">Season {new Date(trip.created_at).getMonth() + 1}</span>
      </div>
    </Link>
  );
}

/* --- SPOTIFY WRAPPED STYLE WRAPPER --- */
export function LoreWrapped({ trip, onFinish }: { trip: any; onFinish: () => void }) {
  const [step, setStep] = React.useState(0);
  
  const slides = [
    {
      title: "The Lore Begins",
      body: `You survived Season 2: ${trip.title}`,
      accent: "#FF3B2F",
      stat: "84 Chaos Score",
      desc: "This is objectively higher than 92% of your previous trips."
    },
    {
      title: "Top Archetype",
      body: "Zara became the group's Emotional Triage.",
      accent: "#1FA882",
      stat: "99 Influence",
      desc: "She single-handedly kept the vibes above sea level."
    },
    {
      title: "The Critical Moment",
      body: "The Bus That Betrayed Us",
      accent: "#D49E2D",
      stat: "3:00 AM",
      desc: "The exact moment Kev convinced you all the bus had 'feelings'."
    }
  ];

  const current = slides[step];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8 overflow-hidden"
    >
      <AtmosphericBlob color={current.accent} className="w-[80vw] h-[80vw] opacity-30 animate-pulse" />
      
      <button 
        onClick={onFinish}
        className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all z-50"
      >
        <X size={20} />
      </button>

      <div className="relative z-10 max-w-2xl w-full space-y-12 text-center">
        <motion.div
          key={step + 'title'}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-4"
        >
          <span className="text-[12px] uppercase tracking-[0.5em] text-white/30 font-black">{current.title}</span>
          <h2 className="text-6xl md:text-8xl font-black font-cinematic tracking-tighter leading-none text-[#F5F0E8] uppercase italic">
            {current.body}
          </h2>
        </motion.div>

        <motion.div
          key={step + 'stat'}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div className="text-[15vw] font-black font-vibe tracking-tighter leading-none" style={{ color: current.accent }}>
            {current.stat}
          </div>
          <p className="text-xl text-white/40 font-cinematic italic max-w-sm mx-auto">
            "{current.desc}"
          </p>
        </motion.div>
      </div>

      <div className="absolute bottom-12 inset-x-8 flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div key={i} className={cn(
              "h-1 rounded-full transition-all duration-500",
              i === step ? "w-12 bg-white" : "w-4 bg-white/10"
            )} />
          ))}
        </div>
        
        <button 
          onClick={() => step < slides.length - 1 ? setStep(step + 1) : onFinish()}
          className="px-10 py-5 bg-[#F5F0E8] text-black rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3 group"
        >
          {step < slides.length - 1 ? 'Next File' : 'Enter Archive'}
          <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}

/* --- ARCHIVE FOOTER --- */
export function ArchiveFooter() {
  return (
    <footer className="mt-40 border-t border-white/5 pt-24 pb-48 px-6 bg-white/[0.01]">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
        <div className="col-span-1 md:col-span-2 space-y-8">
          <span className="text-[11px] uppercase tracking-[0.5em] text-white/30 font-black block">Theatrical Credits</span>
          <p className="text-sm text-white/20 leading-relaxed font-cinematic max-w-md italic">
            Rendered by OG Poster Engine • Lore Pipeline v.2 • All inside joke detection active. Featuring Zara (Catalyst), Kev (Accidental Antagonist), Tom (Orchestrator). Under supervision by SAS ROFL.
          </p>
        </div>
        
        <div className="space-y-8">
          <span className="text-[11px] uppercase tracking-[0.5em] text-white/30 font-black block">Share the Season</span>
          <div className="flex flex-col gap-4 items-start">
            <button className="px-10 py-4 bg-cooked-accent text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-xl">Share Poster</button>
            <button className="px-10 py-4 bg-white/5 border border-white/10 text-white/60 rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all">Copy O.G. Link</button>
          </div>
        </div>

        <div className="space-y-8 text-right">
          <span className="text-[11px] uppercase tracking-[0.5em] text-white/30 font-black block">Micro-Lore Links</span>
          <div className="flex flex-col gap-3">
            <a href="#" className="text-[12px] text-white/20 hover:text-white transition-colors font-medium">Privacy Policy</a>
            <a href="#" className="text-[12px] text-white/20 hover:text-white transition-colors font-medium">Terms of Archive</a>
            <a href="#" className="text-[12px] text-white/20 hover:text-white transition-colors font-medium">Report a Trip</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
