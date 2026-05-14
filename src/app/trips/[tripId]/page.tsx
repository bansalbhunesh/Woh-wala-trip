'use client';
import { use, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function TripRoomPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();
  
  const { data: tripData, refetch } = trpc.trips.getFull.useQuery({ tripId });
  const { data: photos, refetch: refetchPhotos } = trpc.photos.list.useQuery({ tripId });
  
  const trip = (tripData as any)?.trip;
  const members = (tripData as any)?.members || [];
  const eras = (tripData as any)?.eras || [];
  const stats = (tripData as any)?.stats || [];
  
  if (!trip) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
        <p className="mt-4 text-sm text-gray-400 font-inter">Entering the room...</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#FAF8F4] pb-24">
      <header className="px-6 pt-12 pb-8 bg-white border-b border-gray-100 rounded-b-[2.5rem] shadow-sm sticky top-0 z-10">
        <button onClick={() => router.push('/trips')} className="text-gray-400 hover:text-black transition-colors mb-4 flex items-center gap-1">
          <span className="text-xl">←</span> <span className="text-sm font-medium">All trips</span>
        </button>
        <h1 className="text-3xl font-outfit font-medium tracking-tight leading-tight">{trip.name}</h1>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 font-medium uppercase tracking-wider">
          <span>{trip.destination}</span>
          <span className="w-1 h-1 rounded-full bg-gray-200" />
          <span>{trip.member_count} members</span>
          <span className="w-1 h-1 rounded-full bg-gray-200" />
          <span>{trip.total_photos} photos</span>
        </div>
      </header>
      
      {trip.lore_status === 'ready' && trip.lore_json ? (
        <LoreView lore={trip.lore_json} eras={eras} stats={stats} members={members} tripId={tripId} />
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


// --- Upload phase ---

function UploadView({ tripId, photos, status, onPhotosChanged }: {
  tripId: string;
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
    <div className="px-6 pt-8 animate-in fade-in duration-700">
      {status === 'processing' && (
        <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 mb-8 text-center animate-pulse">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
            ✍️
          </div>
          <p className="text-amber-900 font-outfit font-medium text-lg">Narrating your trip...</p>
          <p className="text-amber-700 text-sm mt-1 font-inter">This usually takes 2-5 minutes. Grab a chai.</p>
        </div>
      )}
      
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="font-outfit text-xl font-medium">Group Gallery</h2>
          <p className="text-sm text-gray-400 font-inter">{photos.length} photos uploaded so far</p>
        </div>
        {uploading > 0 && (
          <span className="text-xs font-bold text-amber-500 uppercase tracking-widest animate-pulse">Uploading {uploading}...</span>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-2 mb-8">
        {photos.map((photo) => (
          <div key={photo.id} className="aspect-square bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-in zoom-in-95">
            {photo.thumbnailUrl ? (
              <img
                src={photo.thumbnailUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-50 animate-pulse" />
            )}
          </div>
        ))}
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="aspect-square border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-black hover:text-black transition-all active:scale-95"
        >
          <span className="text-3xl font-light">+</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">Add</span>
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
      
      {photos.length < 5 ? (
        <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-center">
          <p className="text-sm text-gray-400 leading-relaxed font-inter">
            Add at least <span className="font-bold text-black">{5 - photos.length} more</span> photos to unlock the narration.
          </p>
        </div>
      ) : (
        <button
          onClick={() => generateLore.mutate({ tripId })}
          disabled={!canGenerate || generateLore.isPending}
          className="btn-primary w-full shadow-premium py-5 text-lg"
        >
          {generateLore.isPending || status === 'processing' ? 'Processing...' : 'Generate trip lore'}
        </button>
      )}
    </div>
  );
}


// --- Lore display phase ---

function LoreView({ lore, eras, stats, members, tripId }: {
  lore: any;
  eras: any[];
  stats: any[];
  members: any[];
  tripId: string;
}) {
  return (
    <div className="px-6 py-10 space-y-16 animate-in fade-in duration-1000">
      
      {/* Title & Tagline */}
      <section className="text-center py-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-300 mb-6">The Official History</p>
        <h2 className="text-5xl font-outfit font-bold leading-[1.1] mb-6 tracking-tight text-balance">{lore.trip_title}</h2>
        <div className="relative inline-block">
          <span className="absolute -left-4 -top-2 text-4xl text-gray-100 font-serif">"</span>
          <p className="text-xl text-gray-500 italic font-inter max-w-xs mx-auto leading-relaxed">{lore.tagline}</p>
          <span className="absolute -right-4 -bottom-4 text-4xl text-gray-100 font-serif">"</span>
        </div>
      </section>
      
      {/* Story Narrative */}
      <section className="bg-white rounded-[3rem] p-10 shadow-premium border border-gray-50">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500 mb-6">The Narrative</p>
        <p className="text-lg leading-relaxed font-inter text-gray-700 first-letter:text-5xl first-letter:font-outfit first-letter:mr-2 first-letter:float-left first-letter:mt-1">
          {lore.storyline?.full_narrative}
        </p>
      </section>
      
      {/* Chaos Score */}
      <section className="text-center">
        <div className="inline-flex flex-col items-center">
          <div className="relative">
            <svg className="w-48 h-48 -rotate-90">
              <circle
                cx="96" cy="96" r="88"
                className="stroke-gray-100 fill-none"
                strokeWidth="8"
              />
              <circle
                cx="96" cy="96" r="88"
                className="stroke-black fill-none transition-all duration-1000"
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={(2 * Math.PI * 88) * (1 - lore.chaos_score / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-outfit font-bold tracking-tighter">{lore.chaos_score}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Chaos Index</span>
            </div>
          </div>
          <p className="mt-8 text-lg font-outfit font-medium text-gray-800 italic max-w-xs leading-tight">
            {lore.chaos_verdict}
          </p>
        </div>
      </section>
      
      {/* Eras */}
      {eras.length > 0 && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-10">Chronological Eras</p>
          <div className="space-y-12">
            {eras.map((era: any, idx: number) => (
              <div key={era.id} className="relative pl-10 border-l border-gray-100">
                <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-black" />
                <span className="text-[10px] font-mono text-gray-300 mb-2 block">{era.timeframe}</span>
                <h3 className="text-2xl font-outfit font-medium mb-3">{era.era_name}</h3>
                <p className="text-gray-500 leading-relaxed text-sm mb-4">{era.description}</p>
                {era.defining_moment && (
                  <div className="bg-[#FAF8F4] p-4 rounded-2xl border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Defining Moment</p>
                    <p className="text-sm italic text-gray-700">"{era.defining_moment}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      
      {/* Character Roles */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-8">Character Dossiers</p>
        <div className="grid gap-6">
          {members.map((m: any) => (
            <div key={m.user_id} className="bg-white rounded-[2rem] p-8 shadow-premium border border-gray-50 group hover:translate-y-[-4px] transition-all">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">{m.display_name}</p>
                  <h3 className="text-2xl font-outfit font-bold leading-tight group-hover:text-amber-600 transition-colors">
                    {m.role_title || 'Analyzing personality...'}
                  </h3>
                </div>
                {m.role_chaos_rating !== null && (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Chaos</span>
                    <span className="text-2xl font-mono font-bold">{m.role_chaos_rating}</span>
                  </div>
                )}
              </div>
              {m.role_description && (
                <p className="text-gray-600 leading-relaxed font-inter mb-6">
                  {m.role_description}
                </p>
              )}
              {m.role_signature_move && (
                <div className="pt-6 border-t border-gray-50">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 mb-1">Signature Move</p>
                  <p className="text-sm font-medium">{m.role_signature_move}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      
      {/* Stats */}
      {stats.length > 0 && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-8">Trip Statistics</p>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s: any) => (
              <div key={s.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50">
                <p className="text-3xl font-outfit font-bold tracking-tighter mb-1">{s.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-4">{s.unit}</p>
                <p className="text-xs font-medium text-gray-800 leading-tight">{s.label}</p>
                {s.note && (
                  <p className="text-[9px] text-gray-300 italic mt-3 font-inter leading-tight">{s.note}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      
      {/* Closing line */}
      <section className="text-center py-20 border-t border-gray-100">
        <p className="text-2xl text-gray-800 font-outfit font-medium leading-relaxed italic max-w-sm mx-auto">
          "{lore.closing_line}"
        </p>
        <div className="w-12 h-0.5 bg-black mx-auto mt-12 opacity-10" />
      </section>
      
      {/* Footer Actions */}
      <div className="fixed bottom-6 left-6 right-6 flex gap-3 z-20">
        <button
          onClick={() => router.push(`/trips/${tripId}/card`)}
          className="btn-primary flex-1 shadow-2xl py-5 text-lg"
        >
          Get Share Card
        </button>
        <button
          onClick={() => router.push(`/trips/${tripId}/upgrade`)}
          className="btn-secondary px-8 shadow-2xl"
        >
          ₹299
        </button>
      </div>
    </div>
  );
}
