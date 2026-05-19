'use client';

import React from 'react';
import { CinematicText } from '@/components/ui/atoms';

export function Act({ title, sub, act }: { title: string; sub?: string; act: number }) {
  return (
    <section className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-8 border-y border-white/[0.03]">
      <div className="space-y-12 max-w-2xl">
        <div className="space-y-4">
          <CinematicText variant="eyebrow" className="text-white/40">
            Act {act}
          </CinematicText>
          <div className="h-px w-12 bg-cooked-accent mx-auto" />
        </div>
        <CinematicText variant="heading" className="text-6xl md:text-8xl leading-none">
          {title}
        </CinematicText>
        {sub && (
          <CinematicText variant="italic" className="text-xl md:text-2xl opacity-40">
            {sub}
          </CinematicText>
        )}
      </div>
    </section>
  );
}

export function TheatricalCredits({ trip }: { trip: any }) {
  return (
    <footer className="px-8 py-32 bg-black border-t border-white/5 space-y-24">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
        <div className="space-y-6">
          <CinematicText variant="eyebrow">Credits</CinematicText>
          <div className="space-y-2 text-[10px] uppercase tracking-widest text-white/30 font-bold leading-relaxed">
            <p>Rendered by Lore Engine v2.4</p>
            <p>Acoustic Analysis: Enabled</p>
            <p>Friendship Hardening: Critical</p>
          </div>
        </div>

        <div className="space-y-6 text-center">
          <CinematicText variant="eyebrow">Share the Lore</CinematicText>
          <div className="flex flex-col gap-3 items-center">
            <button className="px-10 py-4 bg-[#F5F0E8] text-black rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-2xl">
              Export Poster
            </button>
            <button className="text-[9px] uppercase tracking-widest text-white/20 hover:text-white transition-colors">
              Copy Short Link
            </button>
          </div>
        </div>

        <div className="space-y-6 text-right">
          <CinematicText variant="eyebrow">Archive Metadata</CinematicText>
          <div className="text-[10px] uppercase tracking-widest text-white/20 leading-relaxed font-bold">
            <p>Location: {trip.location || 'Unknown'}</p>
            <p>Season: {new Date(trip.created_at).getFullYear()}</p>
            <p>© {new Date().getFullYear()} WOTB</p>
          </div>
        </div>
      </div>

      <div className="text-center opacity-10 font-cinematic italic text-xs tracking-[0.5em] uppercase">
        yaarlore
      </div>
    </footer>
  );
}
