'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CinematicText } from '@/components/ui/atoms';

export function ChaosMeter({ score, label = "Delusion Index" }: { score: number; label?: string }) {
  return (
    <div className="relative group">
      <div className="absolute -top-10 -left-10 text-[20vw] font-black text-white/[0.02] pointer-events-none select-none uppercase font-cinematic italic">
        Chaos
      </div>
      <div className="relative z-10 flex flex-col items-center text-center">
        <CinematicText variant="eyebrow" className="mb-4">{label}</CinematicText>
        <div className="text-[25vw] md:text-[18vw] font-black tracking-tighter leading-none text-cooked-accent drop-shadow-[0_0_80px_rgba(255,59,47,0.3)]">
          {score}
        </div>
        <div className="flex gap-1.5 mt-8">
           {Array.from({ length: 10 }).map((_, i) => (
             <motion.div 
               key={i}
               initial={{ scaleY: 0 }}
               whileInView={{ scaleY: 1 }}
               transition={{ delay: i * 0.05 }}
               className={cn(
                 "w-1.5 h-6 rounded-full",
                 i < score / 10 ? 'bg-cooked-accent' : 'bg-white/5'
               )}
             />
           ))}
        </div>
      </div>
    </div>
  );
}

export function TimelineArchive({ events }: { events: { time: string; event: string; type: string }[] }) {
  return (
    <div className="space-y-0 border-l border-white/5 ml-4">
      {events.map((e, i) => (
        <div key={i} className="pl-10 py-10 relative group">
          <div className="absolute left-[-4.5px] top-12 w-2 h-2 rounded-full bg-black border border-white/20 group-hover:bg-cooked-accent transition-colors" />
          <CinematicText variant="eyebrow" className="mb-2 text-white/40">{e.time}</CinematicText>
          <CinematicText variant="heading" className="text-2xl mb-4 tracking-normal normal-case italic font-medium text-white/90 leading-tight">
            "{e.event}"
          </CinematicText>
          <div className="text-[10px] uppercase tracking-widest text-white/20 font-bold">Documented Phase · {e.type}</div>
        </div>
      ))}
    </div>
  );
}
