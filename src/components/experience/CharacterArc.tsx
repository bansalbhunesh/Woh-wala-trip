'use client';

import { trpc } from '@/lib/trpc/client';
import { motion } from 'framer-motion';

const ARCHETYPE_COLORS: Record<string, string> = {
  'Black Cat': '#7C6AFF',
  'Golden Retriever': '#D49E2D',
  'Main Character': '#FF4D4D',
  'Chaos Source': '#FF4D4D',
  NPC: '#2D9E8B',
  'Emotional Support NPC': '#2D9E8B',
  Unknown: '#888',
};

function archetypeColor(a: string): string {
  return ARCHETYPE_COLORS[a] ?? '#7C6AFF';
}

// ─────────────────────────────────────────────────────────────────────────────
// CHARACTER ARC WIDGET
// The single most important retention surface — shows a user's identity
// evolution across all trips. Creates the emotional permanence that makes
// leaving Yaarlore feel like erasing your own story.
// ─────────────────────────────────────────────────────────────────────────────
export function CharacterArcWidget() {
  const { data: arc, isLoading } = trpc.trips.getMyCharacterArc.useQuery();

  if (isLoading) {
    return (
      <div
        className="animate-pulse rounded-3xl p-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-2.5 w-32 rounded-full mb-4"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />
        <div
          className="h-10 w-10 rounded-full mb-3"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />
        <div className="h-3 w-48 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
    );
  }

  if (!arc?.hasData) {
    return (
      <div
        className="rounded-3xl p-5"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <p className="font-mono text-[8px] uppercase tracking-[0.5em] text-white/20 mb-2">
          ◌ Your arc is unwritten
        </p>
        <p className="text-xs text-white/30 leading-relaxed">
          Generate your first trip lore to begin the mythology.
        </p>
      </div>
    );
  }

  const color = archetypeColor(arc.dominantArchetype ?? '');
  const trajectoryIcon =
    arc.trajectory === 'rising' ? '↑' : arc.trajectory === 'falling' ? '↓' : '→';
  const trajectoryLabel =
    arc.trajectory === 'rising'
      ? 'Chaos Rising'
      : arc.trajectory === 'falling'
        ? 'Settling'
        : 'Consistent';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl overflow-hidden"
      style={{ background: `${color}0A`, border: `1px solid ${color}25` }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3" style={{ borderBottom: `1px solid ${color}15` }}>
        <p
          className="font-mono text-[7px] uppercase tracking-[0.55em] mb-3"
          style={{ color: `${color}60` }}
        >
          ◉ YOUR MYTHOLOGY ARC
        </p>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-black text-xl tracking-tight leading-none" style={{ color }}>
              {arc.dominantArchetype}
            </h3>
            <p className="font-mono text-[8px] text-white/30 mt-1 uppercase tracking-wider">
              {trajectoryIcon} {trajectoryLabel} · {arc.tripCount}{' '}
              {arc.tripCount === 1 ? 'trip' : 'trips'} documented
            </p>
          </div>

          {/* Arc definition progress */}
          <div className="flex flex-col items-end gap-1">
            <span className="font-black text-2xl" style={{ color }}>
              {arc.arcPct ?? 0}%
            </span>
            <span className="font-mono text-[7px] text-white/25 uppercase tracking-wider">
              arc defined
            </span>
          </div>
        </div>
      </div>

      {/* Chaos trajectory sparkline */}
      {arc.snapshots.length > 1 && (
        <div className="px-5 py-4">
          <p className="font-mono text-[7px] uppercase tracking-[0.4em] text-white/25 mb-3">
            Chaos trajectory across {arc.snapshots.length} trips
          </p>
          <div className="flex items-end gap-1.5 h-8">
            {arc.snapshots.map((s, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm transition-all"
                style={{
                  height: `${(s.chaosRating / 10) * 100}%`,
                  background: i === arc.snapshots.length - 1 ? color : `${color}40`,
                  minHeight: 3,
                }}
                title={`Trip ${i + 1}: ${s.chaosRating}/10 chaos`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-mono text-[7px] text-white/15">Trip 1 ({arc.firstChaos}/10)</span>
            <span className="font-mono text-[7px] text-white/15">Now ({arc.currentChaos}/10)</span>
          </div>
        </div>
      )}

      {/* Identity definition bar */}
      <div className="px-5 pb-5">
        <div className="h-1 rounded-full overflow-hidden" style={{ background: `${color}15` }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${arc.arcPct}%` }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            className="h-full rounded-full"
            style={{ background: color }}
          />
        </div>
        <p className="font-mono text-[7px] text-white/20 mt-1.5">
          {(arc.arcPct ?? 0) < 40
            ? 'The mythology is still forming. More trips = more clarity.'
            : (arc.arcPct ?? 0) < 70
              ? 'Patterns are emerging. The historian sees a shape.'
              : 'Your mythology is clearly defined. The record is permanent.'}
        </p>
      </div>
    </motion.div>
  );
}
