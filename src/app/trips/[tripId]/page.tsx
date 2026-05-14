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
    <div className="px-6 py-8 space-y-12">
      <section className="text-center space-y-4">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-vibe">The Official Archive</p>
        <h2 className="text-5xl font-cinematic font-medium leading-tight text-cooked-bg">{lore.trip_title}</h2>
        <p className="text-lg text-chill-accent italic font-cinematic">&ldquo;{lore.tagline}&rdquo;</p>
      </section>

      <section className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100/50">
        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-vibe mb-4">The Season Recap</p>
        <p className="text-xl leading-relaxed font-data font-light text-gray-700">
          {lore.storyline?.full_narrative || lore.season_recap?.full_narrative}
        </p>
      </section>

      <section className="py-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-vibe mb-6">Collective Energy</p>
        <div className="flex items-center gap-6">
          <div className="text-9xl font-vibe font-bold tracking-tighter text-cooked-accent leading-none">
            {lore.cooked_level || lore.chaos_score}
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-vibe font-medium uppercase tracking-tight text-cooked-accent">
              {lore.cooked_verdict}
            </span>
            <span className="text-sm text-gray-400 font-data">How cooked? / 100</span>
          </div>
        </div>
        <p className="text-lg text-gray-600 font-data font-light mt-6 leading-relaxed border-l-2 border-gray-100 pl-6">
          {lore.cooked_explanation || lore.chaos_verdict}
        </p>
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
        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-vibe mb-8 text-center">Character Roles</p>
        <div className="space-y-4">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {members.map((m: any) => (
            <div key={m.user_id} className="group p-6 rounded-[2rem] bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-xl transition-all duration-500">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-vibe text-sm">
                      {m.display_name[0]}
                   </div>
                   <p className="text-sm font-data font-medium text-gray-500">{m.display_name}</p>
                </div>
                {m.role_chaos_rating !== null && (
                  <span className="text-[10px] px-3 py-1 bg-cooked-accent/10 text-cooked-accent rounded-full font-vibe font-bold uppercase tracking-wider">
                    Chaos {m.role_chaos_rating}/10
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-cinematic font-medium text-cooked-bg">{m.role_title || 'Role pending...'}</h3>
              {m.role_description && (
                <p className="text-base text-gray-500 font-data font-light mt-3 leading-snug">{m.role_description}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {stats.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-vibe mb-8 text-center">Data Receipts</p>
          <div className="grid grid-cols-2 gap-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {stats.map((s: any) => (
              <div key={s.id} className="bg-gray-50/30 p-6 rounded-[2rem] border border-gray-100/50 hover:bg-white transition-colors">
                <p className="text-3xl font-vibe font-bold tracking-tighter text-cooked-bg leading-none">{s.value}</p>
                <p className="text-[10px] text-chill-accent font-vibe uppercase tracking-widest mt-1">{s.unit}</p>
                <p className="text-xs text-gray-400 font-data font-medium mt-3 uppercase tracking-wider">{s.label}</p>
                {s.note && <p className="text-[10px] text-gray-400 italic font-data mt-2 opacity-60">&ldquo;{s.note}&rdquo;</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="text-center py-20 bg-cooked-bg text-white rounded-[3rem] px-10 space-y-6">
         <div className="w-12 h-0.5 bg-chill-accent mx-auto" />
         <p className="text-2xl md:text-3xl font-cinematic italic leading-relaxed text-white/90">
           &ldquo;{lore.closing_line}&rdquo;
         </p>
         <div className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-vibe">The Final Verdict</div>
      </section>

      <section className="group relative overflow-hidden bg-white border border-gray-100 rounded-[2.5rem] p-10 hover:shadow-2xl transition-all duration-500">
         <div className="absolute top-0 right-0 w-32 h-32 bg-cooked-accent/5 rounded-full -mr-16 -mt-16 blur-3xl" />
         <div className="relative z-10 space-y-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-vibe">Arena</p>
            <h3 className="text-3xl font-cinematic font-medium text-cooked-bg">Think your trip was worse?</h3>
            <p className="text-sm text-gray-500 font-data font-light leading-relaxed max-w-sm">
               Challenge another friend group to a **Chaos Clash**. The AI judge will decide who actually had the most cooked season.
            </p>
            <button 
               className="px-8 py-4 bg-cooked-bg text-white rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] hover:scale-105 transition-transform shadow-xl shadow-cooked-bg/20"
               onClick={() => alert('Battle System Coming Soon - Invite your rival group link to start.')}
            >
               Challenge a Group
            </button>
         </div>
      </section>

      <div className="fixed bottom-6 left-6 right-6 flex gap-3 z-50">
        <button
          onClick={() => router.push(`/trips/${tripId}/share`)}
          className="flex-[2] py-5 bg-cooked-bg text-white rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] shadow-2xl shadow-cooked-bg/20 hover:scale-[1.02] transition-transform"
        >
          Export Identity
        </button>
        <button
          onClick={() => router.push(`/trips/${tripId}/upgrade`)}
          className="flex-1 py-5 bg-white border border-gray-100 text-cooked-bg rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] shadow-xl hover:bg-gray-50 transition-all"
        >
          Seal Lore
        </button>
      </div>
    </div>
  );
}
