'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function CinematicText({
  children,
  variant = 'heading',
  className,
}: {
  children: React.ReactNode;
  variant?: 'heading' | 'data' | 'eyebrow' | 'italic';
  className?: string;
}) {
  const styles = {
    heading: 'font-display font-black tracking-tighter uppercase leading-[0.85]',
    data:    'font-ui font-bold uppercase tracking-[0.2em]',
    eyebrow: 'font-ui font-bold uppercase tracking-[0.4em] text-[9px]',
    italic:  'font-display italic tracking-tight',
  };
  return <div className={cn(styles[variant], className)}>{children}</div>;
}

// Kept for documentary/dark-zone pages — renders a floating glow blob
export function AtmosphericBlob({
  color = '#FF3B2F',
  className,
}: {
  color?: string;
  className?: string;
}) {
  return (
    <motion.div
      animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.12, 0.06], x: [0, 40, 0], y: [0, -25, 0] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      className={cn('absolute rounded-full blur-[120px] pointer-events-none', className)}
      style={{ backgroundColor: color }}
    />
  );
}

// Film grain for dark/documentary pages
export function FilmGrain() {
  return <div className="film-grain" />;
}

// Light grain for cream/light pages
export function LightGrain() {
  return <div className="light-grain" />;
}
