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
    <div className="px-6 pt-8 pb-2 flex items-center gap-4">
      <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-black transition-colors" aria-label="Back to trip">
        ←
      </button>
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-vibe">Lore Archive</p>
        <p className="text-sm font-data font-medium text-gray-700">{tripName}</p>
      </div>
    </div>
  );
}

function SubHeader({ cardCount }: { cardCount: number }) {
  return (
    <div className="px-6 pt-8 pb-2">
      <h1 className="text-4xl font-cinematic font-medium leading-tight text-cooked-bg">Pick your lore</h1>
      <p className="text-sm text-gray-400 font-data font-light mt-2">
        {cardCount} receipt cards · swipe to choose your identity
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
        shrink-0 w-32 h-52 rounded-[2rem] snap-start
        flex flex-col items-center justify-center p-4 gap-2
        transition-all duration-500
        ${selected ? 'ring-4 ring-black/5 scale-105 shadow-2xl shadow-black/10 z-10' : 'ring-1 ring-gray-100 opacity-60 hover:opacity-100 scale-95'}
      `}
      style={{ background: palette.bg }}
    >
      <span
        className="text-[8px] uppercase tracking-[0.2em] font-vibe font-bold"
        style={{ color: palette.eyebrow }}
      >
        {thumbEyebrow(card)}
      </span>
      <span
        className="text-xs font-cinematic font-medium leading-tight text-center px-1 line-clamp-3"
        style={{ color: palette.ink }}
      >
        {card.label}
      </span>
      {card.sublabel && (
        <span
          className="text-[9px] font-data font-light text-center px-1 line-clamp-1 opacity-70"
          style={{ color: palette.muted }}
        >
          {card.sublabel}
        </span>
      )}
      {card.isYours && (
        <div className="mt-2 px-2 py-0.5 rounded-full bg-white/50 backdrop-blur-sm border border-white/20 shadow-sm">
           <span
             className="text-[8px] font-vibe font-bold uppercase tracking-wider"
             style={{ color: palette.eyebrow }}
           >
             You
           </span>
        </div>
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
      return { bg: '#FAF1E4', ink: '#1a1a1a', eyebrow: '#BA7517', muted: '#888780' }; // Cooked Gold
    case 'character':
      return { bg: '#FBEAF0', ink: '#4B1528', eyebrow: '#D4537E', muted: '#993556' }; // Unstable Pink
    case 'superlative':
      return { bg: '#F1EFE8', ink: '#1a1a1a', eyebrow: '#5F5E5A', muted: '#888780' }; // Chill Gray
    case 'receipt':
      return { bg: '#FAF7EF', ink: '#1a1a1a', eyebrow: '#D85A30', muted: '#888780' }; // Delusional Orange
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
