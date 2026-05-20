'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { motion } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// EVENT LABEL MAP
// Describes each pulse event in the "bro this is literally you" voice.
// Specific, slightly chaotic, internet-native.
// ─────────────────────────────────────────────────────────────────────────────
function eventLabel(
  eventType: string,
  actorName: string | null,
  tripName: string,
  payload: Record<string, unknown>
): { headline: string; sub: string; accent: string } {
  const actor = actorName ?? 'Someone';
  switch (eventType) {
    case 'dispute_filed':
      return {
        headline: `${actor} is disputing the AI`,
        sub: `${tripName} · The mythology is not yet canon`,
        accent: '#FF4D4D',
      };
    case 'dispute_resolved': {
      const winner = payload.winner as string | null;
      return {
        headline:
          winner === 'ai_wins'
            ? `The AI won. ${actor} remains on record.`
            : winner === 'user_wins'
              ? `${actor} wins. Canon updated.`
              : `Tied. The mythology is contested.`,
        sub: `${tripName} · Dispute closed`,
        accent: winner === 'ai_wins' ? '#2D9E8B' : winner === 'user_wins' ? '#FF4D4D' : '#7C6AFF',
      };
    }
    case 'vote_cast': {
      const aiV = (payload.ai_votes as number) ?? 0;
      const userV = (payload.user_votes as number) ?? 0;
      const total = (payload.total_eligible as number) ?? 0;
      return {
        headline: `${actor} voted (${aiV + userV} of ${total} cast)`,
        sub: `${tripName} · ${total - aiV - userV} still haven't voted`,
        accent: '#D49E2D',
      };
    }
    case 'memory_added':
      return {
        headline: `${actor} added context to the mythology`,
        sub: `${tripName} · New witness account`,
        accent: '#7C6AFF',
      };
    case 'memory_confirmed':
      return {
        headline: `${actor} confirmed the lore is accurate`,
        sub: `${tripName} · The mythology gains confidence`,
        accent: '#2D9E8B',
      };
    case 'incident_flagged': {
      const note = payload.note as string | null;
      return {
        headline: `${actor} flagged an incident`,
        sub: note ? `"${note.slice(0, 60)}"` : `${tripName} · Something happened`,
        accent: '#FF4D4D',
      };
    }
    case 'lore_generated':
      return {
        headline: `The lore is ready`,
        sub: `${tripName} · Your mythology has been written`,
        accent: '#D49E2D',
      };
    case 'battle_started':
      return {
        headline: `${tripName} has been challenged`,
        sub: 'A rival group wants to settle this',
        accent: '#FF4D4D',
      };
    case 'battle_resolved':
      return {
        headline: `Battle verdict: ${tripName}`,
        sub: 'The AI historian has spoken',
        accent: '#7C6AFF',
      };
    case 'anniversary':
      return {
        headline: `One year ago: ${tripName}`,
        sub: (payload.tagline as string) ?? 'The mythology lives on',
        accent: '#D49E2D',
      };
    default:
      return {
        headline: `Something happened in ${tripName}`,
        sub: 'Open to see what',
        accent: '#7C6AFF',
      };
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP PULSE FEED — the living home screen
// Replaces the static "your trips" gallery with a social event feed.
// Every dispute, vote, incident, and resolution surfaces here.
// ─────────────────────────────────────────────────────────────────────────────
export function GroupPulse() {
  const { data, isLoading } = trpc.trips.getGroupPulse.useQuery({ limit: 20 });

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="text-center py-8">
        <p className="font-mono text-[8px] uppercase tracking-[0.5em] text-white/20">
          The mythology is quiet
        </p>
        <p className="font-mono text-[7px] text-white/15 mt-1">
          Generate a trip lore to start the record
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((event, idx) => {
        const label = eventLabel(event.eventType, event.actorName, event.tripName, event.payload);

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
          >
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-2xl transition-colors hover:bg-white/[0.03] cursor-pointer"
              style={{ border: '1px solid rgba(255,255,255,0.05)' }}
            >
              {/* Accent dot */}
              <div
                className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: label.accent, boxShadow: `0 0 6px ${label.accent}60` }}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white/85 leading-snug tracking-tight">
                  {label.headline}
                </p>
                <p className="font-mono text-[8px] text-white/30 mt-0.5 truncate">{label.sub}</p>
              </div>

              {/* Time */}
              <p className="font-mono text-[7px] text-white/20 flex-shrink-0 mt-1">
                {timeAgo(event.createdAt)}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INCIDENT BUTTON — pressed during a trip when something mythology-worthy happens
// ─────────────────────────────────────────────────────────────────────────────
export function IncidentButton({ tripId }: { tripId: string }) {
  const flag = trpc.trips.flagIncident.useMutation();
  const [pressed, setPressed] = useState(false);
  const [note, setNote] = useState('');

  if (pressed) {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.3)' }}
      >
        <div className="px-4 pt-4 pb-3">
          <p className="font-mono text-[8px] uppercase tracking-[0.5em] text-[#FF4D4D]/70 mb-3">
            ◉ INCIDENT FLAGGED — WHAT HAPPENED?
          </p>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder='Brief note — "Bus incident happening right now"'
            maxLength={200}
            className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-white/70 placeholder-white/20  font-mono"
          />
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={() => setPressed(false)}
            className="flex-1 py-2.5 rounded-xl font-mono text-[8px] uppercase tracking-wider text-white/30"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              flag.mutate({ tripId, note: note || undefined });
              setPressed(false);
              setNote('');
            }}
            disabled={flag.isPending}
            className="flex-1 py-2.5 rounded-xl font-mono font-black text-[8px] uppercase tracking-wider"
            style={{
              background: 'rgba(255,77,77,0.15)',
              border: '1px solid rgba(255,77,77,0.5)',
              color: '#FF4D4D',
            }}
          >
            Log It
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <button
      onClick={() => setPressed(true)}
      className="w-full py-3 rounded-2xl font-mono font-black text-[9px] uppercase tracking-[0.4em] transition-all hover:scale-[1.01] active:scale-95"
      style={{
        background: 'rgba(255,77,77,0.06)',
        border: '1px solid rgba(255,77,77,0.2)',
        color: 'rgba(255,77,77,0.6)',
      }}
    >
      ◉ THE INCIDENT BUTTON
    </button>
  );
}
