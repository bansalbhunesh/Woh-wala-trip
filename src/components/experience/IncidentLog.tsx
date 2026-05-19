'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trpc } from '@/lib/trpc/client';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface Incident {
  id: string;
  incidentRef: string;
  title: string;
  timeframe: string | null;
  confidence: string;
  verifiedFacts: string[];
  inferredElements: string[];
  unknownElements: string[];
  participantNames: string[];
  isContested: boolean;
  callbackPotential: string;
  mythologyStatus: string;
  investigatorNote: string | null;
}

interface EvidenceGap {
  id: string;
  gapRef: string;
  timeframe: string;
  whatWeKnow: string | null;
  whatWeDont: string;
  significance: string;
}

const CONFIDENCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  VERIFIED: { label: 'VERIFIED', color: '#2D9E8B', bg: 'rgba(45,158,139,0.08)' },
  INFERRED: { label: 'INFERRED', color: '#7C6AFF', bg: 'rgba(124,106,255,0.08)' },
  CONTESTED: { label: 'CONTESTED', color: '#D49E2D', bg: 'rgba(212,158,45,0.08)' },
  EVIDENCE_GAP: { label: 'EVIDENCE GAP', color: '#FF4D4D', bg: 'rgba(255,77,77,0.06)' },
  UNVERIFIED: { label: 'UNVERIFIED', color: '#FF4D4D', bg: 'rgba(255,77,77,0.06)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// INCIDENT CARD — each discrete memory record
// Explorable, not just readable. The record shows what it knows and what it doesn't.
// ─────────────────────────────────────────────────────────────────────────────
function IncidentCard({ incident, tripId }: { incident: Incident; tripId: string }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = CONFIDENCE_CONFIG[incident.confidence] ?? CONFIDENCE_CONFIG.INFERRED;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: cfg.bg, border: `1px solid ${cfg.color}20` }}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
      >
        <div className="flex-shrink-0 mt-0.5">
          <span
            className="font-mono text-[7px] uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: `${cfg.color}15`, color: cfg.color }}
          >
            {cfg.label}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white/90 leading-snug tracking-tight">
            {incident.title}
          </p>
          {incident.timeframe && (
            <p className="font-mono text-[7px] text-white/30 mt-0.5 uppercase tracking-wider">
              {incident.timeframe}
              {incident.participantNames?.length > 0 &&
                ` · ${incident.participantNames.join(', ')}`}
            </p>
          )}
          {incident.investigatorNote && !expanded && (
            <p className="text-xs text-white/45 mt-1 leading-relaxed line-clamp-1">
              {incident.investigatorNote}
            </p>
          )}
        </div>

        <span className="font-mono text-[8px] text-white/20 flex-shrink-0 mt-1">
          {expanded ? '↑' : '↓'}
        </span>
      </button>

      {/* Expanded evidence record */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${cfg.color}15` }}>
              {/* Investigator note */}
              {incident.investigatorNote && (
                <div className="pt-3">
                  <p className="font-mono text-[7px] uppercase tracking-[0.4em] text-white/25 mb-1.5">
                    Investigator&apos;s note
                  </p>
                  <p className="text-sm text-white/60 leading-relaxed italic">
                    {incident.investigatorNote}
                  </p>
                </div>
              )}

              {/* What we know */}
              {incident.verifiedFacts?.length > 0 && (
                <div>
                  <p className="font-mono text-[7px] uppercase tracking-[0.4em] text-[#2D9E8B]/70 mb-1.5">
                    Verified
                  </p>
                  <ul className="space-y-1">
                    {incident.verifiedFacts.map((f, i) => (
                      <li key={i} className="text-xs text-white/60 flex gap-2">
                        <span className="text-[#2D9E8B]/50 flex-shrink-0">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What was inferred */}
              {incident.inferredElements?.length > 0 && (
                <div>
                  <p className="font-mono text-[7px] uppercase tracking-[0.4em] text-[#7C6AFF]/70 mb-1.5">
                    Inferred
                  </p>
                  <ul className="space-y-1">
                    {incident.inferredElements.map((e, i) => (
                      <li key={i} className="text-xs text-white/50 flex gap-2">
                        <span className="text-[#7C6AFF]/50 flex-shrink-0">~</span>
                        {e.replace('[INFERRED] ', '')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What cannot be determined */}
              {incident.unknownElements?.length > 0 && (
                <div>
                  <p className="font-mono text-[7px] uppercase tracking-[0.4em] text-white/25 mb-1.5">
                    Unknown — the record is silent here
                  </p>
                  <ul className="space-y-1">
                    {incident.unknownElements.map((u, i) => (
                      <li key={i} className="text-xs text-white/35 flex gap-2">
                        <span className="text-white/20 flex-shrink-0">?</span>
                        {u}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contested flag */}
              {incident.isContested && (
                <div
                  className="px-3 py-2 rounded-xl"
                  style={{
                    background: 'rgba(212,158,45,0.08)',
                    border: '1px solid rgba(212,158,45,0.2)',
                  }}
                >
                  <p className="font-mono text-[7px] uppercase tracking-wider text-[#D49E2D]/70">
                    Accounts conflict — the mythology accepts this as unresolved
                  </p>
                </div>
              )}

              {/* Callback potential */}
              {incident.callbackPotential === 'HIGH' && (
                <p className="font-mono text-[7px] text-white/20 uppercase tracking-wider">
                  ◉ High callback potential — likely to be referenced in future mythology
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE GAP CARD — the absences are as important as the incidents
// ─────────────────────────────────────────────────────────────────────────────
function EvidenceGapCard({ gap }: { gap: EvidenceGap }) {
  const [expanded, setExpanded] = useState(false);
  const isHigh = gap.significance === 'HIGH';

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      className="w-full rounded-2xl px-4 py-3 text-left"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${isHigh ? 'rgba(255,77,77,0.15)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="font-mono text-[7px] uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
          style={{ background: 'rgba(255,77,77,0.08)', color: 'rgba(255,77,77,0.6)' }}
        >
          GAP
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[7px] uppercase tracking-wider text-white/30">
            {gap.timeframe}
          </p>
          <p className="text-sm text-white/50 leading-relaxed mt-0.5">
            {expanded
              ? gap.whatWeDont
              : `${gap.whatWeDont.slice(0, 80)}${gap.whatWeDont.length > 80 ? '...' : ''}`}
          </p>
          {expanded && gap.whatWeKnow && (
            <p className="text-xs text-white/30 mt-2 leading-relaxed">
              What the record does show: {gap.whatWeKnow}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INCIDENT LOG — the main explorable history view
// Replaces the giant consumable lore narrative with a structured record.
// ─────────────────────────────────────────────────────────────────────────────
export function IncidentLog({ tripId }: { tripId: string }) {
  const { data: incidentData, isLoading } = trpc.trips.getIncidentLog.useQuery({ tripId });
  const [filter, setFilter] = useState<'all' | 'verified' | 'contested' | 'gaps'>('all');

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          />
        ))}
      </div>
    );
  }

  if (!incidentData?.incidents?.length && !incidentData?.gaps?.length) {
    return null;
  }

  const incidents = incidentData?.incidents ?? [];
  const gaps = incidentData?.gaps ?? [];

  const filtered =
    filter === 'all'
      ? incidents
      : filter === 'verified'
        ? incidents.filter(i => i.confidence === 'VERIFIED')
        : filter === 'contested'
          ? incidents.filter(i => i.isContested || i.confidence === 'CONTESTED')
          : [];

  const showGaps = filter === 'all' || filter === 'gaps';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.5em] text-[#FF4D4D]/60">
            ◉ INCIDENT LOG
          </p>
          <p className="font-mono text-[7px] text-white/25 mt-0.5">
            {incidents.length} incident{incidents.length !== 1 ? 's' : ''} reconstructed ·{' '}
            {gaps.length} evidence gap{gaps.length !== 1 ? 's' : ''}
          </p>
        </div>
        <p className="font-mono text-[7px] text-white/15 uppercase tracking-wider">
          Explorable record
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All' },
          { key: 'verified', label: 'Verified' },
          { key: 'contested', label: 'Contested' },
          { key: 'gaps', label: 'Gaps' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className="px-3 py-1 rounded-full font-mono text-[7px] uppercase tracking-wider transition-colors"
            style={{
              background: filter === f.key ? 'rgba(255,77,77,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filter === f.key ? 'rgba(255,77,77,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: filter === f.key ? 'rgba(255,77,77,0.9)' : 'rgba(255,255,255,0.3)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Incident list */}
      <div className="space-y-2">
        {filtered.map(incident => (
          <IncidentCard key={incident.id} incident={incident} tripId={tripId} />
        ))}

        {showGaps && gaps.map(gap => <EvidenceGapCard key={gap.id} gap={gap} />)}
      </div>

      {/* Epistemological note */}
      <p className="font-mono text-[7px] text-white/15 text-center pt-2">
        The absence of evidence is not evidence of absence. What the record cannot tell you is part
        of the mythology.
      </p>
    </div>
  );
}
