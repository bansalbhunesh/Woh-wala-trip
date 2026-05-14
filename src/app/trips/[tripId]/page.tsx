'use client';
import { use, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import type { LoreJson } from '@/lib/types';

export default function TripRoomPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();

  const { data: tripData, refetch } = trpc.trips.getFull.useQuery({ tripId });
  const { data: photos, refetch: refetchPhotos } = trpc.photos.list.useQuery({ tripId });

  const trip = (tripData as any)?.trip;
  const members = (tripData as any)?.members || [];
  const eras = (tripData as any)?.eras || [];
  const stats = (tripData as any)?.stats || [];

  // Redirect to generating screen if currently processing
  useEffect(() => {
    if (trip?.lore_status === 'processing') {
      router.push(`/trips/${tripId}/generating`);
    }
  }, [trip?.lore_status, router, tripId]);

  if (!trip) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm font-vibe uppercase tracking-widest text-gray-300">Loading the archive...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      <header className="px-6 pt-10 pb-6 border-b border-gray-50">
        <button onClick={() => router.push('/trips')} className="text-[10px] uppercase tracking-[0.2em] text-gray-300 font-vibe mb-4 hover:text-cooked-bg transition-colors">
          ← All archives
        </button>
        <h1 className="text-3xl font-cinematic font-medium text-cooked-bg">{trip.name}</h1>
        <p className="text-xs text-gray-400 font-data font-light mt-1">
          {trip.destination} · {trip.member_count} people · {trip.total_photos} photos
        </p>
      </header>

      {trip.lore_status === 'ready' && trip.lore_json ? (
        <LoreView lore={trip.lore_json as LoreJson} eras={eras} stats={stats} members={members} tripId={tripId} />
      ) : (
        <UploadView
          tripId={tripId}
          photos={photos || []}
          status={trip.lore_status}
          onPhotosChanged={() => { refetch(); refetchPhotos(); }}
        />
      )}
    </div>
  );
}

// ─── Upload Phase ─────────────────────────────────────────────────────────────

function UploadView({ tripId, photos, status, onPhotosChanged }: {
  tripId: string; photos: any[]; status: string; onPhotosChanged: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const router = useRouter();

  const getUploadUrl = trpc.photos.getUploadUrl.useMutation();
  const confirmUpload = trpc.photos.confirmUpload.useMutation();
  const generateLore = trpc.trips.generateLore.useMutation({
    onSuccess: () => router.push(`/trips/${tripId}/generating`),
  });

  const handleFiles = async (files: FileList) => {
    setUploading(files.length);
    for (const file of Array.from(files)) {
      try {
        const { uploadUrl, storagePath } = await getUploadUrl.mutateAsync({
          tripId, fileName: file.name, contentType: file.type as any,
        });
        await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        await confirmUpload.mutateAsync({ tripId, storagePath, fileSize: file.size, mimeType: file.type });
        setUploading(n => n - 1);
      } catch (err) {
        console.error('upload failed', err);
        setUploading(n => n - 1);
      }
    }
    onPhotosChanged();
  };

  const canGenerate = photos.length >= 5;

  return (
    <div className="px-6 pt-8 space-y-8">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-300 font-vibe">Evidence</p>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-cinematic font-medium text-cooked-bg">Upload the photo dump</h2>
          {uploading > 0 && (
            <span className="text-[10px] font-vibe uppercase tracking-wider text-chill-accent animate-pulse-soft">
              Uploading {uploading}...
            </span>
          )}
        </div>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {photos.map((photo) => (
          <div key={photo.id} className="aspect-square bg-gray-50 rounded-2xl overflow-hidden">
            {photo.thumbnailUrl && (
              <img src={photo.thumbnailUrl} alt="" className="w-full h-full object-cover" />
            )}
          </div>
        ))}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="aspect-square border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-cooked-accent/30 hover:bg-gray-50 transition-all group"
        >
          <span className="text-2xl text-gray-200 group-hover:text-cooked-accent/40 transition-colors">+</span>
          <span className="text-[9px] uppercase tracking-wider text-gray-200 font-vibe group-hover:text-gray-300 transition-colors">Add</span>
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)} />

      {!canGenerate && (
        <p className="text-xs text-gray-300 font-data text-center">
          {5 - photos.length} more photo{5 - photos.length !== 1 ? 's' : ''} needed to start the lore engine
        </p>
      )}

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-gray-50">
        <button
          onClick={() => generateLore.mutate({ tripId })}
          disabled={!canGenerate || generateLore.isPending}
          className="w-full py-5 bg-cooked-bg text-white rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] disabled:opacity-20 shadow-2xl shadow-cooked-bg/20 hover:scale-[1.01] transition-transform"
        >
          {generateLore.isPending ? 'Starting...' : 'Start the lore engine'}
        </button>
        {!canGenerate && (
          <p className="text-center text-[10px] uppercase tracking-wider text-gray-200 font-vibe mt-3">
            Need {5 - photos.length} more
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Lore View ────────────────────────────────────────────────────────────────

function LoreView({ lore, eras, stats, members, tripId }: {
  lore: LoreJson; eras: any[]; stats: any[]; members: any[]; tripId: string;
}) {
  const router = useRouter();
  const cookedLevel = lore.cooked_level ?? 60;

  return (
    <div className="px-6 py-10 space-y-14">
      {/* Title */}
      <section className="text-center space-y-4">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-300 font-vibe">The Official Archive</p>
        <h2 className="text-5xl font-cinematic font-medium leading-tight text-cooked-bg">{lore.trip_title}</h2>
        <p className="text-lg text-chill-accent italic font-cinematic">&ldquo;{lore.tagline}&rdquo;</p>
      </section>

      {/* Season Recap */}
      {lore.season_recap?.full_narrative && (
        <section className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100/50">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-300 font-vibe mb-4">Season Recap</p>
          <p className="text-xl leading-relaxed font-data font-light text-gray-700">
            {lore.season_recap.full_narrative}
          </p>
        </section>
      )}

      {/* Cooked level */}
      <section className="py-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-300 font-vibe mb-6">Collective Energy</p>
        <div className="flex items-baseline gap-6">
          <div className="text-[22vw] font-vibe font-bold tracking-tighter text-cooked-accent leading-none">
            {cookedLevel}
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-vibe font-bold uppercase tracking-tight text-cooked-accent">
              {lore.cooked_verdict}
            </span>
            <span className="text-sm text-gray-400 font-data">How cooked? / 100</span>
          </div>
        </div>
        {lore.cooked_explanation && (
          <p className="text-lg text-gray-500 font-data font-light mt-6 leading-relaxed border-l-2 border-gray-100 pl-6">
            {lore.cooked_explanation}
          </p>
        )}
      </section>

      {/* Eras */}
      {eras.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-300 font-vibe mb-8">Trip Eras</p>
          <div className="space-y-6">
            {eras.map((era: any) => (
              <div key={era.id} className="border-l-2 border-cooked-accent/20 pl-6 space-y-2">
                <h3 className="text-xl font-cinematic font-medium text-cooked-bg">{era.era_name}</h3>
                <p className="text-[10px] uppercase tracking-widest text-chill-accent font-vibe">{era.timeframe}</p>
                <p className="text-sm text-gray-500 font-data font-light leading-relaxed">{era.description}</p>
                {era.defining_moment && (
                  <p className="text-sm font-cinematic italic text-gray-400">
                    &ldquo;{era.defining_moment}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Characters */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-300 font-vibe mb-8 text-center">Character Roles</p>
        <div className="space-y-4">
          {members.map((m: any) => (
            <div key={m.user_id} className="group p-6 rounded-[2rem] bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-xl transition-all duration-500">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cooked-accent/10 flex items-center justify-center font-vibe font-bold text-sm text-cooked-accent">
                    {(m.display_name || '?')[0]}
                  </div>
                  <p className="text-sm font-data font-medium text-gray-500">{m.display_name}</p>
                </div>
                {m.role_chaos_rating !== null && m.role_chaos_rating !== undefined && (
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

      {/* Stats */}
      {stats.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-300 font-vibe mb-8 text-center">Data Receipts</p>
          <div className="grid grid-cols-2 gap-4">
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

      {/* Closing */}
      <section className="text-center py-20 bg-cooked-bg text-white rounded-[3rem] px-10 space-y-6">
        <div className="w-12 h-0.5 bg-chill-accent mx-auto" />
        <p className="text-2xl md:text-3xl font-cinematic italic leading-relaxed text-white/90">
          &ldquo;{lore.closing_line}&rdquo;
        </p>
        <div className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-vibe">The Final Verdict</div>
      </section>

      {/* Story mode prompt */}
      <section className="border border-gray-100 rounded-[2.5rem] p-8 text-center space-y-4 hover:shadow-lg transition-all">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-300 font-vibe">Cinematic Mode</p>
        <h3 className="text-2xl font-cinematic font-medium text-cooked-bg">Watch the lore</h3>
        <p className="text-sm text-gray-400 font-data font-light">Full-screen slide-by-slide story mode.</p>
        <button
          onClick={() => router.push(`/trips/${tripId}/story`)}
          className="mt-2 px-8 py-4 bg-cooked-bg text-white rounded-full font-vibe font-bold uppercase tracking-widest text-[10px] hover:scale-105 transition-transform"
        >
          Play story
        </button>
      </section>

      {/* Fixed bottom CTAs */}
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
