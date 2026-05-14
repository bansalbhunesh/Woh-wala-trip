'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CinematicText } from '@/components/ui/atoms';

export function Scene({ 
  children, 
  className,
  id
}: { 
  children: React.ReactNode; 
  className?: string;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className={cn("relative min-h-[80vh] flex flex-col justify-center px-6 py-20 overflow-hidden", className)}
    >
      {children}
    </motion.section>
  );
}

export function RevealFrame({ 
  title, 
  eyebrow, 
  body, 
  image, 
  badge, 
  color = '#FF3B2F',
  align = 'left' 
}: { 
  title: string;
  eyebrow: string;
  body: string;
  image?: string;
  badge?: string;
  color?: string;
  align?: 'left' | 'right';
}) {
  return (
    <div className={cn(
      "flex flex-col gap-10 items-center max-w-[1200px] mx-auto",
      align === 'right' ? 'md:flex-row-reverse' : 'md:flex-row'
    )}>
      {/* Editorial Image Frame */}
      <div className="relative w-full md:w-1/2 aspect-[4/5] rounded-[2rem] overflow-hidden group">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[3s] group-hover:scale-110" 
          style={{ backgroundImage: `url(${image || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957'})`, filter: 'grayscale(1) contrast(1.2)' }} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
        <div className="absolute top-8 left-8">
           {badge && <div className="px-4 py-1.5 rounded-full bg-white text-black text-[9px] font-black uppercase tracking-widest">{badge}</div>}
        </div>
      </div>

      {/* Content */}
      <div className="w-full md:w-1/2 space-y-8">
        <CinematicText variant="eyebrow">{eyebrow}</CinematicText>
        <CinematicText variant="heading" className="text-5xl md:text-7xl">
          {title}
        </CinematicText>
        <div className="h-px w-20" style={{ backgroundColor: color }} />
        <CinematicText variant="italic" className="text-xl md:text-2xl text-white/80 leading-relaxed">
          &ldquo;{body}&rdquo;
        </CinematicText>
      </div>
    </div>
  );
}
