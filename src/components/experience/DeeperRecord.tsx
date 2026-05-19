'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { analytics } from '@/lib/analytics';
import { DisputePanel } from '@/components/experience/DisputeSystem';
import { MemoryReviewBanner } from '@/components/experience/MemoryReview';
import { ProphecyAccuracyReveal } from '@/components/experience/ProphecyCard';
import { IncidentLog } from '@/components/experience/IncidentLog';
import { GroupAnthem } from '@/components/experience/GroupAnthem';

interface Props {
  tripId: string;
  lore: any;
  isReady: boolean;
}

export function DeeperRecord({ tripId, lore, isReady }: Props) {
  const [open, setOpen] = useState(false);

  if (!isReady) return null;

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) analytics.deeperRecordOpened(tripId);
  };

  return (
    <div className="mb-6">
      {/* Contextual sections that only show when data exists */}
      <MemoryReviewBanner tripId={tripId} />
      <div className="mt-3">
        <DisputePanel tripId={tripId} />
      </div>

      {/* "Deeper record" — collapsed by default, reveals incident log + prophecy */}
      <div className="mt-4">
        <button
          onClick={handleToggle}
          className="flex items-center gap-2 font-mono text-[7px] uppercase tracking-[0.45em] text-white/25 hover:text-white/45 transition-colors"
        >
          <span className="w-3 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
          {open ? 'Close deeper record' : 'Deeper record'}
          <span className="w-3 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
          <span>{open ? '↑' : '↓'}</span>
        </button>

        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-4 overflow-hidden"
          >
            {lore && <ProphecyAccuracyReveal tripId={tripId} />}
            <IncidentLog tripId={tripId} />
            {/* Group Anthem — the audio artifact that belongs here, not above the fold.
                Emotionally loaded discovery. Never plays. Points to where the feeling lives. */}
            {lore?.group_anthem && (
              <GroupAnthem anthem={lore.group_anthem} chaosScore={lore.cooked_level} />
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
