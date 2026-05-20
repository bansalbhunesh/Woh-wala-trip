'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// MEMORY REVIEW BANNER
// 7-day window after lore generation where members confirm or add context.
// Social pressure: "N of M members have contributed. You haven't."
// ─────────────────────────────────────────────────────────────────────────────
export function MemoryReviewBanner({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const { data: review, refetch } = trpc.trips.getMemoryReviewStatus.useQuery({ tripId });

  if (!review?.isOpen) return null;

  // review.isOpen is true here — cast to the open variant
  const r = review as {
    isOpen: true;
    hoursLeft: number;
    closesAt: string;
    totalMembers: number;
    confirmedCount: number;
    hasContributed: boolean;
    contributions: Array<{
      userId: string;
      type: string;
      content: string | null;
      createdAt: string;
    }>;
  };

  const contributed = r.hasContributed;
  const waitingCount = r.totalMembers - (r.contributions?.length ?? 0);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl px-4 py-3 cursor-pointer"
        onClick={() => setOpen(true)}
        style={{
          background: contributed ? 'rgba(45,158,139,0.06)' : 'rgba(255,77,77,0.08)',
          border: `1px solid ${contributed ? 'rgba(45,158,139,0.2)' : 'rgba(255,77,77,0.25)'}`,
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p
              className="font-mono text-[8px] uppercase tracking-[0.4em] font-black"
              style={{ color: contributed ? 'rgba(45,158,139,0.8)' : 'rgba(255,77,77,0.8)' }}
            >
              {contributed
                ? '✓ You contributed to the mythology'
                : '● The group is waiting for your version'}
            </p>
            <p className="font-mono text-[7px] text-white/30 mt-0.5">
              {!contributed
                ? `${waitingCount > 0 ? `${waitingCount} member${waitingCount > 1 ? 's' : ''} haven't contributed` : 'Be the first to add context'} · ${r.hoursLeft}h left`
                : `Review window closes in ${r.hoursLeft}h · Add more context`}
            </p>
          </div>
          <span className="font-mono text-[9px] text-white/30">→</span>
        </div>
      </motion.div>

      <AnimatePresence>
        {open && (
          <MemoryReviewModal
            tripId={tripId}
            review={r}
            onClose={() => {
              setOpen(false);
              refetch();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

type OpenReview = {
  isOpen: true;
  hoursLeft: number;
  closesAt: string;
  totalMembers: number;
  confirmedCount: number;
  hasContributed: boolean;
  contributions: Array<{ userId: string; type: string; content: string | null; createdAt: string }>;
};

function MemoryReviewModal({
  tripId,
  review,
  onClose,
}: {
  tripId: string;
  review: OpenReview;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'choose' | 'add'>('choose');
  const [content, setContent] = useState('');
  const utils = trpc.useUtils();

  const contribute = trpc.trips.addMemoryContribution.useMutation({
    onSuccess: () => {
      utils.trips.getMemoryReviewStatus.invalidate({ tripId });
      onClose();
    },
  });

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
        style={{ background: '#0e0e0c', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div
          className="px-6 pt-6 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p className="font-mono text-[8px] uppercase tracking-[0.5em] text-white/40 mb-1">
            ◉ MEMORY REVIEW
          </p>
          <h2 className="font-black text-lg text-white/90 tracking-tight">Shape the canon</h2>
          <p className="text-xs text-white/40 mt-1">
            {review.hoursLeft}h left · {review.contributions?.length ?? 0} of {review.totalMembers}{' '}
            contributed
          </p>
        </div>

        {mode === 'choose' ? (
          <div className="p-6 space-y-3">
            <button
              onClick={() =>
                contribute.mutate({
                  tripId,
                  contributionType: 'confirm',
                  content: 'The lore is accurate.',
                })
              }
              disabled={review.hasContributed || contribute.isPending}
              className="w-full py-4 rounded-2xl text-left px-5 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-40"
              style={{
                background: 'rgba(45,158,139,0.08)',
                border: '1px solid rgba(45,158,139,0.2)',
              }}
            >
              <p className="font-mono font-black text-[9px] uppercase tracking-wider text-[#2D9E8B]">
                ✓ Confirm — the AI got it right
              </p>
              <p className="font-mono text-[7px] text-white/30 mt-1">
                Your confirmation increases the mythology&apos;s canon confidence
              </p>
            </button>

            <button
              onClick={() => setMode('add')}
              className="w-full py-4 rounded-2xl text-left px-5 transition-all hover:scale-[1.01] active:scale-95"
              style={{
                background: 'rgba(124,106,255,0.08)',
                border: '1px solid rgba(124,106,255,0.2)',
              }}
            >
              <p
                className="font-mono font-black text-[9px] uppercase tracking-wider"
                style={{ color: '#7C6AFF' }}
              >
                + Add witness account
              </p>
              <p className="font-mono text-[7px] text-white/30 mt-1">
                Something the AI missed — a moment, a correction, the real story
              </p>
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <p className="font-mono text-[8px] uppercase tracking-[0.4em] text-white/30">
              What did the AI miss?
            </p>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="The AI said X but what actually happened was..."
              rows={4}
              maxLength={500}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white/80 placeholder-white/20 resize-none  focus:border-white/20 transition-colors"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setMode('choose')}
                className="flex-1 py-3 rounded-2xl font-mono text-[9px] uppercase tracking-wider text-white/30"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Back
              </button>
              <button
                onClick={() =>
                  contribute.mutate({
                    tripId,
                    contributionType: 'addition',
                    content,
                  })
                }
                disabled={content.trim().length < 5 || contribute.isPending}
                className="flex-1 py-3 rounded-2xl font-mono font-black text-[9px] uppercase tracking-wider disabled:opacity-30"
                style={{
                  background: 'rgba(124,106,255,0.12)',
                  border: '1px solid rgba(124,106,255,0.4)',
                  color: '#7C6AFF',
                }}
              >
                {contribute.isPending ? 'Adding...' : 'Add to Mythology →'}
              </button>
            </div>
          </div>
        )}

        {/* Recent contributions */}
        {(review.contributions?.length ?? 0) > 0 && (
          <div className="px-6 pb-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="font-mono text-[7px] uppercase tracking-[0.4em] text-white/20 py-3">
              Witness accounts so far
            </p>
            <div className="space-y-2">
              {review.contributions
                ?.slice(0, 3)
                .map((c: OpenReview['contributions'][0], i: number) => (
                  <div key={i} className="text-xs text-white/40 leading-relaxed">
                    {c.type === 'confirm' ? (
                      <span className="text-[#2D9E8B]/60">✓ Confirmed accurate</span>
                    ) : (
                      <span>&ldquo;{c.content?.slice(0, 80)}&rdquo;</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
