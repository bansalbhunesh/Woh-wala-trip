'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';

export function ExportArchiveButton({ tripId }: { tripId: string }) {
  const handleExport = () => {
    window.open(`/api/trips/${tripId}/export`, '_blank');
  };

  return (
    <button
      onClick={handleExport}
      className="w-full py-2.5 mt-1 rounded-xl text-[8px] font-mono uppercase tracking-[0.3em] transition-all active:scale-95 flex items-center justify-center gap-2"
      style={{
        background: 'rgba(245,240,232,0.04)',
        border: '1px solid rgba(245,240,232,0.08)',
        color: 'rgba(245,240,232,0.35)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,240,232,0.55)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,240,232,0.35)';
      }}
    >
      Export Archive (.zip)
    </button>
  );
}

export function ReferralShareWidget() {
  const [copied, setCopied] = useState(false);
  const { data } = trpc.trips.getReferralStatus.useQuery();

  if (!data?.username) return null;

  const referralUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}?ref=${data.username}`
      : `https://yaarlore.app?ref=${data.username}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API not available
    }
  };

  const invitesLeft = Math.max(0, 3 - (data.referralCount ?? 0));

  return (
    <div
      className="px-4 py-3 rounded-[1.25rem] space-y-2"
      style={{
        background: 'rgba(212,158,45,0.06)',
        border: '1px solid rgba(212,158,45,0.14)',
        marginTop: 4,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div
            className="text-[8px] font-mono uppercase tracking-[0.35em] mb-0.5"
            style={{ color: 'rgba(212,158,45,0.55)' }}
          >
            Referral Program
          </div>
          <div className="text-[11px] font-cinematic font-black text-lore-ink tracking-tight">
            {data.bonusUnlocked
              ? 'Free generation ready!'
              : `Invite ${invitesLeft} more friend${invitesLeft !== 1 ? 's' : ''}`}
          </div>
          <div className="text-[7px] font-mono text-black/30 mt-0.5">
            {data.bonusUnlocked
              ? 'Your next lore generation is on us'
              : `${data.referralCount ?? 0}/3 friends joined — invite 3, unlock free trip`}
          </div>
        </div>
        {data.bonusUnlocked && (
          <div
            className="text-[7px] font-mono uppercase tracking-[0.3em] px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: 'rgba(45,158,139,0.12)',
              color: 'rgba(45,158,139,0.8)',
              border: '1px solid rgba(45,158,139,0.2)',
            }}
          >
            Bonus!
          </div>
        )}
      </div>
      <button
        onClick={handleCopy}
        className="w-full py-2 rounded-xl text-[8px] font-mono uppercase tracking-[0.3em] transition-all active:scale-95"
        style={{
          background: copied ? 'rgba(45,158,139,0.12)' : 'rgba(212,158,45,0.1)',
          border: copied ? '1px solid rgba(45,158,139,0.25)' : '1px solid rgba(212,158,45,0.2)',
          color: copied ? 'rgba(45,158,139,0.8)' : 'rgba(212,158,45,0.8)',
        }}
      >
        {copied ? 'Copied!' : 'Copy invite link → they get lore, you get lore'}
      </button>
    </div>
  );
}

export function StoryVisibilityToggle({
  tripId,
  initialVisible,
  onToggled,
}: {
  tripId: string;
  initialVisible: boolean;
  onToggled?: () => void;
}) {
  const [visible, setVisible] = useState(initialVisible);
  const update = trpc.trips.setStoryVisible.useMutation({
    onSuccess: data => {
      setVisible(data.visible);
      onToggled?.();
    },
  });

  const handleToggle = () => {
    const next = !visible;
    update.mutate({ tripId, visible: next });
  };

  return (
    <div
      className="px-4 py-3 rounded-[1.25rem] border border-black/10 bg-black/[0.04]"
      style={{ marginTop: 4 }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[8px] font-mono text-black/35 uppercase tracking-[0.35em] mb-0.5">
            Creator Control
          </div>
          <div className="text-[11px] font-cinematic font-black text-lore-ink tracking-tight">
            Public Story
          </div>
          <div className="text-[7px] font-mono text-black/30 mt-0.5">
            {visible ? 'Visible to anyone with the link' : 'Hidden from public view'}
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={update.isPending}
          aria-label={visible ? 'Hide public story' : 'Show public story'}
          className="relative flex-shrink-0 w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none"
          style={{
            background: visible ? 'rgba(45,158,139,0.7)' : 'rgba(0,0,0,0.15)',
            opacity: update.isPending ? 0.6 : 1,
          }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
            style={{ transform: visible ? 'translateX(20px)' : 'translateX(0)' }}
          />
        </button>
      </div>
      {update.isError && (
        <p className="mt-1 text-[7px] font-mono text-red-500/60 uppercase tracking-wider">
          {update.error?.message?.slice(0, 60)}
        </p>
      )}
    </div>
  );
}
