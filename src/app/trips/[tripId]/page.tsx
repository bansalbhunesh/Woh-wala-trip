'use client';
import { use, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

export default function TripRoomPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();

  const { data: tripData, refetch } = trpc.trips.getFull.useQuery({ tripId });
  const { data: photos, refetch: refetchPhotos } = trpc.photos.list.useQuery({ tripId });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trip = (tripData as any)?.trip;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members = (tripData as any)?.members || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eras = (tripData as any)?.eras || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = (tripData as any)?.stats || [];

  if (!trip) {
    return <div className="p-6 text-gray-400">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <header className="px-6 pt-8 pb-6 border-b border-gray-100">
        <button onClick={() => router.push('/trips')} className="text-sm text-gray-500 mb-4">
          ← All trips
        </button>
        <h1 className="text-2xl font-medium">{trip.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {trip.destination} · {trip.member_count} people · {trip.total_photos} photos
        </p>
      </header>

      {trip.lore_status === 'ready' && trip.lore_json ? (
        <LoreView
          lore={trip.lore_json}
          eras={eras}
          stats={stats}
          members={members}
          tripId={tripId}
        />
      ) : (
        <UploadView
          tripId={tripId}
          photos={photos || []}
          status={trip.lore_status}
          onPhotosChanged={() => {
            refetch();
            refetchPhotos();
          }}
        />
      )}
    </div>
  );
}

function UploadView({
  tripId,
  photos,
  status,
  onPhotosChanged,
}: {
  tripId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  photos: any[];
  status: string;
  onPhotosChanged: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);

  const getUploadUrl = trpc.photos.getUploadUrl.useMutation();
  const confirmUpload = trpc.photos.confirmUpload.useMutation();
  const generateLore = trpc.trips.generateLore.useMutation();

  const handleFiles = async (files: FileList) => {
    setUploading(files.length);

    for (const file of Array.from(files)) {
      try {
        const { uploadUrl, storagePath } = await getUploadUrl.mutateAsync({
          tripId,
          fileName: file.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contentType: file.type as any,
        });

        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        await confirmUpload.mutateAsync({
          tripId,
          storagePath,
          fileSize: file.size,
          mimeType: file.type,
        });

        setUploading((n) => n - 1);
      } catch (err) {
        console.error('upload failed', err);
        setUploading((n) => n - 1);
      }
    }

    onPhotosChanged();
  };

  const canGenerate = photos.length >= 5 && status !== 'processing';

  return (
    <div className="px-6 pt-6">
      {status === 'processing' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-amber-900">Generating your trip lore...</p>
          <p className="text-xs text-amber-700 mt-1">
            This usually takes 2-5 minutes. We&apos;ll notify you when ready.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="font-medium">Photos ({photos.length})</h2>
        {uploading > 0 && <span className="text-xs text-gray-500">Uploading {uploading}...</span>}
      </div>

      <div className="grid grid-cols-3 gap-1 mb-6">
        {photos.map((photo) => (
          <div key={photo.id} className="aspect-square bg-gray-100 rounded-md overflow-hidden">
            {photo.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.thumbnailUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </div>
        ))}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="aspect-square border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center text-3xl text-gray-400"
        >
          +
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {photos.length < 5 && (
        <p className="text-xs text-gray-500 mb-4">
          Add at least {5 - photos.length} more photos to generate lore
        </p>
      )}

      <button
        onClick={() => generateLore.mutate({ tripId })}
        disabled={!canGenerate || generateLore.isPending}
        className="w-full py-4 bg-black text-white rounded-xl disabled:opacity-30 font-medium"
      >
        {generateLore.isPending || status === 'processing'
          ? 'Generating...'
          : 'Generate trip lore'}
      </button>
    </div>
  );
}

function LoreView({
  lore,
  eras,
  stats,
  members,
  tripId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lore: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eras: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  members: any[];
  tripId: string;
}) {
  const router = useRouter();

  return (
    <div className="px-6 py-8 space-y-10">
      <section>
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">Trip title</p>
        <h2 className="text-3xl font-medium leading-tight mb-3">{lore.trip_title}</h2>
        <p className="text-base text-gray-600 italic">{lore.tagline}</p>
      </section>

      <section>
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">The story</p>
        <p className="text-base leading-relaxed">{lore.storyline?.full_narrative}</p>
      </section>

      <section>
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">Cooked level</p>
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-medium">{lore.cooked_level || lore.chaos_score}</span>
          <span className="text-gray-400">/ 100</span>
        </div>
        <p className="text-sm font-medium text-red-500 mt-2">{lore.cooked_verdict}</p>
        <p className="text-sm text-gray-600 mt-1">{lore.cooked_explanation || lore.chaos_verdict}</p>
      </section>

      {lore.season_recap && (
        <section>
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-4">Season Recap</p>
          <div className="space-y-6">
            <div className="border-l-2 border-black pl-4">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Act 1: The Setup</p>
              <p className="text-sm text-gray-700">{lore.season_recap.act_1}</p>
            </div>
            <div className="border-l-2 border-black pl-4">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Act 2: The Downfall</p>
              <p className="text-sm text-gray-700">{lore.season_recap.act_2}</p>
            </div>
            <div className="border-l-2 border-black pl-4">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Act 3: The Bonding</p>
              <p className="text-sm text-gray-700">{lore.season_recap.act_3}</p>
            </div>
          </div>
        </section>
      )}

      {eras.length > 0 && (
        <section>
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-4">Trip eras</p>
          <div className="space-y-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {eras.map((era: any) => (
              <div key={era.id} className="border-l-2 border-gray-200 pl-4">
                <h3 className="font-medium">{era.era_name}</h3>
                <p className="text-xs text-gray-500 mb-1">{era.timeframe}</p>
                <p className="text-sm text-gray-700">{era.description}</p>
                {era.defining_moment && (
                  <p className="text-sm text-gray-500 italic mt-2">
                    &ldquo;{era.defining_moment}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-4">Character roles</p>
        <div className="space-y-4">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {members.map((m: any) => (
            <div key={m.user_id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm text-gray-500">{m.display_name}</p>
                  <h3 className="font-medium mt-0.5">{m.role_title || 'Role pending...'}</h3>
                </div>
                {m.role_chaos_rating !== null && (
                  <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded-full">
                    Chaos {m.role_chaos_rating}/10
                  </span>
                )}
              </div>
              {m.role_description && (
                <p className="text-sm text-gray-700 mt-2">{m.role_description}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {stats.length > 0 && (
        <section>
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-4">Trip stats</p>
          <div className="grid grid-cols-2 gap-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {stats.map((s: any) => (
              <div key={s.id} className="border border-gray-200 rounded-xl p-3">
                <p className="text-xl font-medium">{s.value}</p>
                <p className="text-xs text-gray-500">{s.unit}</p>
                <p className="text-xs text-gray-700 mt-1">{s.label}</p>
                {s.note && <p className="text-xs text-gray-400 italic mt-1">{s.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="text-center py-8 border-t border-gray-100">
        <p className="text-base text-gray-700 italic leading-relaxed">
          &ldquo;{lore.closing_line}&rdquo;
        </p>
      </section>

      <div className="fixed bottom-6 left-6 right-6 flex gap-3">
        <button
          onClick={() => router.push(`/trips/${tripId}/share`)}
          className="flex-1 py-4 bg-black text-white rounded-xl font-medium"
        >
          Share your cards
        </button>
        <button
          onClick={() => router.push(`/trips/${tripId}/upgrade`)}
          className="py-4 px-5 border border-gray-300 rounded-xl font-medium"
        >
          ₹299
        </button>
      </div>
    </div>
  );
}
