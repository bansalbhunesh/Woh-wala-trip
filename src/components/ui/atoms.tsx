'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function CinematicText({ 
  children, 
  variant = 'heading', 
  className 
}: { 
  children: React.ReactNode; 
  variant?: 'heading' | 'data' | 'eyebrow' | 'italic'; 
  className?: string;
}) {
  const styles = {
    heading: 'font-cinematic font-black tracking-tighter uppercase leading-[0.85]',
    data: 'font-vibe font-bold uppercase tracking-[0.2em]',
    eyebrow: 'font-vibe font-bold uppercase tracking-[0.4em] text-white/20 text-[9px]',
    italic: 'font-cinematic italic text-white/60 tracking-tight',
  };

  return (
    <div className={cn(styles[variant], className)}>
      {children}
    </div>
  );
}

export function AtmosphericBlob({ 
  color = '#FF3B2F', 
  className 
}: { 
  color?: string; 
  className?: string;
}) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.05, 0.1, 0.05],
        x: [0, 50, 0],
        y: [0, -30, 0],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className={cn("absolute rounded-full blur-[120px] pointer-events-none", className)}
      style={{ backgroundColor: color }}
    />
  );
}

export function FilmGrain() {
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none opacity-[0.045] mix-blend-overlay animate-grain bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%270%200%20256%20256%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter%20id=%27noise%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.9%27%20numOctaves=%274%27%20stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url(%23noise)%27/%3E%3C/svg%3E')] bg-[length:180px_180px]" />
  );
}
