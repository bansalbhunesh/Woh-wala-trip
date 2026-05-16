'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { CinematicText, AtmosphericBlob } from '@/components/ui/atoms';
import { cn } from '@/lib/utils';
import { Play, Plus, X, ChevronRight, Share2 } from 'lucide-react';

// Shared easing constant
const EXPO_OUT = 'cubic-bezier(0.16,1,0.3,1)';
const makeTransition = (delay = '0s') =>
  `opacity 0.65s ${EXPO_OUT} ${delay}, transform 0.65s ${EXPO_OUT} ${delay}, filter 0.65s ${EXPO_OUT} ${delay}`;

// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVE NAVBAR
// ─────────────────────────────────────────────────────────────────────────────
export function ArchiveNavbar({
  trip,
  lightMode,
  onToggleLight,
}: {
  trip: any;
  lightMode?: boolean;
  onToggleLight?: () => void;
}) {
  const cookedLevel = trip?.lore_json?.cooked_level ?? trip?.chaos_score ?? '—';
  const verdict = trip?.lore_json?.cooked_verdict ?? 'Processing...';

  return (
    <nav className={`sticky top-0 z-[100] w-full px-6 py-4 backdrop-blur-2xl flex items-center justify-between transition-colors duration-300 ${
      lightMode
        ? 'bg-[#FAF1E4]/90 border-b border-black/[0.06]'
        : 'bg-[#060604]/90 border-b border-white/[0.06]'
    }`}>
      <div className="flex items-center gap-4">
        <Link href="/trips" className="w-8 h-8 bg-cooked-accent rounded-lg flex items-center justify-center font-vibe font-black text-xs text-white hover:scale-110 transition-transform">
          W
        </Link>
        <div className={`hidden md:block h-6 w-px ${lightMode ? 'bg-black/10' : 'bg-white/10'}`} />
        <div className="hidden md:flex flex-col">
          <span className={`text-[8px] uppercase tracking-[0.3em] font-vibe font-black ${lightMode ? 'text-black/35' : 'text-white/25'}`}>Current Archive</span>
          <span className={`text-sm font-cinematic font-black tracking-tight leading-none mt-0.5 ${lightMode ? 'text-[#2A1A0A]' : 'text-[#F5F0E8]'}`}>
            {trip?.name || 'Loading...'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className={`hidden lg:flex items-center gap-6 mr-4 pr-6 ${lightMode ? 'border-r border-black/[0.06]' : 'border-r border-white/[0.06]'}`}>
          <div className="flex flex-col items-end">
            <span className={`text-[8px] uppercase tracking-widest font-black ${lightMode ? 'text-black/30' : 'text-white/20'}`}>Cooked</span>
            <span className="text-sm font-vibe font-black text-cooked-accent">{cookedLevel}/100</span>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-[8px] uppercase tracking-widest font-black ${lightMode ? 'text-black/30' : 'text-white/20'}`}>Verdict</span>
            <span className={`text-[10px] font-vibe font-black uppercase tracking-wider ${lightMode ? 'text-black/50' : 'text-white/60'}`}>{verdict}</span>
          </div>
        </div>

        {/* Light / Dark mode toggle */}
        {onToggleLight && (
          <button
            onClick={onToggleLight}
            title={lightMode ? 'Switch to dark mode' : 'Switch to light mode'}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
              lightMode
                ? 'bg-black/8 border border-black/12 text-black/50 hover:text-black/80'
                : 'bg-white/8 border border-white/12 text-white/40 hover:text-white/70'
            }`}
          >
            {lightMode ? (
              // Moon icon
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              // Sun icon
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </button>
        )}

        <Link
          href={`/trips/${trip?.id}/share`}
          className="px-5 py-2.5 bg-cooked-accent text-white rounded-full text-[10px] font-vibe font-black uppercase tracking-widest hover:scale-105 transition-all"
        >
          Export
        </Link>
        <Link
          href={`/trips/${trip?.id}/story`}
          className={`px-5 py-2.5 rounded-full text-[10px] font-vibe font-black uppercase tracking-widest transition-all ${
            lightMode
              ? 'bg-black/5 border border-black/10 text-black/50 hover:bg-black/10'
              : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
          }`}
        >
          Story Mode
        </Link>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVE HERO — emotionally overwhelming full-height documentary opening
// ─────────────────────────────────────────────────────────────────────────────
export function ArchiveHero({ trip }: { trip: any }) {
  const lore = trip?.lore_json;
  const tagline = lore?.tagline || 'The lore is still being written...';
  const name = trip?.name || 'Untitled Season';
  const destination = trip?.destination || '';
  const verdict = lore?.cooked_verdict || '';
  const memberCount = trip?.member_count || 0;
  const photoCount = trip?.total_photos || 0;
  const level = lore?.cooked_level ?? trip?.chaos_score ?? 0;
  const accentColor = level >= 76 ? '#FF4D4D' : level >= 51 ? '#D49E2D' : '#2D9E8B';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[2.5rem] bg-[#060604] min-h-[80vh] flex flex-col justify-end"
    >
      {/* ── Layer 1: blurred photo or deep gradient ── */}
      <div className="absolute inset-0">
        {trip?.cover_photo ? (
          <img
            src={trip.cover_photo}
            alt=""
            className="w-full h-full object-cover opacity-20 grayscale scale-[1.05]"
            style={{ filter: 'grayscale(100%) contrast(1.3) blur(2px)' }}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `radial-gradient(ellipse at 20% 30%, ${accentColor}18 0%, transparent 55%), radial-gradient(ellipse at 85% 75%, rgba(45,158,139,0.08) 0%, transparent 50%)`,
            }}
          />
        )}
      </div>

      {/* ── Layer 2: atmospheric blobs ── */}
      <div
        className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full blur-[180px] pointer-events-none"
        style={{ background: `${accentColor}14`, animation: 'floatA 14s ease-in-out infinite' }}
      />
      <div
        className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[150px] pointer-events-none"
        style={{ background: 'rgba(45,158,139,0.06)', animation: 'floatB 18s ease-in-out infinite' }}
      />

      {/* ── Layer 3: cinematic gradient ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#060604] via-[#060604]/50 to-[#060604]/10 pointer-events-none" />

      {/* ── Layer 4: film grain ── */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none animate-grain bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%270%200%20256%20256%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter%20id=%27n%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.85%27%20numOctaves=%274%27%20stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url(%23n)%27/%3E%3C/svg%3E')] bg-[length:180px_180px]" />

      {/* ── Layer 5: VHS scanline ── */}
      <div className="absolute left-0 right-0 h-12 pointer-events-none opacity-[0.04] animate-scan"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.4), transparent)' }}
      />

      {/* ── Layer 6: floating polaroid fragments ── */}
      {[
        { top: '12%', right: '8%', rotate: '8deg', delay: '0s' },
        { top: '6%', right: '22%', rotate: '-5deg', delay: '1s' },
        { top: '18%', right: '3%', rotate: '-12deg', delay: '2s' },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute w-14 h-16 bg-white/[0.03] border border-white/[0.06] rounded-sm flex flex-col overflow-hidden"
          style={{ top: pos.top, right: pos.right, transform: `rotate(${pos.rotate})`, animation: `float-up ${5 + i}s ease-in-out infinite`, animationDelay: pos.delay }}
        >
          <div className="flex-1" style={{ background: `${accentColor}08`, filter: 'blur(4px)' }} />
          <div className="h-3 bg-white/[0.02]" />
        </div>
      ))}

      {/* ── Layer 7: CLASSIFIED watermark ── */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-mono uppercase tracking-[0.8em] border-2 px-6 py-2 rounded pointer-events-none select-none"
        style={{
          color: `${accentColor}08`,
          borderColor: `${accentColor}06`,
          transform: 'translate(-50%, -50%) rotate(-15deg)',
          fontSize: '52px',
          letterSpacing: '0.5em',
        }}
      >
        ARCHIVE
      </div>

      {/* ── Top meta bar ── */}
      <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-10">
        <div className="flex gap-2 flex-wrap">
          {verdict && (
            <span className="px-3 py-1.5 rounded-full text-white text-[8px] font-vibe font-black uppercase tracking-[0.2em]"
              style={{ background: accentColor }}>
              {verdict}
            </span>
          )}
          {destination && (
            <span className="px-3 py-1.5 rounded-full bg-white/[0.06] backdrop-blur-md text-white/40 text-[8px] font-vibe font-black uppercase tracking-[0.2em] border border-white/[0.08]">
              {destination}
            </span>
          )}
        </div>
        <div className="text-right space-y-0.5">
          <div className="text-[7px] font-mono text-white/12 uppercase tracking-[0.35em]">Archive</div>
          <div className="font-mono text-[11px] text-white/25 animate-flicker">
            {trip?.id?.slice(0, 8)?.toUpperCase() || '——'}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 p-10 space-y-8">
        {/* Season label */}
        <div className="text-[9px] font-mono text-white/20 uppercase tracking-[0.5em]">
          Season {new Date().getFullYear()} · {memberCount} cast · {photoCount} photos documented
        </div>

        {/* Giant title */}
        <div className="space-y-3">
          <h1
            className="font-cinematic font-black tracking-tighter text-[#F5F0E8] uppercase leading-[0.80]"
            style={{ fontSize: 'clamp(52px, 9vw, 100px)' }}
          >
            {name}
          </h1>
          <p className="text-xl text-white/35 font-cinematic italic max-w-xl leading-relaxed">
            &ldquo;{tagline}&rdquo;
          </p>
        </div>

        {/* Narrative excerpt */}
        {lore?.season_recap?.full_narrative && (
          <p className="text-sm text-white/20 font-data font-light leading-relaxed line-clamp-2 max-w-lg border-l border-white/[0.06] pl-4">
            {lore.season_recap.full_narrative}
          </p>
        )}

        {/* CTAs */}
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/trips/${trip?.id}/story`}
            className="flex items-center gap-2.5 px-7 py-4 bg-[#F5F0E8] text-black rounded-full text-[10px] font-vibe font-black uppercase tracking-widest hover:scale-[1.03] active:scale-95 transition-all shadow-3xl"
          >
            <Play size={13} fill="currentColor" /> Play Documentary
          </Link>
          <Link
            href={`/trips/${trip?.id}/share`}
            className="flex items-center gap-2.5 px-7 py-4 bg-white/[0.05] border border-white/[0.08] text-white/55 rounded-full text-[10px] font-vibe font-black uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            <Share2 size={13} /> Share Archive
          </Link>
          <Link
            href={`/trips/${trip?.id}/invite`}
            className="flex items-center gap-2.5 px-7 py-4 bg-white/[0.05] border border-white/[0.08] text-white/55 rounded-full text-[10px] font-vibe font-black uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            <Plus size={13} /> Add Cast
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVE REVEAL — MVP / Villain / Inside Joke cards
// ─────────────────────────────────────────────────────────────────────────────
export function ArchiveReveal({ category, name, subtitle, desc, cta, challengeCta, color = '#FF4D4D', imageUrl }: {
  category: string; name: string; subtitle?: string; desc?: string;
  cta?: string; challengeCta?: string; color?: string; imageUrl?: string;
}) {
  const initial = name.replace(/[^a-zA-Z]/g, '')[0]?.toUpperCase() || '?';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, filter: 'blur(6px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex rounded-[2.5rem] bg-[#0E0E0C] border border-white/[0.06] overflow-hidden hover:border-white/[0.12] transition-all duration-500 hover:shadow-3xl"
    >
      {/* Cinematic photo / gradient panel */}
      <div className="w-[180px] md:w-[220px] flex-shrink-0 relative overflow-hidden min-h-[200px]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            style={{ filter: 'contrast(1.15) saturate(0.75)' }}
          />
        ) : (
          <>
            {/* Vivid gradient background */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(145deg, ${color}35 0%, ${color}12 50%, transparent 100%)`,
              }}
            />
            {/* Noise texture */}
            <div className="absolute inset-0 opacity-[0.06] bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%270%200%20256%20256%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter%20id=%27n%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.85%27%20numOctaves=%274%27%20stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url(%23n)%27/%3E%3C/svg%3E')] bg-[length:200px_200px]" />
            {/* Giant watermark initial */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <span
                className="text-[140px] font-cinematic font-black leading-none select-none"
                style={{ color, opacity: 0.08 }}
              >
                {initial}
              </span>
            </div>
            {/* Floating category label */}
            <div className="absolute bottom-5 left-5">
              <span
                className="text-[8px] font-vibe font-black uppercase tracking-[0.25em] px-3 py-1.5 rounded-full"
                style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
              >
                {category.split('–')[0].trim()}
              </span>
            </div>
          </>
        )}
        {/* Gradient bleed into card */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to right, transparent 55%, #0E0E0C 100%)' }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 py-8 pr-8 pl-4 space-y-3 flex flex-col justify-center">
        <span className="text-[9px] uppercase tracking-[0.35em] font-vibe font-black" style={{ color: `${color}70` }}>
          {category}
        </span>
        <h3 className="text-[28px] font-cinematic font-black tracking-tight text-[#F5F0E8] leading-[1.1]">
          {name}
        </h3>
        {subtitle && (
          <span
            className="inline-block px-3 py-1 rounded-full text-[8px] font-vibe font-black uppercase tracking-widest w-fit"
            style={{ background: `${color}12`, color: `${color}90`, border: `1px solid ${color}20` }}
          >
            {subtitle}
          </span>
        )}
        {desc && (
          <p className="text-[12px] text-white/35 font-data font-light leading-relaxed italic max-w-sm line-clamp-3">
            &ldquo;{desc}&rdquo;
          </p>
        )}
        <div className="flex gap-2 pt-1 flex-wrap">
          {cta && (
            <button
              className="px-5 py-2 rounded-full text-[9px] font-vibe font-black uppercase tracking-widest border transition-all hover:scale-[1.04] active:scale-95"
              style={{ borderColor: `${color}35`, color, background: `${color}10` }}
            >
              {cta}
            </button>
          )}
          {challengeCta && (
            <button className="px-5 py-2 rounded-full text-[9px] font-vibe font-black uppercase tracking-widest border border-white/10 text-white/30 hover:bg-white/5 transition-all">
              {challengeCta}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR WIDGETS
// ─────────────────────────────────────────────────────────────────────────────
export function ProducerWidget({ trip }: { trip: any }) {
  const members = trip?.members || [];
  return (
    <div className="p-8 rounded-[2.5rem] bg-[#0E0E0C] border border-white/[0.06] space-y-6">
      <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-vibe font-black block">The Cast</span>
      <div className="space-y-4">
        {members.slice(0, 4).map((m: any, i: number) => (
          <div key={m.user_id || i} className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-cooked-accent/10 border border-cooked-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-vibe font-black text-cooked-accent">
                {(m.display_name || '?')[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-vibe font-black text-white/80 truncate">{m.display_name}</p>
              <p className="text-[9px] text-white/25 font-data uppercase tracking-wider truncate">
                {m.role_title || 'Role pending...'}
              </p>
            </div>
            {m.role_chaos_rating !== null && m.role_chaos_rating !== undefined && (
              <span className="text-[10px] font-vibe font-black text-cooked-accent flex-shrink-0">
                {m.role_chaos_rating}/10
              </span>
            )}
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-[11px] text-white/20 italic font-cinematic">Cast list processing...</p>
        )}
      </div>
    </div>
  );
}

export function ChaosChartWidget({ trip }: { trip: any }) {
  const stats = trip?.stats || [];
  return (
    <div className="p-8 rounded-[2.5rem] bg-[#0E0E0C] border border-white/[0.06] space-y-6">
      <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-vibe font-black block">Data Receipts</span>
      <div className="space-y-4">
        {stats.slice(0, 4).map((s: any, i: number) => (
          <div key={s.id || i} className="flex justify-between items-end border-b border-white/[0.04] pb-3">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-white/20 font-vibe font-black mb-1">{s.label}</p>
              <p className="text-xl font-vibe font-black text-[#F5F0E8]">{s.value}</p>
            </div>
            {s.unit && <span className="text-[9px] text-white/20 font-mono">{s.unit}</span>}
          </div>
        ))}
        {stats.length === 0 && (
          <p className="text-[11px] text-white/20 italic font-cinematic">Stats generating...</p>
        )}
      </div>
    </div>
  );
}

export function SchematicWidget({ trip }: { trip: any }) {
  const lore = trip?.lore_json;
  return (
    <div className="p-8 rounded-[2.5rem] bg-[#0E0E0C] border border-white/[0.06] space-y-6">
      <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-vibe font-black block">Inside Jokes Detected</span>
      <div className="relative h-[160px] flex items-center justify-center">
        {lore ? (
          <div className="space-y-3 w-full">
            <div className="flex gap-2 flex-wrap">
              {['Peak Delusion', 'The 3AM Phase', 'Blame Kev', 'Food Evidence', 'Group Lore'].map((tag, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full border border-white/10 text-[9px] font-vibe font-black text-white/30 uppercase tracking-wider hover:border-white/20 hover:text-white/50 transition-all cursor-default">
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-white/15 font-data italic">
              Archive No. {trip?.id?.slice(0, 6) || '???'} – AI annotation active.
            </p>
          </div>
        ) : (
          <div className="w-full h-full border border-dashed border-white/10 rounded-2xl flex items-center justify-center">
            <p className="text-[10px] text-white/15 italic font-cinematic">Schematic pending...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GALLERY CARD (Trips list)
// ─────────────────────────────────────────────────────────────────────────────
export function CinematicGalleryCard({ trip }: { trip: any }) {
  const cookedLevel = trip?.lore_json?.cooked_level ?? trip?.chaos_score ?? 0;
  const isCooked = cookedLevel >= 80;
  const isUnstable = cookedLevel >= 50 && cookedLevel < 80;
  const statusLabel = isCooked ? 'Historically Cooked' : isUnstable ? 'Peak Delusion' : 'Stable Archive';
  const statusColor = isCooked ? 'text-cooked-accent' : isUnstable ? 'text-unstable-accent' : 'text-chill-accent';
  const borderColor = isCooked ? 'border-cooked-accent/15' : isUnstable ? 'border-unstable-accent/15' : 'border-white/[0.06]';

  return (
    <Link
      href={`/trips/${trip.id}`}
      className={cn(
        "group relative block aspect-[3/4] rounded-[2.5rem] bg-[#0E0E0C] border overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl",
        borderColor
      )}
    >
      {/* Background */}
      <div className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-700">
        {trip?.lore_json?.cooked_level ? (
          <div className="w-full h-full" style={{
            background: `radial-gradient(ellipse at top, ${isCooked ? '#FF4D4D15' : isUnstable ? '#D49E2D10' : '#2D9E8B10'}, transparent 70%)`
          }} />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-white/[0.02] to-transparent" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

      <div className="absolute inset-x-6 bottom-8 space-y-4">
        <div className="flex items-center gap-2">
          <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isCooked ? 'bg-cooked-accent' : 'bg-white/30')} />
          <span className={cn("text-[8px] font-vibe font-black uppercase tracking-[0.3em]", statusColor)}>
            {trip.lore_status === 'ready' ? statusLabel : trip.lore_status === 'processing' ? 'Generating Lore...' : 'No Lore Yet'}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[8px] uppercase tracking-widest text-white/15 font-vibe font-black block">
            Archive {trip.id.slice(0, 4).toUpperCase()}
          </span>
          <h3 className="text-3xl font-cinematic font-black tracking-tighter leading-none text-[#F5F0E8] group-hover:text-cooked-accent transition-colors duration-300 uppercase">
            {trip.name}
          </h3>
        </div>

        <p className="text-[11px] text-white/35 italic font-cinematic leading-relaxed line-clamp-2">
          &ldquo;{trip.lore_json?.tagline || trip.destination || 'No tagline yet.'}&rdquo;
        </p>

        <div className="flex justify-between items-end pt-3 border-t border-white/[0.06]">
          <div className="flex items-baseline gap-2">
            <span className={cn("text-4xl font-vibe font-black", statusColor)}>
              {cookedLevel || '—'}
            </span>
            <span className="text-[8px] uppercase tracking-wider text-white/20 font-vibe font-black">Cooked</span>
          </div>
          <div className="w-10 h-10 rounded-full border border-white/[0.08] flex items-center justify-center text-white/20 group-hover:border-white/30 group-hover:text-white transition-all">
            <Play size={14} fill="currentColor" className="ml-0.5" />
          </div>
        </div>
      </div>

      <div className="absolute top-6 right-6 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
        <span className="text-[8px] font-vibe font-black uppercase tracking-widest text-white/50">
          {trip.member_count || 0} cast
        </span>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LORE WRAPPED — Spotify-wrapped style reveal
// ─────────────────────────────────────────────────────────────────────────────
export function LoreWrapped({ trip, onFinish }: { trip: any; onFinish: () => void }) {
  const [step, setStep] = React.useState(0);
  const lore = trip?.lore_json;

  const slides = [
    {
      eyebrow: 'Season Begins',
      title: trip?.name || 'Untitled Season',
      body: `${trip?.member_count || 0} people. ${trip?.total_photos || 0} photos. One chaotic truth.`,
      accent: '#FF4D4D',
      stat: lore?.cooked_level ? `${lore.cooked_level}/100` : '??',
      statLabel: 'Cooked',
    },
    {
      eyebrow: 'The Verdict',
      title: lore?.cooked_verdict || 'Processing...',
      body: lore?.cooked_explanation || 'The AI historian is reviewing the evidence.',
      accent: '#D49E2D',
      stat: lore?.trip_eras?.length ? `${lore.trip_eras.length} eras` : '—',
      statLabel: 'Timeline',
    },
    {
      eyebrow: 'The Closing Line',
      title: 'Enter the Archive',
      body: lore?.closing_line || `"${trip?.name} happened. The rest is mythology."`,
      accent: '#2D9E8B',
      stat: 'Archived',
      statLabel: 'Status',
    },
  ];

  const current = slides[step];

  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(8px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(8px)', scale: 0.98 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[200] bg-[#060604] flex flex-col items-center justify-center p-8 overflow-hidden"
    >
      {/* Ambient */}
      <div
        className="absolute inset-0 opacity-15 blur-[200px] transition-colors duration-1000 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at center, ${current.accent}, transparent 70%)` }}
      />

      {/* Film grain */}
      <div className="fixed inset-0 z-[100] pointer-events-none opacity-[0.04] mix-blend-overlay animate-grain bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%270%200%20256%20256%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter%20id=%27noise%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.9%27%20numOctaves=%274%27%20stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url(%23noise)%27/%3E%3C/svg%3E')] bg-[length:180px_180px]" />

      <button
        onClick={onFinish}
        className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all z-50"
      >
        <X size={20} />
      </button>

      <div className="relative z-10 max-w-2xl w-full space-y-16 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step + 'content'}
            initial={{ y: 30, opacity: 0, filter: 'blur(6px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: -20, opacity: 0, filter: 'blur(4px)' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            <span className="text-[10px] uppercase tracking-[0.5em] text-white/25 font-vibe font-black">
              {current.eyebrow}
            </span>
            <h2 className="text-6xl md:text-8xl font-cinematic font-black tracking-tighter leading-none text-[#F5F0E8] uppercase italic">
              {current.title}
            </h2>
            <div className="text-[18vw] md:text-[12vw] font-vibe font-black tracking-tighter leading-none" style={{ color: current.accent }}>
              {current.stat}
            </div>
            <p className="text-xl text-white/35 font-cinematic italic max-w-md mx-auto leading-relaxed">
              &ldquo;{current.body}&rdquo;
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress + CTA */}
      <div className="absolute bottom-12 inset-x-8 flex items-center justify-between max-w-2xl mx-auto left-1/2 -translate-x-1/2 w-full px-8">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div key={i} className={cn(
              "h-1 rounded-full transition-all duration-500",
              i === step ? "w-12 bg-white" : i < step ? "w-4 bg-white/40" : "w-4 bg-white/10"
            )} />
          ))}
        </div>

        <button
          onClick={() => step < slides.length - 1 ? setStep(step + 1) : onFinish()}
          className="flex items-center gap-3 px-10 py-5 bg-[#F5F0E8] text-black rounded-full text-[11px] font-vibe font-black uppercase tracking-widest group hover:scale-105 transition-all"
        >
          {step < slides.length - 1 ? 'Next File' : 'Enter Archive'}
          <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIGHT SIDEBAR — Letterboxd-style cream panel widgets
// ─────────────────────────────────────────────────────────────────────────────

export function CookedScoreLight({ trip }: { trip: any }) {
  const lore = trip?.lore_json;
  const level = lore?.cooked_level ?? trip?.chaos_score ?? 0;
  const tenScore = (level / 10).toFixed(1);
  const verdict = lore?.cooked_verdict ?? '—';
  const explanation = lore?.cooked_explanation;
  const accentColor = level >= 76 ? '#FF4D4D' : level >= 51 ? '#D49E2D' : '#2D9E8B';
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 300); return () => clearTimeout(t); }, []);

  return (
    <div className="p-8 rounded-[2.5rem] bg-chill-bg space-y-5">
      <span className="text-[9px] uppercase tracking-[0.35em] text-black/25 font-vibe font-black block">Delusion Index</span>

      <div className="flex items-baseline gap-4">
        <span className="font-vibe font-black leading-none text-lore-ink" style={{ fontSize: '88px', fontVariantNumeric: 'tabular-nums' }}>
          {level}
        </span>
        <div className="space-y-0.5 pb-2">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-vibe font-black" style={{ color: accentColor }}>{tenScore}</span>
            <span className="text-xs text-black/25 font-vibe font-black">/10</span>
          </div>
          <span className="block text-[8px] uppercase tracking-[0.3em] text-black/25 font-vibe font-black">Chaos</span>
        </div>
      </div>

      <span
        className="inline-block px-4 py-2 rounded-full text-[9px] font-vibe font-black uppercase tracking-wider"
        style={{ backgroundColor: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}25` }}
      >
        {verdict}
      </span>

      {explanation && (
        <p className="text-xs text-lore-muted font-data italic leading-relaxed border-l-2 border-black/10 pl-4">
          {explanation}
        </p>
      )}

      {/* Progress bar */}
      <div className="space-y-1.5 pt-1">
        <div className="h-1.5 bg-black/[0.08] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${level}%`,
              backgroundColor: accentColor,
              transformOrigin: 'left',
              transform: mounted ? 'scaleX(1)' : 'scaleX(0)',
              transition: 'transform 1.5s cubic-bezier(0.16,1,0.3,1)',
            }}
          />
        </div>
        <div className="flex justify-between text-[8px] font-vibe font-black uppercase tracking-widest text-black/20">
          <span>Calm</span>
          <span>Historically Cooked</span>
        </div>
      </div>
    </div>
  );
}

export function BadFeelingsChart({ trip }: { trip: any }) {
  const lore = trip?.lore_json;
  const level = lore?.cooked_level ?? 60;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 300); return () => clearTimeout(t); }, []);
  const stats = (lore?.receipt_stats || []).filter((s: any) => s.label && s.value);

  const feelings: { label: string; value: number; color: string }[] = stats.length >= 3
    ? stats.slice(0, 4).map((s: any, i: number) => {
        const raw = parseFloat(s.value);
        return {
          label: s.label,
          value: isNaN(raw) ? Math.max(20, level - i * 10) : Math.min(99, Math.max(5, raw)),
          color: ['#FF4D4D', '#D49E2D', '#2D9E8B', '#7C6AFF'][i % 4],
        };
      })
    : [
        { label: 'Chaos Energy',     value: level,                          color: '#FF4D4D' },
        { label: 'Emotional Damage', value: Math.round(level * 0.82),       color: '#D49E2D' },
        { label: 'Group Stability',  value: Math.round((100 - level) * 0.7 + 18), color: '#2D9E8B' },
        { label: 'Delusion Level',   value: Math.round(level * 0.65 + 10),  color: '#7C6AFF' },
      ];

  return (
    <div className="p-8 rounded-[2.5rem] bg-chill-bg space-y-6">
      <span className="text-[9px] uppercase tracking-[0.35em] text-black/25 font-vibe font-black block">Top Bad Feelings</span>
      <div className="space-y-5">
        {feelings.map((f, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-vibe font-black uppercase tracking-wider text-lore-soft">{f.label}</span>
              <span className="text-[10px] font-vibe font-black tabular-nums" style={{ color: f.color }}>{Math.round(f.value)}%</span>
            </div>
            <div className="h-1 bg-black/[0.07] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${f.value}%`,
                  backgroundColor: f.color,
                  transformOrigin: 'left',
                  transform: mounted ? 'scaleX(1)' : 'scaleX(0)',
                  transition: `transform 1.1s cubic-bezier(0.16,1,0.3,1) ${i * 0.12}s`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({ trip }: { trip: any }) {
  const lore = trip?.lore_json;
  const level = lore?.cooked_level ?? trip?.chaos_score ?? 60;
  const eras = lore?.trip_eras || [];

  const PALETTE = ['#FF4D4D', '#D49E2D', '#2D9E8B', '#7C6AFF'];

  const segments: { label: string; pct: number; color: string }[] =
    eras.length >= 2
      ? eras.slice(0, 4).map((era: any, i: number) => ({
          label: era.era_name,
          pct: Math.round(100 / Math.min(eras.length, 4)),
          color: PALETTE[i % 4],
        }))
      : [
          { label: 'Peak Chaos',      pct: level,           color: '#FF4D4D' },
          { label: 'Stable Moments',  pct: 100 - level,     color: '#2D9E8B' },
        ];

  const r = 38;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;
  const arcs = segments.map((seg: { label: string; pct: number; color: string }) => {
    const dash = (seg.pct / 100) * circumference;
    const offset = -(cumulative / 100) * circumference;
    cumulative += seg.pct;
    return { ...seg, dash, offset };
  });

  return (
    <div className="p-8 rounded-[2.5rem] bg-chill-bg space-y-6">
      <span className="text-[9px] uppercase tracking-[0.35em] text-black/25 font-vibe font-black block">Season Breakdown</span>
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
          <svg width="90" height="90" viewBox="0 0 100 100" className="-rotate-90">
            {/* Background ring */}
            <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="10" />
            {arcs.map((a, i) => (
              <circle
                key={i}
                cx="50" cy="50" r={r}
                fill="none"
                stroke={a.color}
                strokeWidth="10"
                strokeDasharray={`${a.dash} ${circumference - a.dash}`}
                strokeDashoffset={a.offset}
                strokeLinecap="butt"
                opacity="0.82"
              />
            ))}
          </svg>
        </div>
        <div className="flex-1 space-y-2.5">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-[10px] font-vibe font-black text-lore-soft uppercase tracking-wider truncate flex-1">{s.label}</span>
              <span className="text-[10px] font-vibe font-black text-black/35 tabular-nums">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LightCastWidget({ trip }: { trip: any }) {
  const members = trip?.members || [];
  const COLORS = ['#FF4D4D', '#D49E2D', '#2D9E8B', '#7C6AFF', '#FF6B35'];

  return (
    <div className="p-8 rounded-[2.5rem] bg-chill-bg space-y-6">
      <span className="text-[9px] uppercase tracking-[0.35em] text-black/25 font-vibe font-black block">The Cast</span>
      <div className="space-y-4">
        {members.length === 0 && (
          <p className="text-[11px] text-lore-muted italic font-cinematic">Cast list processing...</p>
        )}
        {members.slice(0, 5).map((m: any, i: number) => (
          <div key={m.user_id || i} className="flex items-center gap-3.5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-vibe font-black text-white shadow-sm"
              style={{ background: COLORS[i % COLORS.length] }}
            >
              {(m.display_name || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-vibe font-black text-lore-ink truncate leading-none mb-0.5">
                {m.display_name}
              </p>
              <p className="text-[9px] uppercase tracking-wider text-lore-muted font-vibe font-black truncate">
                {m.role_title || 'Role pending...'}
              </p>
            </div>
            {m.role_chaos_rating != null && (
              <span className="text-[11px] font-vibe font-black text-cooked-accent flex-shrink-0 tabular-nums">
                {m.role_chaos_rating}/10
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVE FOOTER
// ─────────────────────────────────────────────────────────────────────────────
export function ArchiveFooter({ publicUrl, posterUrl }: { publicUrl?: string; posterUrl?: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    const url = publicUrl
      ? (publicUrl.startsWith('http') ? publicUrl : `${window.location.origin}${publicUrl}`)
      : window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSharePoster = () => {
    const url = posterUrl
      ? (posterUrl.startsWith('http') ? posterUrl : `${window.location.origin}${posterUrl}`)
      : window.location.href;
    if (navigator.share) {
      navigator.share({ url, title: 'Yaarlore — Archive' }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <footer className="mt-40 border-t border-white/[0.04] pt-24 pb-48 px-6">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
        <div className="col-span-1 md:col-span-2 space-y-6">
          <span className="text-[10px] uppercase tracking-[0.5em] text-white/20 font-vibe font-black block">Theatrical Credits</span>
          <p className="text-sm text-white/15 leading-relaxed font-cinematic max-w-md italic">
            Rendered by Lore Pipeline v2.0 · AI vision model active · All inside joke detection armed.
          </p>
        </div>

        <div className="space-y-6">
          <span className="text-[10px] uppercase tracking-[0.5em] text-white/20 font-vibe font-black block">Share the Season</span>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSharePoster}
              className="px-8 py-3.5 bg-cooked-accent text-white rounded-full text-[10px] font-vibe font-black uppercase tracking-widest hover:scale-105 transition-all w-fit"
            >
              Share Poster
            </button>
            <button
              onClick={handleCopyLink}
              className="px-8 py-3.5 bg-white/5 border border-white/10 text-white/40 rounded-full text-[10px] font-vibe font-black uppercase tracking-widest hover:bg-white/10 transition-all w-fit"
            >
              {copied ? '✓ Copied!' : 'Copy O.G. Link'}
            </button>
          </div>
        </div>

        <div className="space-y-6 md:text-right">
          <span className="text-[10px] uppercase tracking-[0.5em] text-white/20 font-vibe font-black block">Micro-Lore Links</span>
          <div className="flex flex-col gap-3">
            <Link href="/privacy" className="text-[11px] text-white/30 hover:text-white/55 transition-colors font-data">Privacy Policy</Link>
            <Link href="/terms" className="text-[11px] text-white/30 hover:text-white/55 transition-colors font-data">Terms of Archive</Link>
            <a
              href="mailto:bhuneshbansal20039888@gmail.com?subject=Report a Trip"
              className="text-[11px] text-white/30 hover:text-white/55 transition-colors font-data"
            >
              Report a Trip
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
