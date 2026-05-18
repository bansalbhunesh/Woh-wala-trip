'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn, formatName } from '@/lib/utils';
import { trpc } from '@/lib/trpc/client';
import type { TripWithLore, TripMember, TripEra, LoreJson } from '@/types/domain';

// ─────────────────────────────────────────────────────────────────────────────
// CINEMATIC BREAK — chapter card / documentary interstitial
// ─────────────────────────────────────────────────────────────────────────────
export function CinematicBreak({
  text,
  sub,
  accent = '#FF4D4D',
  timestamp,
  align = 'left',
}: {
  text: string;
  sub?: string;
  accent?: string;
  timestamp?: string;
  align?: 'left' | 'center';
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8 }}
      className="relative py-28 overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at ${align === 'center' ? '50%' : '20%'} 50%, ${accent}08, transparent 70%)`,
        }}
      />
      <div className="absolute inset-0 pointer-events-none opacity-[0.025] bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%270%200%20256%20256%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter%20id=%27n%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.85%27%20numOctaves=%274%27%20stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url(%23n)%27/%3E%3C/svg%3E')] bg-[length:200px_200px]" />

      <div className={cn('relative z-10', align === 'center' && 'text-center')}>
        {timestamp && (
          <div className="font-mono text-[9px] text-white/15 uppercase tracking-[0.4em] mb-5">
            {timestamp}
          </div>
        )}
        <p className="text-[28px] md:text-[40px] font-cinematic italic text-[#F5F0E8]/75 leading-[1.15] tracking-tight max-w-2xl">
          &ldquo;{text}&rdquo;
        </p>
        {sub && (
          <p className="mt-6 text-[9px] uppercase tracking-[0.45em] text-white/20 font-vibe font-black">
            — {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COOKED LEVEL REVEAL — giant fullscreen emotional beat
// ─────────────────────────────────────────────────────────────────────────────
export function CookedLevelReveal({ trip }: { trip: TripWithLore }) {
  const lore = trip?.lore_json;
  const level = lore?.cooked_level ?? trip?.chaos_score ?? 0;
  const verdict = lore?.cooked_verdict ?? '—';
  const explanation = lore?.cooked_explanation;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [slammed, setSlammed] = useState(false);

  const accentColor =
    level >= 76 ? '#FF4D4D' : level >= 51 ? '#D49E2D' : level >= 26 ? '#D45D2D' : '#2D9E8B';

  useEffect(() => {
    setSlammed(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = (canvas.width = 300);
    const H = (canvas.height = 300);

    let sparks = Array.from({ length: 32 }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 3.5;
      return {
        x: W / 2,
        y: H / 2 + 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        alpha: 1,
        color: accentColor,
        size: Math.random() * 2.2 + 1.2,
      };
    });

    let active = true;
    const draw = () => {
      if (!active) return;
      ctx.clearRect(0, 0, W, H);
      let live = false;
      sparks.forEach(s => {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.12;
        s.vx *= 0.98;
        s.alpha -= 0.018;
        if (s.alpha > 0) {
          live = true;
          ctx.save();
          ctx.globalAlpha = s.alpha;
          ctx.shadowBlur = 10;
          ctx.shadowColor = s.color;
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
      if (live) {
        requestAnimationFrame(draw);
      } else {
        active = false;
      }
    };
    const delay = setTimeout(() => {
      draw();
    }, 120);
    return () => {
      active = false;
      clearTimeout(delay);
    };
  }, [accentColor]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7 }}
      className="relative py-16 overflow-hidden"
    >
      {/* Glow */}
      <div
        className="absolute inset-0 pointer-events-none blur-[200px] opacity-[0.15]"
        style={{
          background: `radial-gradient(ellipse at 40% 60%, ${accentColor}, transparent 65%)`,
        }}
      />

      {/* Scanline overlay — VHS signal feel */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2rem]">
        <div
          className="absolute left-0 right-0 h-8 opacity-[0.04] animate-scan"
          style={{
            background:
              'linear-gradient(to bottom, transparent, rgba(255,255,255,0.3), transparent)',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-end gap-8">
        <div className="space-y-2">
          <div className="text-[9px] uppercase tracking-[0.45em] text-white/15 font-vibe font-black">
            AI Delusion Index · Peer Reviewed
          </div>
          {/* Giant glitch number with spark canvas */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"
              style={{ mixBlendMode: 'screen' }}
            />
            <div
              className={cn(
                'glitch-text font-vibe font-black leading-[0.82] tracking-tighter select-none relative z-10',
                slammed && 'animate-crt-slam'
              )}
              data-text={String(level)}
              style={
                {
                  fontSize: 'clamp(100px, 18vw, 200px)',
                  color: accentColor,
                  textShadow: `0 0 120px ${accentColor}30`,
                  '--color': accentColor,
                } as React.CSSProperties
              }
            >
              {level}
            </div>
          </div>
        </div>

        <div className="pb-3 space-y-4 max-w-xs">
          <div className="text-[32px] font-cinematic font-black italic text-[#F5F0E8] uppercase tracking-tight leading-none">
            {verdict}
          </div>
          {explanation && (
            <p className="text-sm text-white/35 font-data font-light leading-relaxed border-l-2 border-white/10 pl-4 italic">
              {explanation}
            </p>
          )}
          <div
            className="inline-block px-4 py-2 rounded-full text-[9px] font-vibe font-black uppercase tracking-wider"
            style={{
              backgroundColor: `${accentColor}12`,
              color: accentColor,
              border: `1px solid ${accentColor}25`,
            }}
          >
            / 100 possible chaos units
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-0 text-[8px] uppercase tracking-[0.6em] text-white/[0.05] font-vibe font-black select-none">
        {verdict} · Archive {trip?.id?.slice(0, 6)?.toUpperCase() || '——'}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FRIENDSHIP EXPOSE — chaos rankings / investigation board
// ─────────────────────────────────────────────────────────────────────────────
export function FriendshipExpose({ members }: { members: TripMember[] }) {
  const sorted = [...(members || [])]
    .filter(m => m.role_chaos_rating != null)
    .sort((a, b) => (b.role_chaos_rating ?? 0) - (a.role_chaos_rating ?? 0));

  if (sorted.length === 0) return null;

  const top = sorted[0];
  const COLORS = ['#FF4D4D', '#D49E2D', '#2D9E8B', '#7C6AFF', '#FF6B35'];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <div className="text-[9px] uppercase tracking-[0.45em] text-white/15 font-vibe font-black">
          Classified · AI Findings
        </div>
        <h2 className="text-5xl font-cinematic font-black italic tracking-tighter text-[#F5F0E8] uppercase leading-[0.88]">
          Who Caused
          <br />
          The Collapse
        </h2>
      </div>

      {/* Primary suspect card */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-cooked-accent/10 via-[#0E0E0C] to-[#060604] border border-cooked-accent/20 p-8">
        {/* Evidence stamp */}
        <div className="absolute top-5 right-5 px-3 py-1.5 rounded-full bg-cooked-accent/10 border border-cooked-accent/20">
          <span className="text-[7px] font-mono text-cooked-accent/70 uppercase tracking-[0.25em]">
            Confirmed
          </span>
        </div>

        <div className="space-y-4">
          <div className="text-[9px] uppercase tracking-[0.3em] text-cooked-accent/50 font-vibe font-black">
            Primary Chaos Source
          </div>
          <h3 className="text-[56px] font-cinematic font-black tracking-tighter text-[#F5F0E8] leading-none">
            {formatName(top.display_name)}
          </h3>
          <p className="text-[10px] uppercase tracking-widest text-white/25 font-vibe font-black">
            {top.role_title || 'The Menace'}
          </p>
          {top.role_description && (
            <p className="text-sm text-white/40 font-data font-light italic leading-relaxed max-w-sm border-l-2 border-cooked-accent/20 pl-4">
              &ldquo;{top.role_description}&rdquo;
            </p>
          )}
          <div className="flex items-baseline gap-3 pt-2">
            <span className="text-5xl font-vibe font-black text-cooked-accent leading-none">
              {top.role_chaos_rating}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-white/20 font-vibe font-black pb-1">
              / 10 chaos
            </span>
          </div>
        </div>
      </div>

      {/* Full ranking */}
      <div className="space-y-2">
        <div className="text-[8px] uppercase tracking-[0.4em] text-white/15 font-vibe font-black mb-4">
          Full Damage Report
        </div>
        {sorted.map((m, i) => {
          const barPct = ((m.role_chaos_rating ?? 0) / 10) * 100;
          const color = COLORS[i % COLORS.length];
          return (
            <div
              key={m.user_id || i}
              className={cn(
                'flex items-center gap-4 p-4 rounded-2xl border transition-colors',
                i === 0
                  ? 'bg-cooked-accent/6 border-cooked-accent/15'
                  : 'bg-white/[0.02] border-white/[0.04] hover:border-white/[0.08]'
              )}
            >
              <span className="w-4 text-right text-[9px] font-mono text-white/15 flex-shrink-0">
                {i + 1}
              </span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-vibe font-black text-white flex-shrink-0"
                style={{ background: color }}
              >
                {(m.display_name || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-vibe font-black text-[#F5F0E8] truncate">
                    {formatName(m.display_name)}
                  </span>
                  <span className="text-[10px] font-mono text-white/35 ml-3 flex-shrink-0 tabular-nums">
                    {m.role_chaos_rating}/10
                  </span>
                </div>
                <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${barPct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: i * 0.08, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTARY ERA — individual era as a recovered scene
// ─────────────────────────────────────────────────────────────────────────────
export function DocumentaryEra({
  era,
  index,
  total,
}: {
  era: TripEra;
  index: number;
  total: number;
}) {
  const colors = ['#FF4D4D', '#D49E2D', '#2D9E8B', '#7C6AFF'];
  const color = colors[index % colors.length];
  const isLast = index === total - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      className="relative pl-8"
    >
      {/* Scene number watermark */}
      <div
        className="absolute -left-3 top-6 text-[72px] font-vibe font-black leading-none select-none pointer-events-none"
        style={{ color, opacity: 0.05 }}
      >
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* Vertical connector */}
      {!isLast && (
        <div className="absolute left-[7px] top-10 bottom-[-24px] w-px bg-white/[0.05]" />
      )}

      {/* Dot */}
      <div
        className="absolute left-[3px] top-7 w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />

      <div className="pb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[8px] font-mono text-white/15 uppercase tracking-[0.3em]">
            Scene {index + 1} · {era.timeframe}
          </span>
        </div>
        <h3 className="text-[22px] font-cinematic font-black tracking-tight text-[#F5F0E8] leading-none mb-3">
          {era.era_name}
        </h3>
        <p className="text-sm text-white/40 font-data font-light leading-relaxed mb-3">
          {era.description}
        </p>
        {era.defining_moment && (
          <div
            className="inline-block px-4 py-2 rounded-xl text-[11px] font-cinematic italic border max-w-sm"
            style={{ color: `${color}70`, borderColor: `${color}18`, background: `${color}05` }}
          >
            &ldquo;{era.defining_moment}&rdquo;
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLOT TWIST MOMENT — emotional shock / recovered evidence card
// ─────────────────────────────────────────────────────────────────────────────
export function PlotTwistMoment({ lore }: { lore: LoreJson }) {
  const plotTwist = lore?.season_recap?.act_2 || lore?.what_this_trip_was_really_about;
  if (!plotTwist) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-[2rem] p-10 border border-white/[0.05]"
      style={{
        background: 'linear-gradient(135deg, rgba(212,158,45,0.07) 0%, #0A0A08 70%)',
      }}
    >
      {/* Tape strip at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px w-20 h-3 bg-unstable-accent/15 rounded-sm rotate-1 blur-[1px]" />

      {/* Evidence watermark */}
      <div className="absolute bottom-4 right-6 text-[8px] font-mono text-white/[0.06] uppercase tracking-[0.4em]">
        Evidence File · Recovered
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-unstable-accent animate-pulse-soft" />
          <span className="text-[8px] uppercase tracking-[0.45em] text-unstable-accent/50 font-vibe font-black">
            Plot Twist · Act II
          </span>
        </div>

        <p className="text-xl font-cinematic italic text-white/65 leading-relaxed max-w-lg">
          &ldquo;{plotTwist.length > 220 ? `${plotTwist.slice(0, 220)}...` : plotTwist}&rdquo;
        </p>

        <div className="text-[8px] uppercase tracking-[0.5em] text-white/12 font-vibe font-black">
          This permanently changed the group dynamic.
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FRIENDSHIP VERDICT — AI psychological profile
// ─────────────────────────────────────────────────────────────────────────────
export function FriendshipVerdict({ lore }: { lore: LoreJson }) {
  const dynamics = lore?.friendship_dynamics;
  const awards = lore?.trip_lore_awards;
  if (!dynamics && !awards) return null;

  const items = [
    awards?.movie_genre && {
      label: 'If this were a film',
      value: awards.movie_genre,
      color: '#7C6AFF',
    },
    awards?.trip_villain && {
      label: 'Confirmed Villain',
      value: awards.trip_villain,
      color: '#FF4D4D',
    },
    awards?.trip_mvp && { label: 'Unlikely Hero', value: awards.trip_mvp, color: '#2D9E8B' },
    dynamics?.chaos_source && {
      label: 'Primary chaos source',
      value: dynamics.chaos_source,
      color: '#D49E2D',
    },
    dynamics?.collective_energy && {
      label: 'Group energy',
      value: dynamics.collective_energy,
      color: '#FF6B35',
    },
    awards?.core_memory && {
      label: 'Core memory (non-removable)',
      value: awards.core_memory,
      color: '#2D9E8B',
    },
    dynamics?.emotional_center && {
      label: 'Emotional support unit',
      value: dynamics.emotional_center,
      color: '#7C6AFF',
    },
  ].filter(Boolean) as { label: string; value: string; color: string }[];

  if (items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <div className="text-[9px] uppercase tracking-[0.45em] text-white/15 font-vibe font-black">
          AI Psychological Profile · Classified
        </div>
        <h2 className="text-5xl font-cinematic font-black italic tracking-tighter text-[#F5F0E8] uppercase leading-[0.88]">
          What Kind of
          <br />
          Friendship Is This?
        </h2>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-5 p-5 rounded-2xl bg-[#0E0E0C] border border-white/[0.04] hover:border-white/[0.09] transition-colors group"
          >
            <div
              className="w-0.5 self-stretch rounded-full flex-shrink-0 mt-0.5"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1 space-y-1">
              <div
                className="text-[8px] uppercase tracking-[0.35em] font-vibe font-black"
                style={{ color: `${item.color}65` }}
              >
                {item.label}
              </div>
              <div className="text-[15px] font-cinematic font-black text-[#F5F0E8] leading-tight group-hover:text-white transition-colors">
                {item.value}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STICKY CHAPTER HEADER — pins during scroll, creates documentary pacing
// ─────────────────────────────────────────────────────────────────────────────
export function StickyChapter({
  number,
  title,
  accent = '#FF4D4D',
}: {
  number: string;
  title: string;
  accent?: string;
}) {
  return (
    <div
      className="sticky top-[73px] z-30 py-3 -mx-6 px-6 mb-8 backdrop-blur-xl"
      style={{ background: 'rgba(6,6,4,0.88)' }}
    >
      <div className="flex items-center gap-4 border-b border-white/[0.05] pb-3">
        <span className="font-mono text-[8px] text-white/20 uppercase tracking-[0.45em] flex-shrink-0">
          {number}
        </span>
        <div className="h-px flex-1 bg-white/[0.04]" />
        <span
          className="font-vibe font-black text-[9px] uppercase tracking-[0.35em]"
          style={{ color: `${accent}70` }}
        >
          {title}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE BOARD — detective wall with overlapping rotated evidence cards
// ─────────────────────────────────────────────────────────────────────────────
export function EvidenceBoard({
  mvp,
  villain,
  insideJoke,
  lore,
}: {
  mvp?: any;
  villain?: any;
  insideJoke?: string;
  lore?: any;
}) {
  if (!mvp && !villain && !insideJoke) return null;

  // Stable ID derived from props — prevents Framer Motion re-animation on every refetch
  const caseId = React.useRef(`YL-${Math.random().toString(36).slice(-6).toUpperCase()}`).current;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-[2.5rem] border border-white/[0.06] bg-[#080806]"
    >
      {/* Cork board dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(245,240,232,0.8) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* Film grain */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] animate-grain bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%270%200%20256%20256%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter%20id=%27n%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.85%27%20numOctaves=%274%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url(%23n)%27/%3E%3C/svg%3E')] bg-[length:180px_180px]" />

      {/* Header */}
      <div className="relative z-10 px-8 pt-8 pb-4 border-b border-white/[0.05]">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[7px] font-mono text-white/15 uppercase tracking-[0.5em] mb-1">
              Case File
            </div>
            <h3 className="text-2xl font-cinematic font-black italic tracking-tight text-[#F5F0E8] uppercase">
              Evidence Board
            </h3>
          </div>
          <div className="text-right space-y-1">
            <div className="text-[7px] font-mono text-white/12 uppercase tracking-[0.3em]">
              Case ID
            </div>
            <div className="font-mono text-[11px] text-white/25">{caseId}</div>
            <div
              className="text-[6px] font-mono uppercase tracking-[0.4em] border px-2 py-0.5 rounded text-cooked-accent/50 border-cooked-accent/20"
              style={{ transform: 'rotate(3deg)', display: 'inline-block' }}
            >
              Classified
            </div>
          </div>
        </div>
      </div>

      {/* Evidence cards */}
      <div className="relative z-10 p-8 space-y-4">
        <div className="relative">
          {mvp && villain && (
            <div className="absolute inset-0 pointer-events-none z-20">
              <svg
                className="w-full h-full overflow-visible"
                aria-hidden="true"
                style={{ minHeight: 180 }}
              >
                <path
                  d="M 24% 40% Q 50% 68% 76% 45%"
                  fill="none"
                  stroke="#FF4D4D"
                  strokeWidth="2"
                  strokeDasharray="2 3"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(255, 77, 77, 0.4))' }}
                />
                <circle cx="50%" cy="57%" r="3.5" fill="#FF4D4D" className="animate-pulse" />
              </svg>
            </div>
          )}

          <div
            className={cn(
              'grid gap-8 relative z-10',
              villain && mvp ? 'grid-cols-2' : 'grid-cols-1'
            )}
          >
            {mvp && (
              <motion.div
                initial={{ opacity: 0, rotate: -4, y: 10 }}
                whileInView={{ opacity: 1, rotate: -2, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1, type: 'spring', stiffness: 120 }}
                className="relative bg-[#FAF8F5] shadow-2xl rounded-sm p-4 pb-8 border-t-[8px] border-l-[8px] border-r-[8px] border-b-[32px] border-[#FAF8F5] text-black"
              >
                {/* Tape pin */}
                <div
                  className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-14 h-4 bg-white/40 border border-white/20 shadow-sm rounded-sm rotate-[-2deg] opacity-75"
                  style={{ backdropFilter: 'blur(2px)' }}
                />
                <div className="text-[7px] font-mono text-chill-accent uppercase tracking-[0.3em] font-bold">
                  Unlikely Hero
                </div>
                <h4 className="text-[24px] font-cinematic font-black tracking-tight text-[#1C1A17] leading-none italic uppercase">
                  {formatName(mvp.display_name)}
                </h4>
                <p className="text-[9px] font-vibe font-black text-black/40 uppercase tracking-wider">
                  {mvp.role_title || 'The Anchor'}
                </p>
                {mvp.role_description && (
                  <p className="text-[10px] text-black/60 font-data italic leading-relaxed line-clamp-2 pt-1 border-t border-black/5">
                    {mvp.role_description}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-chill-accent" />
                  <span className="text-[8px] font-mono text-chill-accent font-bold">
                    Chaos: {mvp.role_chaos_rating ?? '?'}/10
                  </span>
                </div>
              </motion.div>
            )}

            {villain && (
              <motion.div
                initial={{ opacity: 0, rotate: 3, y: 10 }}
                whileInView={{ opacity: 1, rotate: 1.5, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 120 }}
                className="relative bg-[#FAF8F5] shadow-2xl rounded-sm p-4 pb-8 border-t-[8px] border-l-[8px] border-r-[8px] border-b-[32px] border-[#FAF8F5] text-black"
              >
                {/* Tape pin */}
                <div
                  className="absolute top-[-10px] right-6 w-14 h-4 bg-white/40 border border-white/20 shadow-sm rounded-sm rotate-[3deg] opacity-75"
                  style={{ backdropFilter: 'blur(2px)' }}
                />
                <div className="text-[7px] font-mono text-cooked-accent uppercase tracking-[0.3em] font-bold">
                  Primary Suspect
                </div>
                <h4 className="text-[24px] font-cinematic font-black tracking-tight text-cooked-accent leading-none italic uppercase">
                  {formatName(villain.display_name)}
                </h4>
                <p className="text-[9px] font-vibe font-black text-black/40 uppercase tracking-wider">
                  {villain.role_title || 'The Source'}
                </p>
                {villain.role_description && (
                  <p className="text-[10px] text-black/60 font-data italic leading-relaxed line-clamp-2 pt-1 border-t border-black/5">
                    {villain.role_description}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cooked-accent animate-pulse" />
                  <span className="text-[8px] font-mono text-cooked-accent font-bold">
                    Chaos: {villain.role_chaos_rating ?? '?'}/10 · Confirmed
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Bottom: Inside Joke / Core Evidence — larger, centered */}
        {insideJoke && (
          <motion.div
            initial={{ opacity: 0, rotate: -1, scale: 0.97 }}
            whileInView={{ opacity: 1, rotate: 0.5, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3, type: 'spring' }}
            className="tape-strip relative bg-gradient-to-br from-unstable-accent/6 via-[#0E0E0C] to-[#060604] border border-unstable-accent/15 rounded-2xl p-6 space-y-3"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-unstable-accent/10 border border-unstable-accent/20" />
            <div className="text-[7px] font-mono text-unstable-accent/50 uppercase tracking-[0.3em]">
              Core Memory · AI Identified
            </div>
            <p className="text-xl font-cinematic font-black tracking-tight text-[#F5F0E8] leading-tight">
              {insideJoke}
            </p>
            {lore?.what_this_trip_was_really_about && (
              <p className="text-[11px] text-white/30 font-data italic leading-relaxed border-l border-unstable-accent/15 pl-3">
                {lore.what_this_trip_was_really_about.slice(0, 120)}
                {lore.what_this_trip_was_really_about.length > 120 ? '...' : ''}
              </p>
            )}
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-unstable-accent" />
              <span className="text-[8px] font-mono text-unstable-accent/50 uppercase tracking-widest">
                Non-removable from group memory
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 px-8 pb-6 flex justify-between items-center">
        <span className="text-[7px] font-mono text-white/10 uppercase tracking-[0.4em]">
          Evidence Confirmed · AI Certified
        </span>
        <span
          className="text-[7px] font-mono text-cooked-accent/25 uppercase tracking-[0.3em] border border-cooked-accent/15 px-2 py-0.5 rounded"
          style={{ transform: 'rotate(2deg)', display: 'inline-block' }}
        >
          Sealed
        </span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMOTIONAL TIMESTAMP — "Day 3 · 2:13 AM · Nobody was okay."
// ─────────────────────────────────────────────────────────────────────────────
export function EmotionalTimestamp({
  day,
  time,
  text,
  accent = '#FF4D4D',
}: {
  day?: string;
  time?: string;
  text: string;
  accent?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6 }}
      className="flex items-center gap-5 py-6"
    >
      <div className="flex-1 h-px bg-white/[0.04]" />
      <div className="text-center space-y-1 flex-shrink-0">
        {(day || time) && (
          <div className="font-mono text-[8px] text-white/15 uppercase tracking-[0.45em]">
            {day}
            {day && time ? ' · ' : ''}
            {time}
          </div>
        )}
        <div className="font-cinematic italic text-[13px]" style={{ color: `${accent}75` }}>
          {text}
        </div>
      </div>
      <div className="flex-1 h-px bg-white/[0.04]" />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECOVERED ARTIFACT — fake evidence card (receipt / note / screenshot)
// ─────────────────────────────────────────────────────────────────────────────
export function RecoveredArtifact({
  label,
  content,
  subtext,
  type = 'note',
  rotation = 0,
}: {
  label?: string;
  content: string;
  subtext?: string;
  type?: 'note' | 'receipt' | 'screenshot';
  rotation?: number;
}) {
  const isReceipt = type === 'receipt';

  return (
    <motion.div
      initial={{ opacity: 0, rotate: rotation - 4, scale: 0.96 }}
      whileInView={{ opacity: 1, rotate: rotation, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, type: 'spring', stiffness: 120 }}
      className="relative tape-strip"
      style={{ '--r': `${rotation}deg` } as React.CSSProperties}
    >
      {/* Paper card */}
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl p-6 space-y-3 border shadow-3xl',
          isReceipt
            ? 'bg-[#11110F] border-white/10 text-[#F5F0E8]'
            : 'bg-[#0E0E0C] border-white/[0.07] text-[#F5F0E8]'
        )}
      >
        {/* VHS scanlines on dark cards */}
        {!isReceipt && <div className="absolute inset-0 vhs-lines pointer-events-none" />}

        {/* Header */}
        {label && (
          <div
            className={cn(
              'text-[7px] font-mono uppercase tracking-[0.45em]',
              isReceipt ? 'text-white/40' : 'text-white/30'
            )}
          >
            {label}
          </div>
        )}

        {/* Content */}
        <p
          className={cn(
            'leading-relaxed',
            isReceipt
              ? 'font-mono text-[11px] text-white/70'
              : 'font-cinematic italic text-sm text-white/70'
          )}
        >
          {content}
        </p>

        {subtext && (
          <p className={cn('text-[10px]', isReceipt ? 'text-white/40' : 'text-white/40')}>
            {subtext}
          </p>
        )}

        {/* Stamp */}
        <div
          className={cn(
            'absolute bottom-3 right-4 text-[7px] font-mono uppercase tracking-[0.3em] border px-2 py-0.5 rounded rotate-12 opacity-60',
            isReceipt ? 'text-cooked-accent border-cooked-accent' : 'text-white/40 border-white/20'
          )}
        >
          Evidence
        </div>

        {/* Perforated bottom on receipts */}
        {isReceipt && (
          <div className="absolute bottom-0 left-0 right-0 h-2 overflow-hidden">
            <div className="flex gap-1.5 px-2" style={{ marginTop: '-4px' }}>
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-1.5 h-3 rounded-full bg-[#FAF1E4]" />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMORY COLLAGE — blurred/grainy photo collage with full-screen lightbox
// Dwell time is tracked per photo and sent to the server on close.
// ─────────────────────────────────────────────────────────────────────────────
export function MemoryCollage({
  label = 'Recovered Evidence',
  count = 6,
  accent = '#FF4D4D',
  photos = [],
  tripId,
}: {
  label?: string;
  count?: number;
  accent?: string;
  photos?: Array<{ id?: string; thumbnailUrl?: string | null; url?: string | null }>;
  tripId?: string;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const viewStartRef = useRef<number>(0);
  const recordView = trpc.photos.recordView.useMutation();
  const activePhotoId = activeIdx !== null ? (photos[activeIdx]?.id ?? null) : null;
  const { data: embeddingHealth } = trpc.photos.embeddingHealth.useQuery(
    { tripId: tripId! },
    { enabled: !!tripId, staleTime: 5 * 60 * 1000 }
  );
  const { data: echoes } = trpc.photos.findSimilar.useQuery(
    { photoId: activePhotoId!, limit: 4 },
    // Skip if embeddings are mostly failing — avoids showing a perpetually empty section
    { enabled: !!activePhotoId && (embeddingHealth?.healthy ?? true) }
  );

  const openPhoto = useCallback((idx: number) => {
    setActiveIdx(idx);
    viewStartRef.current = Date.now();
  }, []);

  const closePhoto = useCallback(() => {
    if (activeIdx !== null) {
      const durationMs = Date.now() - viewStartRef.current;
      const photo = photos[activeIdx];
      // Only record if viewed for at least 500ms and we have all IDs
      if (photo?.id && tripId && durationMs >= 500) {
        recordView.mutate({
          photoId: photo.id,
          tripId,
          viewDurationMs: Math.min(durationMs, 300000),
        });
      }
    }
    setActiveIdx(null);
  }, [activeIdx, photos, tripId, recordView]);

  // Close on Escape key
  useEffect(() => {
    if (activeIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePhoto();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeIdx, closePhoto]);

  const ROTATIONS = [-3, 1.5, -1, 2.5, -2, 1];
  const OPACITIES = [1, 0.95, 0.98, 0.9, 0.95, 0.92];
  const POSITIONS = [
    { top: '8%', left: '2%' },
    { top: '4%', left: '35%' },
    { top: '10%', right: '4%' },
    { bottom: '12%', left: '10%' },
    { bottom: '8%', left: '45%' },
    { bottom: '15%', right: '5%' },
  ];

  const slots = Math.min(photos.length > 0 ? photos.length : count, 6);
  const activePhoto = activeIdx !== null ? photos[activeIdx] : null;
  const activeSrc = activePhoto?.url || activePhoto?.thumbnailUrl;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="relative h-[22rem] overflow-hidden rounded-[2rem] border border-white/[0.04] bg-[#0A0A08]"
      >
        {/* Atmospheric glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${accent}08, transparent 70%)`,
          }}
        />

        {/* Polaroids */}
        {Array.from({ length: slots }).map((_, i) => {
          const photo = photos[i];
          const imgUrl = photo?.thumbnailUrl || photo?.url;
          const isClickable = !!(photo?.id && tripId);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8, rotate: ROTATIONS[i] - 10 }}
              whileInView={{ opacity: OPACITIES[i], scale: 1, rotate: ROTATIONS[i] }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5, type: 'spring' }}
              whileHover={isClickable ? { opacity: 1, scale: 1.06, zIndex: 10 } : undefined}
              onClick={isClickable ? () => openPhoto(i) : undefined}
              className={cn(
                'absolute w-32 h-40 bg-white/5 border border-white/10 rounded-sm flex flex-col overflow-hidden shadow-2xl',
                isClickable && 'cursor-pointer'
              )}
              style={POSITIONS[i] as React.CSSProperties}
            >
              <div className="flex-1 overflow-hidden">
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ filter: 'grayscale(0.15) contrast(1.1)', transform: 'scale(1.02)' }}
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      background: `linear-gradient(${135 + i * 30}deg, ${accent}15, rgba(45,158,139,0.08))`,
                      filter: 'blur(8px)',
                      transform: 'scale(1.1)',
                    }}
                  />
                )}
              </div>
              <div className="h-5 bg-white/[0.04] flex items-center justify-center">
                <div className="w-8 h-px bg-white/10" />
              </div>
            </motion.div>
          );
        })}

        {/* Label */}
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <span className="text-[7px] font-mono text-white/30 uppercase tracking-[0.5em]">
            {label}
          </span>
        </div>

        {/* Film grain */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%270%200%20256%20256%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter%20id=%27n%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.85%27%20numOctaves=%274%27%20stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url(%23n)%27/%3E%3C/svg%3E')] bg-[length:180px_180px] animate-grain" />
      </motion.div>

      {/* Lightbox — fixed overlay, renders outside the collage */}
      {activeIdx !== null && activeSrc && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closePhoto}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'rgba(6,6,4,0.95)', backdropFilter: 'blur(16px)' }}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, type: 'spring', stiffness: 240 }}
            onClick={e => e.stopPropagation()}
            className="relative max-w-[90vw] max-h-[85vh]"
          >
            <img
              src={activeSrc}
              alt=""
              className="rounded-2xl object-contain max-w-full max-h-[85vh]"
              style={{ boxShadow: '0 40px 120px rgba(0,0,0,0.8)' }}
            />
            <button
              onClick={closePhoto}
              className="absolute -top-4 -right-4 w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 1l12 12M13 1L1 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </motion.div>

          <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-4">
            {/* Memory echo strip */}
            {echoes && echoes.length > 0 && (
              <div className="text-center">
                <p
                  className="font-mono text-[7px] uppercase tracking-[0.5em] mb-2"
                  style={{ color: 'rgba(255,77,77,0.4)' }}
                >
                  ● MEMORY ECHO
                </p>
                <div className="flex gap-2 justify-center">
                  {echoes.map((e: any) => (
                    <a
                      key={e.photo_id}
                      href={`/trips/${e.trip_id}`}
                      className="relative rounded-lg overflow-hidden"
                      style={{ width: 52, height: 52, flexShrink: 0 }}
                      onClick={ev => ev.stopPropagation()}
                      title={`${e.trip_name} (${e.trip_year})`}
                    >
                      {e.thumbnailUrl || e.url ? (
                        <img
                          src={e.thumbnailUrl ?? e.url}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            background: 'rgba(255,77,77,0.1)',
                          }}
                        />
                      )}
                      <div
                        className="absolute inset-0 flex items-end p-0.5"
                        style={{
                          background: 'linear-gradient(to top, rgba(6,6,4,0.85), transparent)',
                        }}
                      >
                        <span
                          className="font-mono"
                          style={{ fontSize: 5, color: 'rgba(255,77,77,0.9)', lineHeight: 1 }}
                        >
                          {e.trip_year}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
            <span className="font-mono text-[8px] uppercase tracking-[0.4em] text-white/20">
              {(activeIdx ?? 0) + 1} / {slots} · ESC TO CLOSE
            </span>
          </div>
        </motion.div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GLITCH REVEAL — number/text with glitch effect on scroll-in
// ─────────────────────────────────────────────────────────────────────────────
export function GlitchText({
  text,
  className,
  style,
}: {
  text: string | number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn('glitch-text relative inline-block', className)}
      data-text={String(text)}
      style={style}
    >
      {text}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPERLATIVE CARD — yearbook-style "most likely to..." moment
// ─────────────────────────────────────────────────────────────────────────────
export function SuperlativeCard({
  sup,
  index,
}: {
  sup: { winner_name: string; question: string; reason?: string; archetype?: string };
  index: number;
}) {
  const COLORS = ['#FF4D4D', '#D49E2D', '#2D9E8B', '#7C6AFF', '#FF6B35'];
  const color = COLORS[index % COLORS.length];
  const rotations = [-1.5, 1, -0.5, 2, -1];
  const rot = rotations[index % rotations.length];

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        @keyframes crt-slam {
          0% {
            transform: scale(2.2);
            filter: blur(16px) brightness(2.5);
            text-shadow: 0 0 40px var(--color), 0 0 80px var(--color);
            opacity: 0;
          }
          25% {
            transform: scale(0.95);
            filter: blur(2px) brightness(1.2);
            opacity: 0.9;
          }
          30% {
            transform: translate3d(-4px, -2px, 0) skewX(-6deg);
            filter: hue-rotate(90deg) saturate(1.8);
          }
          35% {
            transform: translate3d(4px, 2px, 0) skewX(6deg);
            filter: hue-rotate(-90deg) saturate(1.8);
          }
          40% {
            transform: translate3d(-2px, 1px, 0) scale(1.02);
            filter: brightness(1.5);
          }
          45% {
            transform: translate3d(2px, -1px, 0) scale(0.99);
          }
          50% {
            transform: translate3d(0, 0, 0) scale(1);
            filter: none;
            opacity: 1;
          }
        }
        .animate-crt-slam {
          animation: crt-slam 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12, rotate: rot - 3 }}
        whileInView={{ opacity: 1, y: 0, rotate: rot }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, delay: index * 0.07, type: 'spring', stiffness: 150 }}
        className="relative group perspective-1000 w-full h-[280px]"
      >
        <div
          className="w-full h-full duration-700 preserve-3d relative cursor-pointer"
          style={{ transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          {/* FRONT FACE */}
          <div className="absolute inset-0 backface-hidden rounded-[2rem] bg-[#0E0E0C] border border-white/[0.06] p-8 flex flex-col justify-between transition-transform duration-700 group-hover:rotate-y-180">
            <div className="space-y-4">
              <div className="text-[8px] font-mono text-white/15 uppercase tracking-[0.4em]">
                Yearbook Award #{index + 1} · AI Certified
              </div>
              <div className="space-y-2">
                <p className="text-base font-cinematic italic text-white/40">most likely to</p>
                <h3 className="text-[22px] font-cinematic font-black tracking-tight text-[#F5F0E8] leading-tight line-clamp-3">
                  {sup.question}
                </h3>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-0.5 h-8 rounded-full" style={{ backgroundColor: color }} />
                <div>
                  <p className="text-xl font-vibe font-black text-[#F5F0E8]">{sup.winner_name}</p>
                  {sup.archetype && (
                    <p
                      className="text-[9px] uppercase tracking-widest font-vibe font-black"
                      style={{ color: `${color}70` }}
                    >
                      {sup.archetype}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-[8px] font-mono text-white/10 uppercase tracking-widest">
                Hover
              </span>
            </div>
          </div>

          {/* BACK FACE */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-[2rem] bg-gradient-to-br from-[#12120F] to-[#0A0A08] border border-white/[0.12] p-8 flex flex-col justify-between transition-transform duration-700 group-hover:rotate-y-0">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-mono text-cooked-accent uppercase tracking-[0.3em] font-bold">
                  Intel Decode
                </span>
                <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em]">
                  Secret Dossier
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-[8px] font-mono text-white/30 uppercase tracking-[0.2em]">
                  Behavioral Evidence
                </p>
                <p className="text-xs text-white/60 font-data italic leading-relaxed line-clamp-4">
                  {sup.reason ||
                    'The AI system detected repeated high-scoring occurrences of this archetype during trip photo processing and chat patterns. Action sealed.'}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[8px] font-mono text-white/30 uppercase tracking-widest">
              <span>Class: {sup.archetype || 'Pending'}</span>
              <span style={{ color }}>Verified</span>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOSING VERDICT — the final documentary card before the credits
// ─────────────────────────────────────────────────────────────────────────────
export function ClosingVerdict({ lore }: { lore: LoreJson }) {
  if (!lore?.closing_line) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 1 }}
      className="relative py-24 text-center space-y-8 overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, #FF4D4D, transparent 65%)' }}
      />

      <div className="w-8 h-px bg-white/20 mx-auto" />

      <p className="text-[28px] md:text-[36px] font-cinematic italic text-white/75 leading-[1.2] tracking-tight max-w-xl mx-auto relative z-10">
        &ldquo;{lore.closing_line}&rdquo;
      </p>

      <div className="text-[8px] uppercase tracking-[0.6em] text-white/15 font-vibe font-black">
        The Final Verdict
      </div>

      <div className="w-8 h-px bg-white/20 mx-auto" />
    </motion.div>
  );
}
