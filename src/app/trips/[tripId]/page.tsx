'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { FilmGrain } from '@/components/ui/atoms';
import {
  ArchiveNavbar, ArchiveHero, ArchiveReveal,
  CookedScoreLight, BadFeelingsChart, DonutChart, LightCastWidget,
  ArchiveFooter, LoreWrapped
} from '@/components/cinematic/ArchiveRoom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function TripRoomPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const [showWrapped, setShowWrapped] = useState(true);

  const { data: tripData, isLoading, refetch } = trpc.trips.getFull.useQuery({ tripId });

  useEffect(() => {
    const hasSeen = localStorage.getItem(`wrapped_${tripId}`);
    if (hasSeen) setShowWrapped(false);
  }, [tripId]);

  // Poll while generating
  const loreStatus = (tripData as any)?.trip?.lore_status;
  useEffect(() => {
    if (loreStatus === 'processing') {
      const t = setInterval(() => refetch(), 5000);
      return () => clearInterval(t);
    }
    if (loreStatus === 'ready' && !localStorage.getItem(`wrapped_${tripId}`)) {
      setShowWrapped(true);
    }
  }, [loreStatus, refetch, tripId]);

  const handleFinishWrapped = () => {
    setShowWrapped(false);
    localStorage.setItem(`wrapped_${tripId}`, 'true');
  };

  if (isLoading) return <LoadingState />;
  if (!tripData) return <NotFoundState />;

  const raw = tripData as any;
  // Normalize data shape
  const trip = {
    ...raw.trip,
    members: raw.members || [],
    stats: raw.stats || [],
    eras: raw.eras || [],
    cover_photo: raw.cover_photo || null,
  };

  const lore = trip.lore_json;
  const members = trip.members;

  // Find key cast members from lore or member roles
  const villain = members.find((m: any) =>
    m.role_title?.toLowerCase().includes('villain') ||
    m.role_title?.toLowerCase().includes('chaos') ||
    m.role_chaos_rating >= 8
  ) || members[1];

  const mvp = members.find((m: any) =>
    m.role_title?.toLowerCase().includes('mvp') ||
    m.role_title?.toLowerCase().includes('retriever') ||
    (m.role_chaos_rating !== undefined && m.role_chaos_rating <= 4)
  ) || members[0];

  const insideJoke = lore?.trip_lore_awards?.core_memory;

  const isReady = trip.lore_status === 'ready' && lore;
  const isProcessing = trip.lore_status === 'processing';

  return (
    <div className="min-h-screen bg-[#060604] text-[#F5F0E8] selection:bg-cooked-accent selection:text-white font-cinematic overflow-x-hidden">
      <AnimatePresence>
        {showWrapped && isReady && (
          <LoreWrapped trip={trip} onFinish={handleFinishWrapped} />
        )}
      </AnimatePresence>

      <FilmGrain />
      <ArchiveNavbar trip={trip} />

      {/* Full-width hero outside the grid */}
      <div className="max-w-[1600px] mx-auto px-6 pt-12">
        {isProcessing ? (
          <GeneratingState tripId={tripId} />
        ) : !isReady ? (
          <UploadState trip={trip} tripId={tripId} onPhotosChanged={() => refetch()} />
        ) : null}
      </div>

      {isReady && (
        <main className="max-w-[1600px] mx-auto px-6 pb-16">
          {/* Hero — full width */}
          <div className="py-10">
            <ArchiveHero trip={trip} />
          </div>

          {/* Letterboxd 2-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-8 items-start">

            {/* ── LEFT: dark cinematic column ─────────────────────────────── */}
            <div className="space-y-12">

              {/* Emotional Reveals */}
              <section className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-cinematic font-black italic tracking-tighter text-[#F5F0E8] uppercase">
                      Emotional Reveals
                    </h2>
                    <p className="text-[9px] text-white/20 uppercase tracking-[0.4em] font-vibe font-black">
                      Moments You Can&apos;t Unsee
                    </p>
                  </div>
                  <div className="h-px flex-1 bg-white/[0.04]" />
                </div>

                {mvp && (
                  <ArchiveReveal
                    category="Trip MVP"
                    name={`${mvp.display_name || 'Unknown'} – ${mvp.role_title || 'The Anchor'}`}
                    subtitle={mvp.role_archetype_tag}
                    desc={mvp.role_description}
                    cta="Canon File"
                    challengeCta="Make Poster"
                    color="#2D9E8B"
                  />
                )}

                {villain && (
                  <ArchiveReveal
                    category="Trip Villain"
                    name={`${villain.display_name || 'Unknown'} – ${villain.role_title || 'The Source'}`}
                    subtitle={villain.role_archetype_tag}
                    desc={villain.role_description}
                    cta="Blame"
                    challengeCta="Challenge to Duel"
                    color="#FF4D4D"
                  />
                )}

                {insideJoke && (
                  <ArchiveReveal
                    category="Top Inside Joke"
                    name={insideJoke}
                    subtitle="Core memory confirmed by AI"
                    desc={lore?.what_this_trip_was_really_about}
                    cta="Save Clip"
                    challengeCta="Save Snippet"
                    color="#D49E2D"
                  />
                )}
              </section>

              {/* Season Timeline */}
              {lore?.trip_eras?.length > 0 && (
                <section className="space-y-6">
                  <div className="flex items-center gap-6">
                    <h2 className="text-3xl font-cinematic font-black italic tracking-tighter text-[#F5F0E8] uppercase">
                      Season Timeline
                    </h2>
                    <div className="h-px flex-1 bg-white/[0.04]" />
                  </div>
                  <div className="space-y-3">
                    {lore.trip_eras.map((era: any, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex gap-5 p-6 rounded-[2rem] bg-[#0E0E0C] border border-white/[0.06] hover:border-white/10 transition-all"
                      >
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                          <span className="text-[9px] font-vibe font-black text-white/25">{i + 1}</span>
                        </div>
                        <div className="space-y-1 flex-1">
                          <p className="text-[9px] uppercase tracking-widest text-chill-accent font-vibe font-black">
                            {era.timeframe}
                          </p>
                          <h3 className="text-xl font-cinematic font-black tracking-tight text-[#F5F0E8]">
                            {era.era_name}
                          </h3>
                          <p className="text-sm text-white/40 font-data font-light leading-relaxed">
                            {era.description}
                          </p>
                          {era.defining_moment && (
                            <p className="text-[11px] text-white/20 italic font-cinematic mt-1.5">
                              &ldquo;{era.defining_moment}&rdquo;
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* ── RIGHT: light sticky Letterboxd panel ──────────────────────── */}
            <div className="lg:sticky lg:top-[73px] space-y-4">
              <CookedScoreLight trip={trip} />
              <BadFeelingsChart trip={trip} />
              <DonutChart trip={trip} />
              <LightCastWidget trip={trip} />
            </div>
          </div>

          <ArchiveFooter />
        </main>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD STATE
// ─────────────────────────────────────────────────────────────────────────────
function UploadState({ trip, tripId, onPhotosChanged }: { trip: any; tripId: string; onPhotosChanged: () => void }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(0);
  const { data: photos, refetch: refetchPhotos } = trpc.photos.list.useQuery({ tripId });
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
      } catch { setUploading(n => n - 1); }
    }
    onPhotosChanged(); refetchPhotos();
  };

  const photoCount = photos?.length || 0;
  const canGenerate = photoCount >= 5;

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-12 py-20">
      <div className="text-center space-y-4">
        <p className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-vibe font-black">Upload Evidence</p>
        <h2 className="text-6xl font-cinematic font-black tracking-tighter text-[#F5F0E8] uppercase leading-none">
          {trip.name}
        </h2>
        <p className="text-white/30 font-cinematic italic text-lg">The lore engine needs your photo dump.</p>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-6 gap-3 max-w-lg w-full px-6">
        {(photos || []).map((photo: any) => (
          <div key={photo.id} className="aspect-square rounded-2xl bg-white/5 overflow-hidden border border-white/10">
            {photo.thumbnailUrl && <img src={photo.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
          </div>
        ))}
        <label className="aspect-square rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-white/20 hover:bg-white/5 transition-all group">
          <Plus size={20} className="text-white/20 group-hover:text-white/40 transition-colors mb-1" />
          <span className="text-[8px] text-white/20 font-vibe font-black uppercase tracking-wider">Add</span>
          <input type="file" accept="image/*" multiple className="hidden"
            onChange={e => e.target.files && handleFiles(e.target.files)} />
        </label>
      </div>

      {uploading > 0 && (
        <p className="text-[10px] uppercase tracking-widest text-chill-accent font-vibe font-black animate-pulse-soft">
          Uploading {uploading} file{uploading !== 1 ? 's' : ''}...
        </p>
      )}

      {!canGenerate && photoCount > 0 && (
        <p className="text-[10px] text-white/25 font-data">
          {5 - photoCount} more photo{5 - photoCount !== 1 ? 's' : ''} needed
        </p>
      )}

      <button
        onClick={() => generateLore.mutate({ tripId })}
        disabled={!canGenerate || generateLore.isPending}
        className="px-14 py-6 bg-[#F5F0E8] text-black rounded-full text-[11px] font-vibe font-black uppercase tracking-[0.4em] disabled:opacity-20 hover:scale-105 active:scale-95 transition-all shadow-3xl"
      >
        {generateLore.isPending ? 'Starting...' : 'Start the Lore Engine'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATING STATE
// ─────────────────────────────────────────────────────────────────────────────
function GeneratingState({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [dots, setDots] = useState('');

  const PHASES = [
    { label: 'Reviewing the evidence', sub: 'Reading your photo dump...' },
    { label: 'Identifying the chaos source', sub: 'Someone is responsible for 37% of this.' },
    { label: 'Calculating delusion index', sub: 'How cooked were you, really?' },
    { label: 'Assigning character roles', sub: 'The Golden Retriever has been identified.' },
    { label: 'Writing the season recap', sub: 'The AI historian is taking notes.' },
    { label: 'Finalising the lore', sub: 'Almost ready to expose everything.' },
  ];

  useEffect(() => {
    if (phaseIdx >= PHASES.length - 1) return;
    const t = setTimeout(() => setPhaseIdx(i => i + 1), 5000);
    return () => clearTimeout(t);
  }, [phaseIdx]);

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-16 py-20">
      <div className="text-center space-y-8 max-w-md">
        <p className="text-[9px] uppercase tracking-[0.5em] text-white/20 font-vibe font-black">
          Season {new Date().getFullYear()} Archive
        </p>
        <h2 className="text-5xl font-cinematic font-black text-[#F5F0E8] uppercase leading-tight">
          Writing the lore
        </h2>
        <div className="space-y-2 min-h-[60px]">
          <p className="text-xl font-vibe font-medium text-white/80 transition-all duration-700">
            {PHASES[phaseIdx].label}{dots}
          </p>
          <p className="text-sm font-data font-light text-white/30 italic">{PHASES[phaseIdx].sub}</p>
        </div>
      </div>

      {/* Phase dots */}
      <div className="flex gap-2">
        {PHASES.map((_, i) => (
          <div key={i} className={`rounded-full transition-all duration-500 ${
            i < phaseIdx ? 'w-2 h-2 bg-chill-accent'
            : i === phaseIdx ? 'w-8 h-2 bg-cooked-accent animate-pulse-soft'
            : 'w-2 h-2 bg-white/10'
          }`} />
        ))}
      </div>

      <p className="text-[9px] uppercase tracking-widest text-white/15 font-vibe">Usually 2–5 minutes</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#060604] flex flex-col items-center justify-center gap-6">
      <div className="w-10 h-10 border-2 border-cooked-accent/20 border-t-cooked-accent rounded-full animate-spin" />
      <p className="text-[9px] uppercase tracking-[0.5em] text-white/20 font-vibe font-black animate-pulse-soft">
        Opening Archives...
      </p>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="min-h-screen bg-[#060604] flex flex-col items-center justify-center gap-6">
      <p className="text-white/20 font-cinematic italic text-xl">Archive not found.</p>
      <Link href="/trips" className="text-[10px] uppercase tracking-widest font-vibe font-black text-white/30 hover:text-white transition-colors">
        ← Return to Dossier
      </Link>
    </div>
  );
}
