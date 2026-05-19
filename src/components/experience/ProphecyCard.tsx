'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { trpc } from '@/lib/trpc/client';

// ─────────────────────────────────────────────────────────────────────────────
// PRE-TRIP PROPHECY CARD
// Generated for returning crews before their next trip.
// Creates anticipation, group chat content, and a narrative to resolve.
// ─────────────────────────────────────────────────────────────────────────────
export function ProphecyCard({ tripId }: { tripId: string }) {
  const { data } = trpc.trips.getPretripProphecy.useQuery({ tripId });
  const prophecy = data?.prophecy as any;

  if (!prophecy) return null;

  const groupChaos = (prophecy.group_chaos_probability as number) ?? 70;
  const color = groupChaos >= 80 ? '#FF4D4D' : groupChaos >= 60 ? '#D49E2D' : '#7C6AFF';
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `${prophecy.whatsapp_text ?? prophecy.headline}\n\nYaarlore predicted this: ${shareUrl}`
  )}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl overflow-hidden mb-6"
      style={{ background: `${color}08`, border: `1px solid ${color}20` }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3" style={{ borderBottom: `1px solid ${color}10` }}>
        <p
          className="font-mono text-[7px] uppercase tracking-[0.55em] mb-2"
          style={{ color: `${color}70` }}
        >
          ◉ PRE-TRIP PROPHECY — THE AI HISTORIAN PREDICTS
        </p>
        <h3 className="font-black text-lg tracking-tight leading-snug" style={{ color }}>
          {prophecy.headline}
        </h3>
      </div>

      {/* Predictions */}
      {prophecy.predictions?.length > 0 && (
        <div className="px-5 py-4 space-y-3">
          {(prophecy.predictions as any[]).slice(0, 4).map((p: any, i: number) => (
            <div key={i} className="flex items-start gap-3">
              <span
                className="font-mono text-[7px] uppercase tracking-wider mt-0.5 flex-shrink-0 px-2 py-0.5 rounded-full"
                style={{
                  background: p.confidence === 'HIGH' ? `${color}15` : 'rgba(255,255,255,0.05)',
                  color: p.confidence === 'HIGH' ? color : 'rgba(255,255,255,0.3)',
                }}
              >
                {p.confidence}
              </span>
              <p className="text-sm text-white/70 leading-relaxed">
                <span className="font-black text-white/90">{p.name}</span> {p.prediction}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Chaos probability bar */}
      <div className="px-5 pb-4">
        <div className="flex justify-between mb-1.5">
          <span className="font-mono text-[7px] uppercase tracking-wider text-white/30">
            Predicted chaos probability
          </span>
          <span className="font-mono text-[7px] font-black" style={{ color }}>
            {groupChaos}%
          </span>
        </div>
        <div
          className="h-1 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${groupChaos}%` }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
            className="h-full rounded-full"
            style={{ background: color }}
          />
        </div>
      </div>

      {/* WhatsApp share */}
      <div className="px-5 pb-5">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 rounded-2xl w-full font-mono font-black text-[9px] uppercase tracking-[0.35em] transition-all hover:scale-[1.02] active:scale-95"
          style={{
            background: 'rgba(37,211,102,0.1)',
            border: '1px solid rgba(37,211,102,0.3)',
            color: 'rgba(37,211,102,0.9)',
          }}
        >
          Share Prophecy in WhatsApp
        </a>
        <p className="font-mono text-[7px] text-white/20 text-center mt-2">
          The mythology begins before the first photo is taken.
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPHECY ACCURACY REVEAL (shown after lore generation for same trip)
// ─────────────────────────────────────────────────────────────────────────────
export function ProphecyAccuracyReveal({ tripId }: { tripId: string }) {
  const { data } = trpc.trips.getPretripProphecy.useQuery({ tripId });
  const prophecy = data?.prophecy as any;
  const [expanded, setExpanded] = useState(false);

  if (!prophecy?.predictions?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(212,158,45,0.06)', border: '1px solid rgba(212,158,45,0.15)' }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <p className="font-mono text-[8px] uppercase tracking-[0.45em] text-[#D49E2D]/70">
          ◉ Was the prophecy right?
        </p>
        <span className="font-mono text-[8px] text-white/30">{expanded ? '↑' : '↓'}</span>
      </button>

      {expanded && (
        <div
          className="px-4 pb-4 space-y-3 pt-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p className="font-mono text-[7px] text-white/30 uppercase tracking-wider">
            The AI historian predicted, before the trip:
          </p>
          {(prophecy.predictions as any[]).slice(0, 4).map((p: any, i: number) => (
            <div key={i} className="text-sm text-white/60 leading-relaxed">
              <span className="font-black text-white/80">{p.name}:</span> &ldquo;{p.prediction}
              &rdquo;
            </div>
          ))}
          <p className="font-mono text-[7px] text-white/20 pt-2">
            Did it happen? The mythology is now canon.
          </p>
        </div>
      )}
    </motion.div>
  );
}
