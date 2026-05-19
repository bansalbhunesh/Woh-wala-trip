'use client';

import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { CinematicText, AtmosphericBlob } from '@/components/ui/atoms';

export function HeroScene({ trip }: { trip: any }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  return (
    <section className="relative h-[120vh] bg-black overflow-hidden flex flex-col justify-end pb-32">
      {/* Immersive Layers */}
      <AtmosphericBlob color="#FF3B2F" className="top-[10%] left-[-10%] w-[500px] h-[500px]" />
      <AtmosphericBlob color="#D49E2D" className="top-[40%] right-[-10%] w-[400px] h-[400px]" />

      <motion.div
        className="absolute inset-0 bg-cover bg-center grayscale opacity-40 mix-blend-screen"
        style={{
          y,
          opacity,
          backgroundImage: `url('https://images.unsplash.com/photo-1544620347-c4fd403d5957?q=80&w=2069&auto=format&fit=crop')`,
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      {/* Narrative Header */}
      <div className="relative z-10 px-8 space-y-6">
        <div className="space-y-2">
          <CinematicText variant="eyebrow" className="text-white/40">
            Season 2 · Archive No. {trip.id.slice(0, 4)}
          </CinematicText>
          <CinematicText variant="heading" className="text-7xl md:text-[12vw] leading-[0.8]">
            {trip.title.split(' ').map((word: string, i: number) => (
              <span key={i} className={i % 2 === 1 ? 'italic text-cooked-accent' : ''}>
                {word}{' '}
              </span>
            ))}
          </CinematicText>
        </div>

        <div className="flex flex-col md:flex-row gap-12 items-start md:items-center justify-between">
          <div className="max-w-md space-y-4">
            <CinematicText
              variant="italic"
              className="text-xl md:text-2xl text-white/40 leading-relaxed"
            >
              &ldquo;A documentary on off-brand hotels and their missed transfers.&rdquo;
            </CinematicText>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                <div className="w-2 h-2 rounded-full bg-cooked-accent animate-pulse" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">
                  Recording Live Lore
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button className="px-10 py-5 bg-[#F5F0E8] text-black rounded-full font-black text-[11px] uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_40px_rgba(245,240,232,0.1)]">
              Enter Archive
            </button>
            <button className="px-10 py-5 bg-white/5 border border-white/10 text-white/40 rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-white/10 transition-all">
              Watch Doc
            </button>
          </div>
        </div>
      </div>

      {/* Floating Chaos Score Watermark */}
      <div className="absolute top-20 right-8 text-[15vw] font-black text-white/[0.03] select-none pointer-events-none italic font-cinematic">
        {trip.chaos_score}
      </div>
    </section>
  );
}
