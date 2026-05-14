'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { CinematicText, AtmosphericBlob } from '@/components/ui/atoms';
import { cn } from '@/lib/utils';
import { Play, Plus, X, ChevronRight, Zap, Star, Shield, Share2, Download } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVE NAVBAR
// ─────────────────────────────────────────────────────────────────────────────
export function ArchiveNavbar({ trip }: { trip: any }) {
  const cookedLevel = trip?.lore_json?.cooked_level ?? trip?.chaos_score ?? '—';
  const verdict = trip?.lore_json?.cooked_verdict ?? 'Processing...';

  return (
    <nav className="sticky top-0 z-[100] w-full px-6 py-4 bg-[#060604]/90 backdrop-blur-2xl border-b border-white/[0.06] flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/trips" className="w-8 h-8 bg-cooked-accent rounded-lg flex items-center justify-center font-vibe font-black text-xs text-white hover:scale-110 transition-transform">
          W
        </Link>
        <div className="hidden md:block h-6 w-px bg-white/10" />
        <div className="hidden md:flex flex-col">
          <span className="text-[8px] uppercase tracking-[0.3em] text-white/25 font-vibe font-black">Current Archive</span>
          <span className="text-sm font-cinematic font-black tracking-tight text-[#F5F0E8] leading-none mt-0.5">
            {trip?.name || 'Loading...'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-6 mr-4 pr-6 border-r border-white/[0.06]">
          <div className="flex flex-col items-end">
            <span className="text-[8px] uppercase tracking-widest text-white/20 font-black">Cooked</span>
            <span className="text-sm font-vibe font-black text-cooked-accent">{cookedLevel}/100</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] uppercase tracking-widest text-white/20 font-black">Verdict</span>
            <span className="text-[10px] font-vibe font-black text-white/60 uppercase tracking-wider">{verdict}</span>
          </div>
        </div>

        <Link
          href={`/trips/${trip?.id}/share`}
          className="px-5 py-2.5 bg-cooked-accent text-white rounded-full text-[10px] font-vibe font-black uppercase tracking-widest hover:scale-105 transition-all shadow-glow-red"
        >
          Export
        </Link>
        <Link
          href={`/trips/${trip?.id}/story`}
          className="px-5 py-2.5 bg-white/5 border border-white/10 text-white/60 rounded-full text-[10px] font-vibe font-black uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          Story Mode
        </Link>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVE HERO — Matches reference image layout
// ─────────────────────────────────────────────────────────────────────────────
export function ArchiveHero({ trip }: { trip: any }) {
  const lore = trip?.lore_json;
  const cookedLevel = lore?.cooked_level ?? trip?.chaos_score ?? 0;
  const tagline = lore?.tagline || 'The lore is still being written...';
  const name = trip?.name || 'Untitled Season';
  const destination = trip?.destination || '';
  const verdict = lore?.cooked_verdict || '';

  // Palette based on cooked level
  const isCooked = cookedLevel >= 76;
  const isPeak = cookedLevel >= 51;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT: Main story block */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-7 relative rounded-[2.5rem] bg-[#0E0E0C] border border-white/[0.06] overflow-hidden flex flex-col"
      >
        {/* Cover image with overlay */}
        <div className="h-[280px] relative overflow-hidden">
          {trip?.cover_photo ? (
            <img
              src={trip.cover_photo}
              alt=""
              className="w-full h-full object-cover grayscale opacity-50 contrast-125 scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-cooked-accent/10 via-transparent to-lore-accent/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E0C] via-[#0E0E0C]/30 to-transparent" />

          {/* Floating badges */}
          <div className="absolute top-6 left-6 flex gap-2 flex-wrap">
            {verdict && (
              <span className="px-3 py-1.5 rounded-full bg-cooked-accent text-white text-[8px] font-vibe font-black uppercase tracking-[0.2em]">
                {verdict}
              </span>
            )}
            {destination && (
              <span className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white/60 text-[8px] font-vibe font-black uppercase tracking-[0.2em]">
                {destination}
              </span>
            )}
            <span className="px-3 py-1.5 rounded-full bg-[#0E0E0C]/60 backdrop-blur-md text-white/40 text-[8px] font-vibe font-black uppercase tracking-[0.2em] border border-white/10">
              {trip?.member_count || 0} cast members
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-10 space-y-6 flex-1">
          <div className="space-y-3">
            <h1 className="text-5xl md:text-7xl font-cinematic font-black tracking-tighter leading-[0.85] text-[#F5F0E8] uppercase">
              {name}
            </h1>
            <p className="text-lg text-white/35 font-cinematic italic max-w-lg leading-relaxed">
              &ldquo;{tagline}&rdquo;
            </p>
          </div>

          {/* Narrative excerpt */}
          {lore?.season_recap?.full_narrative && (
            <p className="text-sm text-white/40 font-data font-light leading-relaxed line-clamp-3 border-l-2 border-white/10 pl-4">
              {lore.season_recap.full_narrative}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={`/trips/${trip?.id}/share`}
              className="flex items-center gap-2 px-7 py-3.5 bg-cooked-accent text-white rounded-full text-[10px] font-vibe font-black uppercase tracking-widest hover:scale-105 transition-all shadow-glow-red"
            >
              <Download size={14} /> Save Poster
            </Link>
            <Link
              href={`/trips/${trip?.id}/story`}
              className="flex items-center gap-2 px-7 py-3.5 bg-white/5 border border-white/10 text-white/60 rounded-full text-[10px] font-vibe font-black uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              <Play size={14} fill="currentColor" /> Story Mode
            </Link>
            <Link
              href={`/trips/${trip?.id}/share`}
              className="flex items-center gap-2 px-7 py-3.5 bg-white/5 border border-white/10 text-white/60 rounded-full text-[10px] font-vibe font-black uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              <Share2 size={14} /> Share O.G.
            </Link>
          </div>
        </div>
      </motion.div>

      {/* RIGHT: Stats column */}
      <div className="lg:col-span-5 space-y-5">
        {/* Delusion Index */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="p-8 rounded-[2.5rem] bg-[#0E0E0C] border border-white/[0.06] flex flex-col justify-between gap-4"
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-vibe font-black block mb-3">Delusion Index</span>
              <div className="text-8xl font-vibe font-black leading-none" style={{
                color: isCooked ? '#FF4D4D' : isPeak ? '#D49E2D' : '#2D9E8B'
              }}>
                {cookedLevel}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cooked-accent/10 flex items-center justify-center">
              <Zap size={20} className="text-cooked-accent" />
            </div>
          </div>
          <p className="text-[11px] text-white/30 font-data leading-relaxed italic">
            {lore?.cooked_explanation || 'The AI historian is still processing the evidence.'}
          </p>
        </motion.div>

        {/* Emotional Damage */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="p-8 rounded-[2.5rem] bg-[#0E0E0C] border border-white/[0.06] space-y-4"
        >
          <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-vibe font-black block">Emotional Damage</span>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-vibe font-black text-unstable-accent">
              {trip?.total_photos || 0}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-white/20 font-vibe font-black">photos archived</span>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-chill-accent to-cooked-accent rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(100, (trip?.total_photos || 0) / 2)}%` }}
            />
          </div>
        </motion.div>

        {/* Plot Twist block */}
        {lore?.season_recap?.act_2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-8 rounded-[2.5rem] border border-cooked-accent/20 bg-cooked-accent/5 space-y-3"
          >
            <span className="text-[9px] uppercase tracking-[0.3em] text-cooked-accent/60 font-vibe font-black">Plot Twist</span>
            <p className="text-sm text-white/60 font-data font-light leading-relaxed italic">
              &ldquo;{lore.season_recap.act_2.slice(0, 120)}...&rdquo;
            </p>
            <div className="flex gap-2 pt-2">
              <button className="px-5 py-2 rounded-full bg-cooked-accent/10 border border-cooked-accent/20 text-cooked-accent text-[9px] font-vibe font-black uppercase tracking-widest hover:bg-cooked-accent/20 transition-all">
                Group Therapy Hours
              </button>
              <button className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-white/40 text-[9px] font-vibe font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                Save as Lore
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVE REVEAL — MVP / Villain / Inside Joke cards
// ─────────────────────────────────────────────────────────────────────────────
export function ArchiveReveal({ category, name, subtitle, desc, cta, challengeCta, color = '#FF4D4D', imageUrl }: {
  category: string; name: string; subtitle?: string; desc?: string;
  cta?: string; challengeCta?: string; color?: string; imageUrl?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="group relative flex gap-6 rounded-[2.5rem] bg-[#0E0E0C] border border-white/[0.06] overflow-hidden hover:border-white/10 transition-all duration-500"
    >
      {/* Image */}
      <div className="w-[160px] md:w-[200px] flex-shrink-0 relative overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover grayscale contrast-125 group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full min-h-[180px] flex items-center justify-center" style={{ background: `${color}08` }}>
            <span className="text-5xl opacity-40">
              {category.includes('MVP') ? '⭐' : category.includes('Villain') ? '🔪' : '🎵'}
            </span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to right, transparent, #0E0E0C)` }} />
      </div>

      {/* Content */}
      <div className="flex-1 py-8 pr-8 space-y-3">
        <span className="text-[9px] uppercase tracking-[0.3em] font-vibe font-black" style={{ color: `${color}80` }}>
          {category}
        </span>
        <h3 className="text-3xl font-cinematic font-black tracking-tight text-[#F5F0E8] leading-tight">
          {name}
        </h3>
        {subtitle && (
          <p className="text-[10px] uppercase tracking-[0.2em] font-vibe font-black text-white/30">{subtitle}</p>
        )}
        {desc && (
          <p className="text-sm text-white/40 font-data font-light leading-relaxed italic max-w-md">
            &ldquo;{desc}&rdquo;
          </p>
        )}
        <div className="flex gap-3 pt-2">
          {cta && (
            <button className="px-5 py-2 rounded-full text-[9px] font-vibe font-black uppercase tracking-widest border transition-all hover:scale-105"
              style={{ borderColor: `${color}30`, color, background: `${color}10` }}>
              {cta}
            </button>
          )}
          {challengeCta && (
            <button className="px-5 py-2 rounded-full text-[9px] font-vibe font-black uppercase tracking-widest border border-white/10 text-white/40 hover:bg-white/5 transition-all">
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
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
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.4 }}
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
// ARCHIVE FOOTER
// ─────────────────────────────────────────────────────────────────────────────
export function ArchiveFooter() {
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
            <button className="px-8 py-3.5 bg-cooked-accent text-white rounded-full text-[10px] font-vibe font-black uppercase tracking-widest hover:scale-105 transition-all w-fit">
              Share Poster
            </button>
            <button className="px-8 py-3.5 bg-white/5 border border-white/10 text-white/40 rounded-full text-[10px] font-vibe font-black uppercase tracking-widest hover:bg-white/10 transition-all w-fit">
              Copy O.G. Link
            </button>
          </div>
        </div>

        <div className="space-y-6 md:text-right">
          <span className="text-[10px] uppercase tracking-[0.5em] text-white/20 font-vibe font-black block">Micro-Lore Links</span>
          <div className="flex flex-col gap-3">
            {['Privacy Policy', 'Terms of Archive', 'Report a Trip'].map(l => (
              <a key={l} href="#" className="text-[11px] text-white/15 hover:text-white/40 transition-colors font-data">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
