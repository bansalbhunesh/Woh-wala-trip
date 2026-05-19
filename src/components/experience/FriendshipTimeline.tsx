'use client';

import { trpc } from '@/lib/trpc/client';
import { motion } from 'framer-motion';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// FRIENDSHIP TIMELINE
// The longitudinal view of a user's friendship mythology across all trips.
// This is the "emotionally impossible to leave after 5 years" surface —
// it shows who you've been, how you've changed, and what became legendary.
// ─────────────────────────────────────────────────────────────────────────────

function chaosColor(score: number): string {
  if (score >= 76) return '#FF4D4D';
  if (score >= 51) return '#D45D2D';
  if (score >= 26) return '#D49E2D';
  return '#2D9E8B';
}

function archetypeColor(archetype: string | null): string {
  if (!archetype) return '#888';
  const a = archetype.toLowerCase();
  if (a.includes('chaos') || a.includes('agent') || a.includes('initiator')) return '#FF4D4D';
  if (a.includes('anchor') || a.includes('glue') || a.includes('stable')) return '#2D9E8B';
  if (a.includes('plan')) return '#7C6AFF';
  return '#D49E2D';
}

export function FriendshipTimeline() {
  const { data, isLoading } = trpc.trips.getFriendshipTimeline.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          />
        ))}
      </div>
    );
  }

  if (!data?.entries?.length) return null;

  const entries = data.entries;

  // Compute chaos trajectory across all trips
  const ratingsWithData = entries.filter(e => e.myChaosRating !== null);
  const firstRating = ratingsWithData[0]?.myChaosRating ?? null;
  const lastRating = ratingsWithData[ratingsWithData.length - 1]?.myChaosRating ?? null;
  const trajectory =
    firstRating !== null && lastRating !== null && ratingsWithData.length >= 3
      ? lastRating - firstRating > 1
        ? 'rising'
        : lastRating - firstRating < -1
          ? 'falling'
          : 'stable'
      : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.5em] text-[#FF4D4D]/60">
            ◉ MYTHOLOGY TIMELINE
          </p>
          <p className="font-mono text-[7px] text-white/20 mt-0.5">
            {entries.length} trip{entries.length !== 1 ? 's' : ''} documented
            {trajectory && ` · chaos ${trajectory}`}
          </p>
        </div>
        {trajectory && (
          <span
            className="font-mono text-[8px] uppercase tracking-wider"
            style={{
              color:
                trajectory === 'rising'
                  ? '#FF4D4D'
                  : trajectory === 'falling'
                    ? '#2D9E8B'
                    : '#D49E2D',
            }}
          >
            {trajectory === 'rising' ? '↑' : trajectory === 'falling' ? '↓' : '→'} {trajectory}
          </span>
        )}
      </div>

      {/* Timeline entries */}
      <div className="relative">
        {/* Vertical spine */}
        <div
          className="absolute left-3 top-3 bottom-3 w-px"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />

        <div className="space-y-2 pl-9">
          {entries.map((entry, idx) => {
            const color = chaosColor(entry.chaosScore);
            const arcColor = archetypeColor(entry.myArchetype);
            const year = entry.tripDate ? new Date(entry.tripDate).getFullYear() : null;
            const prevYear =
              idx > 0 && entries[idx - 1].tripDate
                ? new Date(entries[idx - 1].tripDate!).getFullYear()
                : null;
            const showYear = year && year !== prevYear;

            return (
              <div key={entry.tripId}>
                {/* Year separator */}
                {showYear && (
                  <div className="flex items-center gap-3 mb-2 -ml-9">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <span className="font-mono text-[6px] text-white/30">{year}</span>
                    </div>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  </div>
                )}

                {/* Timeline node */}
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative"
                >
                  {/* Dot on spine */}
                  <div
                    className="absolute -left-9 top-3.5 w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: color, boxShadow: `0 0 6px ${color}60` }}
                  />

                  <Link
                    href={`/trips/${entry.tripId}`}
                    className="block rounded-2xl px-4 py-3 transition-colors hover:bg-white/[0.03]"
                    style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Trip name + destination */}
                        <p className="text-sm font-black text-white/85 tracking-tight leading-snug truncate">
                          {entry.tripName}
                        </p>
                        <p className="font-mono text-[7px] text-white/30 mt-0.5 uppercase tracking-wider">
                          {entry.destination}
                          {entry.tripDate &&
                            ` · ${new Date(entry.tripDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}
                          {' · '}
                          {entry.memberCount} people
                        </p>

                        {/* Tagline — the most quotable line */}
                        {entry.tagline && (
                          <p className="text-xs text-white/40 mt-1 leading-snug italic line-clamp-1">
                            &ldquo;{entry.tagline}&rdquo;
                          </p>
                        )}

                        {/* Legendary incidents */}
                        {entry.legendaryIncidents.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entry.legendaryIncidents.slice(0, 2).map(inc => (
                              <span
                                key={inc.ref}
                                className="font-mono text-[6px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                style={{
                                  background: 'rgba(255,77,77,0.08)',
                                  color: 'rgba(255,77,77,0.6)',
                                  border: '1px solid rgba(255,77,77,0.15)',
                                }}
                              >
                                {inc.title.slice(0, 30)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: chaos score + my role */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="font-black text-lg" style={{ color }}>
                          {entry.chaosScore}
                        </span>
                        {entry.verdict && (
                          <span className="font-mono text-[6px] text-white/25 uppercase tracking-wider text-right max-w-[80px] leading-tight">
                            {entry.verdict}
                          </span>
                        )}
                        {entry.myArchetype && (
                          <span
                            className="font-mono text-[6px] px-1.5 py-0.5 rounded-full"
                            style={{
                              background: `${arcColor}10`,
                              color: `${arcColor}80`,
                              border: `1px solid ${arcColor}20`,
                            }}
                          >
                            {entry.myArchetype.slice(0, 20)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mythology summary */}
      {entries.length >= 3 && (
        <div
          className="px-4 py-3 rounded-2xl mt-2"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <p className="font-mono text-[7px] uppercase tracking-[0.45em] text-white/20 mb-1">
            The arc across {entries.length} trips
          </p>
          <p className="text-xs text-white/40 leading-relaxed">
            {entries.length} documented trips.{' '}
            {firstRating !== null && lastRating !== null && (
              <>
                Your chaos rating has moved from {firstRating}/10 to {lastRating}/10.{' '}
              </>
            )}
            {entries.filter(e => e.legendaryIncidents.length > 0).length} trips contain legendary
            incidents. The mythology is{' '}
            {entries.length < 3
              ? 'still forming'
              : entries.length < 6
                ? 'taking shape'
                : 'well-defined'}
            .
          </p>
        </div>
      )}
    </div>
  );
}
