'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trpc } from '@/lib/trpc/client';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface Dispute {
  id: string;
  userId: string;
  disputeType: string;
  aiClaim: string;
  userClaim: string;
  status: string;
  voteDeadline: string;
  aiVotes: number;
  userVotes: number;
  totalEligible: number;
  createdAt: string;
  resolvedAt: string | null;
  hasVoted: boolean;
  isOwn: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPUTE BUTTON — surfaces on character role cards
// ─────────────────────────────────────────────────────────────────────────────
export function DisputeButton({
  tripId,
  disputeType,
  aiClaim,
  memberName,
  isOwnRole,
  existingDispute,
}: {
  tripId: string;
  disputeType: 'character_role' | 'chaos_rating' | 'verdict';
  aiClaim: string;
  memberName: string;
  isOwnRole: boolean;
  existingDispute?: Dispute | null;
}) {
  const [open, setOpen] = useState(false);

  if (!isOwnRole && !existingDispute) return null;

  if (existingDispute) {
    return <DisputeVoteCard dispute={existingDispute} tripId={tripId} memberName={memberName} />;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.4em] text-white/30 hover:text-[#FF4D4D]/80 transition-colors mt-3"
      >
        <span className="w-1 h-1 rounded-full bg-current opacity-60" />
        The AI got this wrong
      </button>
      <AnimatePresence>
        {open && (
          <DisputeModal
            tripId={tripId}
            disputeType={disputeType}
            aiClaim={aiClaim}
            memberName={memberName}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPUTE MODAL — file a counter-claim
// ─────────────────────────────────────────────────────────────────────────────
function DisputeModal({
  tripId,
  disputeType,
  aiClaim,
  memberName,
  onClose,
}: {
  tripId: string;
  disputeType: 'character_role' | 'chaos_rating' | 'verdict';
  aiClaim: string;
  memberName: string;
  onClose: () => void;
}) {
  const [counter, setCounter] = useState('');
  const utils = trpc.useUtils();

  const dispute = trpc.trips.disputeCharacterRole.useMutation({
    onSuccess: () => {
      utils.trips.getDisputes.invalidate({ tripId });
      onClose();
    },
  });

  const label =
    disputeType === 'character_role'
      ? 'your character role'
      : disputeType === 'chaos_rating'
        ? 'your chaos rating'
        : 'the trip verdict';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: '#0e0e0c', border: '1px solid rgba(255,77,77,0.2)' }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p className="font-mono text-[8px] uppercase tracking-[0.5em] text-[#FF4D4D]/60 mb-1">
            ◉ MYTHOLOGY DISPUTE
          </p>
          <h2 className="font-black text-lg text-white/90 tracking-tight leading-snug">
            {memberName} is disputing {label}
          </h2>
        </div>

        {/* AI claim */}
        <div className="px-6 py-4" style={{ background: 'rgba(255,77,77,0.04)' }}>
          <p className="font-mono text-[8px] uppercase tracking-[0.4em] text-white/30 mb-2">
            The AI said:
          </p>
          <p className="text-sm text-white/60 leading-relaxed italic">&ldquo;{aiClaim}&rdquo;</p>
        </div>

        {/* Counter claim input */}
        <div className="px-6 py-4">
          <p className="font-mono text-[8px] uppercase tracking-[0.4em] text-white/30 mb-3">
            Your version:
          </p>
          <textarea
            value={counter}
            onChange={e => setCounter(e.target.value)}
            placeholder="The AI missed something. Here's what actually happened..."
            rows={4}
            maxLength={500}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-white/20 transition-colors"
          />
          <div className="flex justify-between mt-1">
            <p className="font-mono text-[8px] text-white/20">
              This becomes your official counter-claim. The group votes on what&apos;s canon.
            </p>
            <span className="font-mono text-[8px] text-white/20">{counter.length}/500</span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl font-mono text-[9px] uppercase tracking-wider text-white/30 hover:text-white/50 transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Cancel
          </button>
          <button
            onClick={() =>
              dispute.mutate({
                tripId,
                disputeType,
                aiClaim,
                userClaim: counter,
              })
            }
            disabled={counter.trim().length < 10 || dispute.isPending}
            className="flex-1 py-3 rounded-2xl font-mono font-black text-[9px] uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(255,77,77,0.12)',
              border: '1px solid rgba(255,77,77,0.4)',
              color: 'rgba(255,77,77,0.95)',
            }}
          >
            {dispute.isPending ? 'Filing...' : 'File Dispute →'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPUTE VOTE CARD — surfaces when a dispute exists, shows vote state
// This is the social pressure surface: "3 of 5 voted. You haven't."
// ─────────────────────────────────────────────────────────────────────────────
export function DisputeVoteCard({
  dispute,
  tripId,
  memberName,
}: {
  dispute: Dispute;
  tripId: string;
  memberName: string;
}) {
  const utils = trpc.useUtils();
  const vote = trpc.trips.voteOnDispute.useMutation({
    onSuccess: () => utils.trips.getDisputes.invalidate({ tripId }),
  });

  const totalVotes = dispute.aiVotes + dispute.userVotes;
  const isResolved = dispute.status !== 'voting';
  const aiWins = dispute.status === 'ai_wins';
  const userWins = dispute.status === 'user_wins';
  const tied = dispute.status === 'tied';
  const deadline = new Date(dispute.voteDeadline);
  const hoursLeft = Math.max(0, Math.round((deadline.getTime() - Date.now()) / 3600000));

  const aiPct = totalVotes > 0 ? Math.round((dispute.aiVotes / totalVotes) * 100) : 50;
  const userPct = 100 - aiPct;

  return (
    <div
      className="mt-3 rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,77,77,0.04)',
        border: '1px solid rgba(255,77,77,0.15)',
      }}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="font-mono text-[7px] uppercase tracking-[0.5em] text-[#FF4D4D]/60">
          {isResolved ? '◉ MYTHOLOGY DISPUTE — RESOLVED' : '◉ MYTHOLOGY DISPUTE — VOTING OPEN'}
        </p>
      </div>

      {/* Claims */}
      <div className="px-4 py-3 space-y-3">
        <div>
          <p className="font-mono text-[7px] uppercase tracking-[0.4em] text-white/25 mb-1">
            The AI says:
          </p>
          <p className="text-xs text-white/50 leading-relaxed italic">
            &ldquo;{dispute.aiClaim.slice(0, 120)}
            {dispute.aiClaim.length > 120 ? '...' : ''}&rdquo;
          </p>
        </div>
        <div>
          <p className="font-mono text-[7px] uppercase tracking-[0.4em] text-white/25 mb-1">
            {memberName} says:
          </p>
          <p className="text-xs text-white/70 leading-relaxed">
            &ldquo;{dispute.userClaim.slice(0, 120)}
            {dispute.userClaim.length > 120 ? '...' : ''}&rdquo;
          </p>
        </div>
      </div>

      {/* Vote bar */}
      <div className="px-4 pb-3">
        <div className="flex justify-between mb-1">
          <span className="font-mono text-[7px] text-white/30 uppercase tracking-wider">
            AI {dispute.aiVotes}
          </span>
          <span className="font-mono text-[7px] text-white/30">
            {totalVotes} of {dispute.totalEligible} voted
          </span>
          <span className="font-mono text-[7px] text-white/30 uppercase tracking-wider">
            {memberName} {dispute.userVotes}
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${aiPct}%`,
              background: isResolved
                ? aiWins
                  ? '#2D9E8B'
                  : userWins
                    ? '#FF4D4D'
                    : '#7C6AFF'
                : '#FF4D4D',
            }}
          />
        </div>
      </div>

      {/* Vote actions or result */}
      {isResolved ? (
        <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p
            className="font-mono text-[8px] uppercase tracking-[0.4em] text-center"
            style={{ color: aiWins ? '#2D9E8B' : userWins ? '#FF4D4D' : '#7C6AFF' }}
          >
            {aiWins && 'The AI was right. Canon stands.'}
            {userWins && `${memberName} wins. Canon updated.`}
            {tied && 'Tied. The mythology remains contested.'}
          </p>
        </div>
      ) : dispute.isOwn ? (
        <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-mono text-[7px] uppercase tracking-[0.4em] text-center text-white/20">
            Your dispute. Others are voting. {hoursLeft}h left.
          </p>
        </div>
      ) : dispute.hasVoted ? (
        <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-mono text-[7px] uppercase tracking-[0.4em] text-center text-white/20">
            You voted. {hoursLeft}h left to close.
          </p>
        </div>
      ) : (
        <div
          className="px-4 pb-4 pt-3 space-y-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p className="font-mono text-[7px] uppercase tracking-[0.4em] text-center text-white/30 mb-2">
            Your vote determines canon — {hoursLeft}h left
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => vote.mutate({ disputeId: dispute.id, vote: 'ai' })}
              disabled={vote.isPending}
              className="py-2.5 rounded-xl font-mono font-black text-[8px] uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40"
              style={{
                background: 'rgba(45,158,139,0.1)',
                border: '1px solid rgba(45,158,139,0.3)',
                color: 'rgba(45,158,139,0.9)',
              }}
            >
              AI is right
            </button>
            <button
              onClick={() => vote.mutate({ disputeId: dispute.id, vote: 'user' })}
              disabled={vote.isPending}
              className="py-2.5 rounded-xl font-mono font-black text-[8px] uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40"
              style={{
                background: 'rgba(255,77,77,0.1)',
                border: '1px solid rgba(255,77,77,0.3)',
                color: 'rgba(255,77,77,0.9)',
              }}
            >
              {memberName} is right
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPUTE PANEL — shows all active disputes for a trip
// ─────────────────────────────────────────────────────────────────────────────
export function DisputePanel({ tripId }: { tripId: string }) {
  const { data: disputes, isLoading } = trpc.trips.getDisputes.useQuery({ tripId });

  if (isLoading || !disputes?.length) return null;

  const pending = disputes.filter(d => d.status === 'voting' && !d.hasVoted && !d.isOwn);
  const resolved = disputes.filter(d => d.status !== 'voting');

  return (
    <div className="space-y-3">
      {pending.length > 0 && (
        <div
          className="px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.15)' }}
        >
          <p className="font-mono text-[8px] uppercase tracking-[0.4em] text-[#FF4D4D]/70 font-black">
            ● {pending.length} dispute{pending.length > 1 ? 's' : ''} waiting for your vote
          </p>
          <p className="font-mono text-[7px] text-white/30 mt-0.5">
            The group&apos;s mythology depends on your perspective.
          </p>
        </div>
      )}

      {resolved.slice(0, 3).map(d => (
        <div
          key={d.id}
          className="px-4 py-3 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p className="font-mono text-[7px] uppercase tracking-[0.4em] text-white/25 mb-1">
            {d.status === 'ai_wins'
              ? '● AI wins — canon stands'
              : d.status === 'user_wins'
                ? '● member wins — canon updated'
                : '● tied — mythology contested'}
          </p>
          <p className="text-xs text-white/40 italic truncate">
            &ldquo;{d.aiClaim.slice(0, 80)}...&rdquo;
          </p>
        </div>
      ))}
    </div>
  );
}
