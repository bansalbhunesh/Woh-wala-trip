'use client';
import { useState, useEffect } from 'react';

const EMOJIS = ['🔥', '😂', '💔', '👑', '😭'] as const;

interface Props {
  tripId: string;
  slideType: string;
  slideIdx?: number;
  /** If true, reactions are tracked without auth (public story) */
  isPublic?: boolean;
}

export default function ReactionBar({ tripId, slideType, slideIdx, isPublic }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Load counts from API
  useEffect(() => {
    fetch(`/api/reactions?tripId=${tripId}&slideType=${slideType}&slideIdx=${slideIdx ?? -1}`)
      .then(r => r.json())
      .then(d => { if (d.counts) setCounts(d.counts); })
      .catch(() => {});
  }, [tripId, slideType, slideIdx]);

  const react = async (emoji: string) => {
    if (sending) return;
    if (myReaction === emoji) return; // already reacted with this
    setSending(true);
    setMyReaction(emoji);
    setCounts(prev => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + 1,
      ...(myReaction ? { [myReaction]: Math.max(0, (prev[myReaction] || 1) - 1) } : {}),
    }));
    try {
      await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, slideType, slideIdx: slideIdx ?? null, emoji }),
      });
    } catch { /* silent */ }
    setSending(false);
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0 && !isPublic) return null; // hide if no reactions in private view

  return (
    <div className="flex items-center gap-2 justify-center" onClick={e => e.stopPropagation()}>
      {EMOJIS.map(emoji => {
        const count = counts[emoji] || 0;
        const isActive = myReaction === emoji;
        return (
          <button
            key={emoji}
            onClick={() => react(emoji)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-all duration-200 active:scale-90"
            style={{
              background: isActive ? 'rgba(255,77,77,0.15)' : 'rgba(245,240,232,0.05)',
              border: `1px solid ${isActive ? 'rgba(255,77,77,0.35)' : 'rgba(245,240,232,0.08)'}`,
              transform: isActive ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            <span style={{ fontSize: 16 }}>{emoji}</span>
            {count > 0 && (
              <span className="font-mono text-[9px]"
                    style={{ color: isActive ? 'rgba(255,77,77,0.8)' : 'rgba(245,240,232,0.3)' }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
