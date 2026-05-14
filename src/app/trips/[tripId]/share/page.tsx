'use client';

import { use, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

type CardEntry = {
  id: string;
  type: 'trip' | 'character' | 'superlative' | 'receipt';
  url: string;
  label: string;
  sublabel?: string;
  isYours?: boolean;
  memberId?: string;
};

export default function SharePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();

  const { data: cards, isLoading } = trpc.cards.listForTrip.useQuery({ tripId });
  const { data: tripData } = trpc.trips.getFull.useQuery({ tripId });

  const defaultIndex = useMemo(() => {
    if (!cards) return 0;
    const yoursIdx = cards.findIndex((c) => c.isYours);
    return yoursIdx !== -1 ? yoursIdx : 0;
  }, [cards]);

  const [selectedIdx, setSelectedIdx] = useState(defaultIndex);

  if (isLoading || !cards) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading your cards...</p>
      </div>
    );
  }

  const selectedCard = cards[selectedIdx];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trip = (tripData as any)?.trip;

  return (
    <div className="min-h-screen bg-white flex flex-col pb-6">
      <Header tripName={trip?.name} onBack={() => router.push(`/trips/${tripId}`)} />
      <SubHeader cardCount={cards.length} />
      <CardCarousel cards={cards} selectedIdx={selectedIdx} onSelect={setSelectedIdx} />
      <SelectedCardPreview card={selectedCard} />
      <ActionButtons
        selectedCard={selectedCard}
        tripId={tripId}
        tripName={trip?.name}
        loreJson={trip?.lore_json}
      />
      <FreeTierNote isFree={trip?.tier === 'free'} tripId={tripId} />
    </div>
  );
}

function Header({ tripName, onBack }: { tripName?: string; onBack: () => void }) {
  return (
    <div className="px-6 pt-8 pb-2 flex items-center gap-3">
      <button onClick={onBack} className="text-sm text-gray-500" aria-label="Back to trip">
        ←
      </button>
      <div className="flex-1">
        <p className="text-xs uppercase tracking-widest text-gray-400">Lore ready</p>
        <p className="text-sm font-medium">{tripName}</p>
      </div>
    </div>
  );
}

function SubHeader({ cardCount }: { cardCount: number }) {
  return (
    <div className="px-6 pt-6 pb-2">
      <h1 className="text-2xl font-medium leading-tight">Pick your card to share</h1>
      <p className="text-sm text-gray-500 mt-1">
        {cardCount} cards generated from this trip · swipe to browse
      </p>
    </div>
  );
}

function CardCarousel({
  cards,
  selectedIdx,
  onSelect,
}: {
  cards: CardEntry[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mt-4">
      <div
        ref={containerRef}
        className="overflow-x-auto px-6 pb-2 flex gap-3 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {cards.map((card, idx) => (
          <CarouselThumb
            key={card.id}
            card={card}
            selected={idx === selectedIdx}
            onClick={() => onSelect(idx)}
          />
        ))}
        <div className="shrink-0 w-6" />
      </div>
    </div>
  );
}

function CarouselThumb({
  card,
  selected,
  onClick,
}: {
  card: CardEntry;
  selected: boolean;
  onClick: () => void;
}) {
  const palette = thumbPalette(card.type);

  return (
    <button
      onClick={onClick}
      className={`
        shrink-0 w-28 h-44 rounded-xl snap-start
        flex flex-col items-center justify-center p-2 gap-1
        transition-all
        ${selected ? 'ring-2 ring-black scale-105' : 'ring-1 ring-gray-200 opacity-75'}
      `}
      style={{ background: palette.bg }}
    >
      <span
        className="text-[9px] uppercase tracking-wider font-medium"
        style={{ color: palette.eyebrow }}
      >
        {thumbEyebrow(card)}
      </span>
      <span
        className="text-[11px] font-medium leading-tight text-center px-1 line-clamp-3"
        style={{ color: palette.ink }}
      >
        {card.label}
      </span>
      {card.sublabel && (
        <span
          className="text-[10px] text-center px-1 line-clamp-1"
          style={{ color: palette.muted }}
        >
          {card.sublabel}
        </span>
      )}
      {card.isYours && (
        <span
          className="text-[9px] font-medium uppercase tracking-wider mt-1"
          style={{ color: palette.eyebrow }}
        >
          You
        </span>
      )}
    </button>
  );
}

function thumbEyebrow(card: CardEntry): string {
  switch (card.type) {
    case 'trip':
      return 'Trip';
    case 'character':
      return 'Role';
    case 'superlative':
      return 'Most likely to';
    case 'receipt':
      return 'Receipt';
  }
}

function thumbPalette(type: CardEntry['type']) {
  switch (type) {
    case 'trip':
      return { bg: '#FAF1E4', ink: '#1a1a1a', eyebrow: '#BA7517', muted: '#888780' };
    case 'character':
      return { bg: '#FBEAF0', ink: '#4B1528', eyebrow: '#D4537E', muted: '#993556' };
    case 'superlative':
      return { bg: '#F1EFE8', ink: '#1a1a1a', eyebrow: '#5F5E5A', muted: '#888780' };
    case 'receipt':
      return { bg: '#FAF7EF', ink: '#1a1a1a', eyebrow: '#D85A30', muted: '#888780' };
  }
}

function SelectedCardPreview({ card }: { card?: CardEntry }) {
  if (!card) return null;

  return (
    <div className="px-6 mt-6 flex-1 flex flex-col">
      <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-center max-h-[420px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.url}
          alt={card.label}
          className="max-h-[400px] w-auto rounded-lg shadow-sm"
          loading="eager"
        />
      </div>
    </div>
  );
}

function ActionButtons({
  selectedCard,
  tripId,
  tripName,
  loreJson,
}: {
  selectedCard?: CardEntry;
  tripId: string;
  tripName?: string;
  loreJson?: Record<string, unknown>;
}) {
  const [sharing, setSharing] = useState(false);

  if (!selectedCard) return null;

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await fetchCardAsBlob(selectedCard.url);
      const file = new File(
        [blob],
        `${slugify(tripName || 'trip')}-${selectedCard.id}.png`,
        { type: 'image/png' }
      );

      const caption =
        (loreJson?.whatsapp_caption as string) ||
        `${tripName} ka archive bana — ${selectedCard.label}`;

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: tripName,
          text: caption,
        });
      } else {
        const publicUrl = `${window.location.origin}${selectedCard.url}`;
        const text = encodeURIComponent(`${caption}\n\n${publicUrl}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
      }
    } catch (err) {
      console.error('share failed', err);
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = async () => {
    const blob = await fetchCardAsBlob(selectedCard.url);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugify(tripName || 'trip')}-${selectedCard.id}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTagFriends = () => {
    const text = encodeURIComponent(
      `Yaar ${tripName} ka archive ready hai. ${window.location.origin}/trips/${tripId}/share — apna wala card pick karo`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="px-6 mt-6 space-y-3">
      <button
        onClick={handleShare}
        disabled={sharing}
        className="w-full py-4 bg-black text-white rounded-xl font-medium disabled:opacity-50"
      >
        {sharing ? 'Sharing...' : 'Share to WhatsApp'}
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleDownload}
          className="py-3 border border-gray-300 rounded-xl text-sm font-medium"
        >
          Download
        </button>
        <button
          onClick={handleTagFriends}
          className="py-3 border border-gray-300 rounded-xl text-sm font-medium"
        >
          Tag friends
        </button>
      </div>
    </div>
  );
}

function FreeTierNote({ isFree, tripId }: { isFree: boolean; tripId: string }) {
  const router = useRouter();
  if (!isFree) return null;

  return (
    <div className="px-6 mt-4">
      <p className="text-xs text-gray-400 text-center">
        Free tier: cards have a small watermark ·{' '}
        <button
          onClick={() => router.push(`/trips/${tripId}/upgrade`)}
          className="underline text-gray-600"
        >
          Upgrade ₹299
        </button>
      </p>
    </div>
  );
}

async function fetchCardAsBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch card');
  return res.blob();
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
